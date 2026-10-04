const db = require("../config/db");
const { syncSystemUser, deleteSystemUser } = require("../utils/userUtils");

// =====================================================
// GET ALL VIBHAGS
// GET /api/vibhag
// =====================================================

const getVibhags = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                v.id,
                v.vibhag_code,
                v.head,
                v.contact_number,
                v.designation,
                v.district_id,
                COALESCE(
                    NULLIF(TRIM(v.district_name), ''),
                    NULLIF(TRIM(d.district_name), ''),
                    ''
                ) AS district_name,
                d.name AS district_head_name,
                v.taluka_id,
                COALESCE(
                    NULLIF(TRIM(v.taluka_name), ''),
                    NULLIF(TRIM(t.taluka_name), ''),
                    ''
                ) AS taluka_name,
                t.name AS taluka_head_name,
                v.vibhag,
                v.joining_date,
                v.status,
                v.account_number,
                v.ifsc_code,
                v.bank_name,
                v.user_id,
                v.email,
                v.password,
                v.address,
                v.created_at,
                v.updated_at
            FROM vibhags v
            LEFT JOIN districts d ON d.id = v.district_id
            LEFT JOIN talukas t ON t.id = v.taluka_id
            ORDER BY v.id DESC
        `);

        return res.status(200).json({
            success: true,
            data: rows,
            vibhags: rows,
            total: rows.length,
            count: rows.length,
        });

    } catch (error) {
        console.error("GET VIBHAGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch vibhags",
        });
    }
};


// =====================================================
// GET SINGLE VIBHAG
// GET /api/vibhag/:id
// =====================================================

const getVibhagById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`
            SELECT
                v.id,
                v.vibhag_code,
                v.head,
                v.contact_number,
                v.designation,
                v.district_id,
                COALESCE(
                    NULLIF(TRIM(v.district_name), ''),
                    NULLIF(TRIM(d.district_name), ''),
                    ''
                ) AS district_name,
                d.name AS district_head_name,
                v.taluka_id,
                COALESCE(
                    NULLIF(TRIM(v.taluka_name), ''),
                    NULLIF(TRIM(t.taluka_name), ''),
                    ''
                ) AS taluka_name,
                t.name AS taluka_head_name,
                v.vibhag,
                v.joining_date,
                v.status,
                v.account_number,
                v.ifsc_code,
                v.bank_name,
                v.user_id,
                v.email,
                v.password,
                v.address,
                v.created_at,
                v.updated_at
            FROM vibhags v
            LEFT JOIN districts d ON d.id = v.district_id
            LEFT JOIN talukas t ON t.id = v.taluka_id
            WHERE v.id = ?
            LIMIT 1
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vibhag not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: rows[0],
            vibhag: rows[0],
        });

    } catch (error) {
        console.error("GET VIBHAG BY ID ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch vibhag",
        });
    }
};


// =====================================================
// CREATE VIBHAG
// POST /api/vibhag
// =====================================================

const createVibhag = async (req, res) => {
    try {
        const {
            vibhag_code,
            head,
            name,
            contact_number,
            designation,
            district_id,
            district_name,
            taluka_id,
            taluka_name,
            vibhag,
            joining_date,
            status = "active",
            account_number,
            ifsc_code,
            bank_name,
            user_id,
            email,
            password,
            address,
        } = req.body;

        const finalHead = head || name;
        if (!finalHead || !String(finalHead).trim()) {
            return res.status(400).json({
                success: false,
                message: "Full Name is required",
            });
        }

        let finalDistrictId = district_id ? Number(district_id) : null;
        if (district_id && !Number.isInteger(finalDistrictId)) {
            const [dRows] = await db.query(
                "SELECT id FROM districts WHERE LOWER(name) = LOWER(?) OR LOWER(district_name) = LOWER(?) LIMIT 1",
                [String(district_id).trim(), String(district_id).trim()]
            );
            finalDistrictId = dRows[0]?.id || null;
        }
        if (!finalDistrictId && district_name) {
            const [dRows] = await db.query(
                "SELECT id FROM districts WHERE LOWER(name) = LOWER(?) OR LOWER(district_name) = LOWER(?) LIMIT 1",
                [String(district_name).trim(), String(district_name).trim()]
            );
            finalDistrictId = dRows[0]?.id || null;
        }
        // If district name was typed but not found in DB — store null (don't error)
        if (finalDistrictId) {
            const [dRows] = await db.query("SELECT id FROM districts WHERE id = ? LIMIT 1", [finalDistrictId]);
            if (dRows.length === 0) finalDistrictId = null;
        }

        let finalTalukaId = taluka_id ? Number(taluka_id) : null;
        if (taluka_id && !Number.isInteger(finalTalukaId)) {
            const [tRows] = await db.query(
                "SELECT id FROM talukas WHERE LOWER(name) = LOWER(?) OR LOWER(taluka_name) = LOWER(?) LIMIT 1",
                [String(taluka_id).trim(), String(taluka_id).trim()]
            );
            finalTalukaId = tRows[0]?.id || null;
        }
        if (!finalTalukaId && taluka_name) {
            const [tRows] = await db.query(
                "SELECT id FROM talukas WHERE LOWER(name) = LOWER(?) OR LOWER(taluka_name) = LOWER(?) LIMIT 1",
                [String(taluka_name).trim(), String(taluka_name).trim()]
            );
            finalTalukaId = tRows[0]?.id || null;
        }
        // If taluka name was typed but not found in DB — store null (don't error)
        if (finalTalukaId) {
            const [tRows] = await db.query("SELECT id FROM talukas WHERE id = ? LIMIT 1", [finalTalukaId]);
            if (tRows.length === 0) finalTalukaId = null;
        }

        const cleanUserId = user_id && String(user_id).trim()
            ? String(user_id).trim()
            : String(finalHead).trim();

        const cleanPassword = password && String(password).trim()
            ? String(password).trim()
            : "123456";

        // Check duplicate user_id
        const [userExists] = await db.query(
            "SELECT id FROM vibhags WHERE user_id = ? LIMIT 1",
            [cleanUserId]
        );

        if (userExists.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Vibhag User ID already exists",
            });
        }

        // Auto generate vibhag_code if missing
        let finalVibhagCode = vibhag_code ? String(vibhag_code).trim() : "";
        if (!finalVibhagCode) {
            const [maxRows] = await db.query("SELECT MAX(id) as maxId FROM vibhags");
            const nextNum = (maxRows[0]?.maxId || 0) + 1;
            finalVibhagCode = `VH-${String(nextNum).padStart(4, "0")}`;
        }

        const normalizedStatus =
            String(status || "active").toLowerCase() === "inactive"
                ? "inactive"
                : "active";

        const finalVibhagName = vibhag ? String(vibhag).trim() : (finalHead ? String(finalHead).trim() : finalVibhagCode);

        const finalDistrictName = district_name ? String(district_name).trim() : null;
        const finalTalukaName = taluka_name ? String(taluka_name).trim() : null;

        const [result] = await db.query(`
            INSERT INTO vibhags
            (
                vibhag_code,
                head,
                district_id,
                district_name,
                taluka_id,
                taluka_name,
                contact_number,
                designation,
                joining_date,
                status,
                account_number,
                ifsc_code,
                bank_name,
                user_id,
                email,
                password,
                vibhag,
                address
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            finalVibhagCode,
            String(finalHead).trim(),
            finalDistrictId,
            finalDistrictName,
            finalTalukaId,
            finalTalukaName,
            contact_number ? String(contact_number).trim() : null,
            designation ? String(designation).trim() : null,
            joining_date || null,
            normalizedStatus,
            account_number ? String(account_number).trim() : null,
            ifsc_code ? String(ifsc_code).trim().toUpperCase() : null,
            bank_name ? String(bank_name).trim() : null,
            cleanUserId,
            email ? String(email).trim() : null,
            cleanPassword,
            finalVibhagName,
            address ? String(address).trim() : null,
        ]);

        // Sync with users table for authentication
        await syncSystemUser({
            user_id: cleanUserId,
            password: cleanPassword,
            name: String(finalHead).trim(),
            role: "vibhag",
            status: normalizedStatus,
        });

        const [rows] = await db.query(`
            SELECT
                v.id,
                v.vibhag_code,
                v.head,
                v.contact_number,
                v.designation,
                v.district_id,
                COALESCE(
                    NULLIF(TRIM(v.district_name), ''),
                    NULLIF(TRIM(d.district_name), ''),
                    ''
                ) AS district_name,
                d.name AS district_head_name,
                v.taluka_id,
                COALESCE(
                    NULLIF(TRIM(v.taluka_name), ''),
                    NULLIF(TRIM(t.taluka_name), ''),
                    ''
                ) AS taluka_name,
                t.name AS taluka_head_name,
                v.vibhag,
                v.joining_date,
                v.status,
                v.account_number,
                v.ifsc_code,
                v.bank_name,
                v.user_id,
                v.email,
                v.password,
                v.address,
                v.created_at,
                v.updated_at
            FROM vibhags v
            LEFT JOIN districts d ON d.id = v.district_id
            LEFT JOIN talukas t ON t.id = v.taluka_id
            WHERE v.id = ?
            LIMIT 1
        `, [result.insertId]);

        return res.status(201).json({
            success: true,
            message: "Vibhag created successfully",
            data: rows[0],
            vibhag: rows[0],
            vibhag_code: finalVibhagCode,
        });

    } catch (error) {
        console.error("CREATE VIBHAG ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create vibhag",
        });
    }
};


// =====================================================
// UPDATE VIBHAG
// PUT /api/vibhag/:id
// =====================================================

const updateVibhag = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            vibhag_code,
            head,
            name,
            contact_number,
            designation,
            district_id,
            district_name,
            taluka_id,
            taluka_name,
            vibhag,
            joining_date,
            status,
            account_number,
            ifsc_code,
            bank_name,
            user_id,
            email,
            password,
            address,
        } = req.body;

        const [existing] = await db.query(
            "SELECT * FROM vibhags WHERE id = ? LIMIT 1",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vibhag not found",
            });
        }

        const oldRecord = existing[0];
        const finalHead = (head || name) !== undefined ? String(head || name).trim() : oldRecord.head;
        const finalUserId = user_id !== undefined ? String(user_id).trim() : oldRecord.user_id;

        let finalDistrictId = district_id !== undefined ? Number(district_id) : oldRecord.district_id;
        if (district_id && !Number.isInteger(finalDistrictId)) {
            const [dRows] = await db.query(
                "SELECT id FROM districts WHERE LOWER(name) = LOWER(?) OR LOWER(district_name) = LOWER(?) LIMIT 1",
                [String(district_id).trim(), String(district_id).trim()]
            );
            finalDistrictId = dRows[0]?.id || null;
        }
        if (district_name && (district_id === undefined || !finalDistrictId)) {
            const [dRows] = await db.query(
                "SELECT id FROM districts WHERE LOWER(name) = LOWER(?) OR LOWER(district_name) = LOWER(?) LIMIT 1",
                [String(district_name).trim(), String(district_name).trim()]
            );
            finalDistrictId = dRows[0]?.id || null;
        }
        // If district not found by name/id — keep null (don't error)
        if (finalDistrictId) {
            const [dRows] = await db.query("SELECT id FROM districts WHERE id = ? LIMIT 1", [finalDistrictId]);
            if (dRows.length === 0) finalDistrictId = null;
        }

        let finalTalukaId = taluka_id !== undefined ? Number(taluka_id) : oldRecord.taluka_id;
        if (taluka_id && !Number.isInteger(finalTalukaId)) {
            const [tRows] = await db.query(
                "SELECT id FROM talukas WHERE LOWER(name) = LOWER(?) OR LOWER(taluka_name) = LOWER(?) LIMIT 1",
                [String(taluka_id).trim(), String(taluka_id).trim()]
            );
            finalTalukaId = tRows[0]?.id || null;
        }
        if (taluka_name && (taluka_id === undefined || !finalTalukaId)) {
            const [tRows] = await db.query(
                "SELECT id FROM talukas WHERE LOWER(name) = LOWER(?) OR LOWER(taluka_name) = LOWER(?) LIMIT 1",
                [String(taluka_name).trim(), String(taluka_name).trim()]
            );
            finalTalukaId = tRows[0]?.id || null;
        }
        // If taluka not found by name/id — keep null (don't error)
        if (finalTalukaId) {
            const [tRows] = await db.query("SELECT id FROM talukas WHERE id = ? LIMIT 1", [finalTalukaId]);
            if (tRows.length === 0) finalTalukaId = null;
        }

        const normalizedStatus = status !== undefined
            ? (String(status).toLowerCase() === "inactive" ? "inactive" : "active")
            : oldRecord.status;

        // Check duplicate user_id if changed
        if (finalUserId && finalUserId !== oldRecord.user_id) {
            const [duplicateUser] = await db.query(
                "SELECT id FROM vibhags WHERE user_id = ? AND id != ?",
                [finalUserId, id]
            );
            if (duplicateUser.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "User ID already exists in Vibhags",
                });
            }
        }

        const finalPassword = password && String(password).trim()
            ? String(password).trim()
            : oldRecord.password;

        const finalVibhagName = vibhag !== undefined ? String(vibhag).trim() : oldRecord.vibhag;

        const finalDistrictName =
            district_name !== undefined
                ? (district_name ? String(district_name).trim() : null)
                : (oldRecord.district_name || null);
        const finalTalukaName =
            taluka_name !== undefined
                ? (taluka_name ? String(taluka_name).trim() : null)
                : (oldRecord.taluka_name || null);

        await db.query(`
            UPDATE vibhags
            SET
                vibhag_code = COALESCE(?, vibhag_code),
                head = ?,
                district_id = ?,
                district_name = ?,
                taluka_id = ?,
                taluka_name = ?,
                contact_number = COALESCE(?, contact_number),
                designation = COALESCE(?, designation),
                joining_date = COALESCE(?, joining_date),
                status = ?,
                account_number = COALESCE(?, account_number),
                ifsc_code = COALESCE(?, ifsc_code),
                bank_name = COALESCE(?, bank_name),
                user_id = ?,
                email = COALESCE(?, email),
                password = ?,
                vibhag = COALESCE(?, vibhag),
                address = COALESCE(?, address)
            WHERE id = ?
        `, [
            vibhag_code ? String(vibhag_code).trim() : null,
            finalHead,
            finalDistrictId,
            finalDistrictName,
            finalTalukaId,
            finalTalukaName,
            contact_number ? String(contact_number).trim() : null,
            designation ? String(designation).trim() : null,
            joining_date || null,
            normalizedStatus,
            account_number ? String(account_number).trim() : null,
            ifsc_code ? String(ifsc_code).trim().toUpperCase() : null,
            bank_name ? String(bank_name).trim() : null,
            finalUserId,
            email ? String(email).trim() : null,
            finalPassword,
            finalVibhagName,
            address ? String(address).trim() : null,
            id,
        ]);

        // Sync with users table
        await syncSystemUser({
            user_id: finalUserId,
            password: finalPassword,
            name: finalHead,
            role: "vibhag",
            status: normalizedStatus,
            old_user_id: oldRecord.user_id,
        });

        const [rows] = await db.query(`
            SELECT
                v.id,
                v.vibhag_code,
                v.head,
                v.contact_number,
                v.designation,
                v.district_id,
                COALESCE(
                    NULLIF(TRIM(v.district_name), ''),
                    NULLIF(TRIM(d.district_name), ''),
                    ''
                ) AS district_name,
                d.name AS district_head_name,
                v.taluka_id,
                COALESCE(
                    NULLIF(TRIM(v.taluka_name), ''),
                    NULLIF(TRIM(t.taluka_name), ''),
                    ''
                ) AS taluka_name,
                t.name AS taluka_head_name,
                v.vibhag,
                v.joining_date,
                v.status,
                v.account_number,
                v.ifsc_code,
                v.bank_name,
                v.user_id,
                v.email,
                v.password,
                v.address,
                v.created_at,
                v.updated_at
            FROM vibhags v
            LEFT JOIN districts d ON d.id = v.district_id
            LEFT JOIN talukas t ON t.id = v.taluka_id
            WHERE v.id = ?
            LIMIT 1
        `, [id]);

        return res.status(200).json({
            success: true,
            message: "Vibhag updated successfully",
            data: rows[0],
            vibhag: rows[0],
        });

    } catch (error) {
        console.error("UPDATE VIBHAG ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update vibhag",
        });
    }
};


// =====================================================
// DELETE VIBHAG
// DELETE /api/vibhag/:id
// =====================================================

const deleteVibhag = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await db.query(
            "SELECT user_id FROM vibhags WHERE id = ? LIMIT 1",
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Vibhag not found",
            });
        }

        const [result] = await db.query("DELETE FROM vibhags WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Vibhag not found",
            });
        }

        if (existing[0].user_id) {
            await deleteSystemUser(existing[0].user_id);
        }

        return res.status(200).json({
            success: true,
            message: "Vibhag deleted successfully",
        });

    } catch (error) {
        console.error("DELETE VIBHAG ERROR:", error);

        if (
            error.code === "ER_ROW_IS_REFERENCED_2" ||
            error.code === "ER_ROW_IS_REFERENCED"
        ) {
            return res.status(409).json({
                success: false,
                message: "Vibhag cannot be deleted because it is being used",
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete vibhag",
        });
    }
};

module.exports = {
    getVibhags,
    getVibhagById,
    createVibhag,
    updateVibhag,
    deleteVibhag,
};