/**
 * Ensures report tables have ownership columns used for role-based filtering.
 * Safe / idempotent — skips columns that already exist.
 */

const REPORT_TABLES = [
    "taluka_reports",
    "vibhag_reports",
    "trainer_reports",
    "district_reports",
];

const OWNERSHIP_COLUMNS = [
    { name: "user_id", ddl: "VARCHAR(150) NULL" },
    { name: "created_by", ddl: "VARCHAR(255) NULL" },
    { name: "created_by_role", ddl: "VARCHAR(50) NULL" },
    { name: "updated_by", ddl: "VARCHAR(255) NULL" },
    { name: "updated_by_id", ddl: "VARCHAR(150) NULL" },
];

let ensured = false;

const columnExists = async (db, table, column) => {
    const [rows] = await db.query(
        `
        SELECT COUNT(*) AS cnt
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        `,
        [table, column]
    );
    return Number(rows?.[0]?.cnt || 0) > 0;
};

const tableExists = async (db, table) => {
    const [rows] = await db.query(
        `
        SELECT COUNT(*) AS cnt
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        `,
        [table]
    );
    return Number(rows?.[0]?.cnt || 0) > 0;
};

/**
 * Backfill user_id on legacy rows from master tables.
 * Priority:
 *  1) mobile → master contact
 *  2) report.name / created_by → master head/name
 *  3) created_by → master.user_id
 */
const backfillOwnershipFromMasters = async (db) => {
    const jobs = [
        {
            report: "district_reports",
            master: "districts",
            role: "district",
            personCol: "name",
        },
        {
            report: "taluka_reports",
            master: "talukas",
            role: "taluka",
            personCol: "name",
        },
        {
            report: "vibhag_reports",
            master: "vibhags",
            role: "vibhag",
            // vibhag master stores person in `head`
            personCol: "head",
        },
        {
            report: "trainer_reports",
            master: "trainers",
            role: "trainer",
            personCol: "name",
        },
    ];

    for (const job of jobs) {
        try {
            if (!(await tableExists(db, job.report))) continue;
            if (!(await tableExists(db, job.master))) continue;

            // 1) Match by mobile number
            await db.query(
                `
                UPDATE \`${job.report}\` r
                INNER JOIN \`${job.master}\` m
                    ON TRIM(COALESCE(m.contact_number, '')) <> ''
                   AND TRIM(m.contact_number) = TRIM(r.mobile_number)
                   AND TRIM(COALESCE(m.user_id, '')) <> ''
                SET
                    r.user_id = m.user_id,
                    r.created_by = COALESCE(
                        NULLIF(TRIM(r.created_by), ''),
                        NULLIF(TRIM(m.\`${job.personCol}\`), ''),
                        m.user_id
                    ),
                    r.created_by_role = COALESCE(NULLIF(TRIM(r.created_by_role), ''), ?)
                WHERE (r.user_id IS NULL OR TRIM(r.user_id) = '')
                `,
                [job.role]
            );

            // 2) Match report form name → master person (head/name)
            //    Fixes rows wrongly tagged created_by / user_id as another login.
            await db.query(
                `
                UPDATE \`${job.report}\` r
                INNER JOIN \`${job.master}\` m
                    ON TRIM(COALESCE(m.\`${job.personCol}\`, '')) <> ''
                   AND LOWER(TRIM(m.\`${job.personCol}\`)) = LOWER(TRIM(r.name))
                   AND TRIM(COALESCE(m.user_id, '')) <> ''
                SET
                    r.user_id = m.user_id,
                    r.created_by = COALESCE(
                        NULLIF(TRIM(m.\`${job.personCol}\`), ''),
                        m.user_id
                    ),
                    r.created_by_role = COALESCE(NULLIF(TRIM(r.created_by_role), ''), ?)
                WHERE (
                    r.user_id IS NULL
                    OR TRIM(r.user_id) = ''
                    OR LOWER(TRIM(r.user_id)) <> LOWER(TRIM(m.user_id))
                )
                `,
                [job.role]
            );

            // 3) Match created_by → master person
            await db.query(
                `
                UPDATE \`${job.report}\` r
                INNER JOIN \`${job.master}\` m
                    ON TRIM(COALESCE(m.\`${job.personCol}\`, '')) <> ''
                   AND LOWER(TRIM(m.\`${job.personCol}\`)) = LOWER(TRIM(r.created_by))
                   AND TRIM(COALESCE(m.user_id, '')) <> ''
                SET
                    r.user_id = m.user_id,
                    r.created_by_role = COALESCE(NULLIF(TRIM(r.created_by_role), ''), ?)
                WHERE (r.user_id IS NULL OR TRIM(r.user_id) = '')
                `,
                [job.role]
            );

            // 4) Match created_by → master.user_id (e.g. created_by='riya', user_id='riya')
            await db.query(
                `
                UPDATE \`${job.report}\` r
                INNER JOIN \`${job.master}\` m
                    ON TRIM(COALESCE(m.user_id, '')) <> ''
                   AND LOWER(TRIM(m.user_id)) = LOWER(TRIM(r.created_by))
                SET
                    r.user_id = m.user_id,
                    r.created_by = COALESCE(
                        NULLIF(TRIM(r.created_by), ''),
                        NULLIF(TRIM(m.\`${job.personCol}\`), ''),
                        m.user_id
                    ),
                    r.created_by_role = COALESCE(NULLIF(TRIM(r.created_by_role), ''), ?)
                WHERE (r.user_id IS NULL OR TRIM(r.user_id) = '')
                `,
                [job.role]
            );
        } catch (err) {
            console.error(
                `[ownership] backfill failed for ${job.report}:`,
                err.message || err
            );
        }
    }
};

const ensureReportOwnershipColumns = async (db) => {
    // Allow re-running backfill each process start so corrected rules apply
    if (!db || typeof db.query !== "function") return;

    if (!ensured) {
        for (const table of REPORT_TABLES) {
            try {
                if (!(await tableExists(db, table))) {
                    console.warn(`[ownership] skip missing table: ${table}`);
                    continue;
                }

                for (const col of OWNERSHIP_COLUMNS) {
                    if (await columnExists(db, table, col.name)) continue;
                    await db.query(
                        `ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.ddl}`
                    );
                    console.log(`[ownership] added ${table}.${col.name}`);
                }
            } catch (err) {
                console.error(
                    `[ownership] failed for ${table}:`,
                    err.message || err
                );
            }
        }
        ensured = true;
    }

    await backfillOwnershipFromMasters(db);
};

/**
 * Read creator / updater identity from request body (FormData or JSON).
 */
const getOwnershipFromBody = (body = {}) => {
    const userId =
        String(body.user_id || body.created_by_id || body.updated_by_id || "")
            .trim() || null;
    const role =
        String(body.role || body.created_by_role || "").trim() || null;
    const createdBy =
        String(body.created_by || body.user_name || "").trim() || null;
    const updatedBy =
        String(
            body.updated_by || body.created_by || body.user_name || ""
        ).trim() || null;
    const updatedById =
        String(body.updated_by_id || body.user_id || body.created_by_id || "")
            .trim() || null;

    return { userId, role, createdBy, updatedBy, updatedById };
};

/**
 * Role-based list filter for report tables.
 * admin/superadmin → all rows
 * others → ONLY rows owned by that login (user_id).
 * Legacy fallback (no user_id on row): created_by OR mobile — never form name.
 */
const fetchReportsForRole = async (db, table, query = {}) => {
    await ensureReportOwnershipColumns(db);

    const role = String(query.role || "").trim().toLowerCase();
    const userId = String(query.user_id || "").trim();
    const mobileNum = String(query.mobile_number || "").trim();
    const userName = String(query.user_name || query.name || "").trim();
    const isAdmin = role === "admin" || role === "superadmin";

    if (isAdmin) {
        const [rows] = await db.query(
            `SELECT * FROM \`${table}\` ORDER BY id DESC`
        );
        return rows;
    }

    if (userId) {
        // Prefer strict ownership by user_id.
        // Also allow legacy rows with empty user_id only when created_by
        // matches this login's user_id OR display name.
        const [rows] = await db.query(
            `
            SELECT * FROM \`${table}\`
            WHERE TRIM(COALESCE(user_id, '')) = ?
               OR (
                    TRIM(COALESCE(user_id, '')) = ''
                    AND (
                        (TRIM(COALESCE(created_by, '')) <> '' AND (
                            LOWER(TRIM(created_by)) = LOWER(?)
                            OR LOWER(TRIM(created_by)) = LOWER(?)
                        ))
                        OR (
                            TRIM(COALESCE(mobile_number, '')) <> ''
                            AND TRIM(?) <> ''
                            AND TRIM(mobile_number) = TRIM(?)
                        )
                    )
               )
            ORDER BY id DESC
            `,
            [
                userId,
                userId,
                userName || "__none__",
                mobileNum || "",
                mobileNum || "__none__",
            ]
        );
        return rows;
    }

    if (mobileNum || userName) {
        const [rows] = await db.query(
            `
            SELECT * FROM \`${table}\`
            WHERE (TRIM(COALESCE(created_by, '')) <> '' AND LOWER(TRIM(created_by)) = LOWER(?))
               OR (TRIM(COALESCE(mobile_number, '')) <> '' AND TRIM(mobile_number) = ?)
            ORDER BY id DESC
            `,
            [
                userName || "__none__",
                mobileNum || "__none__",
            ]
        );
        return rows;
    }

    return [];
};

module.exports = {
    ensureReportOwnershipColumns,
    getOwnershipFromBody,
    fetchReportsForRole,
};
