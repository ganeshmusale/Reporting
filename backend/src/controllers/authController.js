const db = require("../config/db");


// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {

    try {

        const {
            user_id,
            password
        } = req.body;


        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (
            !user_id ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "User ID and password are required"

            });

        }


        const cleanUserId =
            String(user_id).trim();

        const cleanPassword =
            String(password).trim();


        // =================================================
        // USERS TABLE
        // =================================================

        const [users] =
            await db.query(

                `
                SELECT
                    id,
                    user_id,
                    password,
                    name,
                    role,
                    status
                FROM users
                WHERE user_id = ?
                LIMIT 1
                `,

                [
                    cleanUserId
                ]

            );


        if (
            users.length > 0
        ) {

            const user =
                users[0];


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            if (
                String(
                    user.status || ""
                ).toLowerCase() !== "active"
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Account is inactive"

                });

            }


            // ---------------------------------------------
            // PASSWORD
            // ---------------------------------------------

            if (
                String(user.password) !==
                cleanPassword
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid User ID or Password"

                });

            }


            // ---------------------------------------------
            // SUCCESS — enrich profile from role master
            // so dashboards always get mobile / area IDs
            // ---------------------------------------------

            const role = String(user.role || "").trim().toLowerCase();
            const profile = {
                id: user.id,
                user_id: user.user_id,
                name: user.name,
                role: user.role,
                status: user.status,
            };

            try {
                if (role === "district") {
                    const [rows] = await db.query(
                        `
                        SELECT id, name, user_id, contact_number, district_name, status
                        FROM districts
                        WHERE user_id = ?
                        LIMIT 1
                        `,
                        [user.user_id]
                    );
                    if (rows.length > 0) {
                        const d = rows[0];
                        profile.name = d.name || profile.name;
                        profile.contact_number = d.contact_number || null;
                        profile.district_id = d.id;
                        profile.district_name =
                            d.district_name || d.name || null;
                        profile.status = d.status || profile.status;
                    }
                } else if (role === "taluka") {
                    const [rows] = await db.query(
                        `
                        SELECT
                            t.id,
                            t.name,
                            t.user_id,
                            t.contact_number,
                            t.district_id,
                            t.taluka_name,
                            t.status,
                            d.district_name
                        FROM talukas t
                        LEFT JOIN districts d ON d.id = t.district_id
                        WHERE t.user_id = ?
                        LIMIT 1
                        `,
                        [user.user_id]
                    );
                    if (rows.length > 0) {
                        const t = rows[0];
                        profile.name = t.name || profile.name;
                        profile.contact_number = t.contact_number || null;
                        profile.taluka_id = t.id;
                        profile.taluka_name =
                            t.taluka_name || t.name || null;
                        profile.district_id = t.district_id || null;
                        profile.district_name = t.district_name || null;
                        profile.status = t.status || profile.status;
                    }
                } else if (role === "vibhag") {
                    const [rows] = await db.query(
                        `
                        SELECT
                            v.id,
                            v.head,
                            v.name,
                            v.user_id,
                            v.contact_number,
                            v.district_id,
                            v.taluka_id,
                            v.vibhag,
                            v.status,
                            COALESCE(
                                NULLIF(TRIM(v.district_name), ''),
                                NULLIF(TRIM(d.district_name), ''),
                                ''
                            ) AS district_name,
                            COALESCE(
                                NULLIF(TRIM(v.taluka_name), ''),
                                NULLIF(TRIM(t.taluka_name), ''),
                                ''
                            ) AS taluka_name
                        FROM vibhags v
                        LEFT JOIN districts d ON d.id = v.district_id
                        LEFT JOIN talukas t ON t.id = v.taluka_id
                        WHERE v.user_id = ?
                        LIMIT 1
                        `,
                        [user.user_id]
                    );
                    if (rows.length > 0) {
                        const v = rows[0];
                        profile.name =
                            v.head || v.name || profile.name;
                        profile.contact_number = v.contact_number || null;
                        profile.vibhag_id = v.id;
                        profile.vibhag_name =
                            v.vibhag || v.head || v.name || null;
                        profile.taluka_id = v.taluka_id || null;
                        profile.taluka_name = v.taluka_name || null;
                        profile.district_id = v.district_id || null;
                        profile.district_name = v.district_name || null;
                        profile.status = v.status || profile.status;
                    }
                } else if (role === "trainer") {
                    const [rows] = await db.query(
                        `
                        SELECT
                            tr.id,
                            tr.name,
                            tr.user_id,
                            tr.contact_number,
                            tr.district_id,
                            tr.taluka_id,
                            tr.status,
                            COALESCE(NULLIF(TRIM(d.district_name), ''), '') AS district_name,
                            COALESCE(NULLIF(TRIM(t.taluka_name), ''), '') AS taluka_name
                        FROM trainers tr
                        LEFT JOIN districts d ON d.id = tr.district_id
                        LEFT JOIN talukas t ON t.id = tr.taluka_id
                        WHERE tr.user_id = ?
                        LIMIT 1
                        `,
                        [user.user_id]
                    );
                    if (rows.length > 0) {
                        const t = rows[0];
                        profile.name = t.name || profile.name;
                        profile.contact_number = t.contact_number || null;
                        profile.trainer_id = t.id;
                        profile.district_id = t.district_id || null;
                        profile.district_name = t.district_name || null;
                        profile.taluka_id = t.taluka_id || null;
                        profile.taluka_name = t.taluka_name || null;
                        profile.status = t.status || profile.status;
                    }
                }
            } catch (enrichErr) {
                console.error(
                    "LOGIN PROFILE ENRICH WARNING:",
                    enrichErr.message || enrichErr
                );
            }

            return res.status(200).json({
                success: true,
                message: "Login successful",
                user: profile,
            });

        }


        // =================================================
        // DISTRICT
        // =================================================

        const [districts] =
            await db.query(

                `
                SELECT
                    id,
                    name,
                    user_id,
                    password,
                    email,
                    contact_number,
                    district_name,
                    status
                FROM districts
                WHERE user_id = ?
                LIMIT 1
                `,

                [
                    cleanUserId
                ]

            );


        if (
            districts.length > 0
        ) {

            const district =
                districts[0];


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            if (
                String(
                    district.status || ""
                ).toLowerCase() !== "active"
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "District account is inactive"

                });

            }


            // ---------------------------------------------
            // PASSWORD
            // ---------------------------------------------

            if (
                String(
                    district.password
                ) !== cleanPassword
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid User ID or Password"

                });

            }


            // ---------------------------------------------
            // CHECK USERS TABLE
            // ---------------------------------------------

            const [existingDistrictUser] =
                await db.query(

                    `
                    SELECT id
                    FROM users
                    WHERE user_id = ?
                    LIMIT 1
                    `,

                    [
                        district.user_id
                    ]

                );


            // ---------------------------------------------
            // CREATE USER
            // ---------------------------------------------

            if (
                existingDistrictUser.length === 0
            ) {

                await db.query(

                    `
                    INSERT INTO users
                    (
                        user_id,
                        password,
                        name,
                        role,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,

                    [

                        district.user_id,

                        district.password,

                        district.name,

                        "district",

                        district.status

                    ]

                );

            }


            // ---------------------------------------------
            // SUCCESS
            // ---------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "District login successful",

                user: {

                    id:
                        district.id,

                    user_id:
                        district.user_id,

                    name:
                        district.name,

                    role:
                        "district",

                    status:
                        district.status,

                    district_id:
                        district.id,

                    district_name:
                        district.district_name ||
                        district.name,

                    email:
                        district.email,

                    contact_number:
                        district.contact_number

                }

            });

        }


        // =================================================
        // TALUKA
        // =================================================

        const [talukas] =
            await db.query(

                `
                SELECT
                    id,
                    name,
                    district_id,
                    contact_number,
                    user_id,
                    email,
                    password,
                    address,
                    status
                FROM talukas
                WHERE user_id = ?
                LIMIT 1
                `,

                [
                    cleanUserId
                ]

            );


        if (
            talukas.length > 0
        ) {

            const taluka =
                talukas[0];


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            if (
                String(
                    taluka.status || ""
                ).toLowerCase() !== "active"
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Taluka account is inactive"

                });

            }


            // ---------------------------------------------
            // PASSWORD
            // ---------------------------------------------

            if (
                String(
                    taluka.password
                ) !== cleanPassword
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid User ID or Password"

                });

            }


            // ---------------------------------------------
            // CHECK USERS TABLE
            // ---------------------------------------------

            const [existingTalukaUser] =
                await db.query(

                    `
                    SELECT id
                    FROM users
                    WHERE user_id = ?
                    LIMIT 1
                    `,

                    [
                        taluka.user_id
                    ]

                );


            // ---------------------------------------------
            // CREATE USER
            // ---------------------------------------------

            if (
                existingTalukaUser.length === 0
            ) {

                await db.query(

                    `
                    INSERT INTO users
                    (
                        user_id,
                        password,
                        name,
                        role,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,

                    [

                        taluka.user_id,

                        taluka.password,

                        taluka.name,

                        "taluka",

                        taluka.status

                    ]

                );

            }


            // ---------------------------------------------
            // SUCCESS
            // ---------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Taluka login successful",

                user: {

                    id:
                        taluka.id,

                    user_id:
                        taluka.user_id,

                    name:
                        taluka.name,

                    role:
                        "taluka",

                    status:
                        taluka.status,

                    district_id:
                        taluka.district_id,

                    taluka_id:
                        taluka.id,

                    taluka_name:
                        taluka.name,

                    email:
                        taluka.email,

                    contact_number:
                        taluka.contact_number

                }

            });

        }


        // =================================================
        // VIBHAG
        // =================================================

        const [vibhags] =
            await db.query(

                `
                SELECT
                    id,
                    head,
                    district_id,
                    taluka_id,
                    contact_number,
                    user_id,
                    email,
                    password,
                    vibhag,
                    address,
                    status
                FROM vibhags
                WHERE user_id = ?
                LIMIT 1
                `,

                [
                    cleanUserId
                ]

            );


        if (
            vibhags.length > 0
        ) {

            const vibhag =
                vibhags[0];


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            if (
                String(
                    vibhag.status || ""
                ).toLowerCase() !== "active"
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Vibhag account is inactive"

                });

            }


            // ---------------------------------------------
            // PASSWORD
            // ---------------------------------------------

            if (
                String(
                    vibhag.password
                ) !== cleanPassword
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid User ID or Password"

                });

            }


            // ---------------------------------------------
            // CHECK USERS TABLE
            // ---------------------------------------------

            const [existingVibhagUser] =
                await db.query(

                    `
                    SELECT id
                    FROM users
                    WHERE user_id = ?
                    LIMIT 1
                    `,

                    [
                        vibhag.user_id
                    ]

                );


            // ---------------------------------------------
            // CREATE USER
            // ---------------------------------------------

            if (
                existingVibhagUser.length === 0
            ) {

                await db.query(

                    `
                    INSERT INTO users
                    (
                        user_id,
                        password,
                        name,
                        role,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,

                    [

                        vibhag.user_id,

                        vibhag.password,

                        vibhag.head,

                        "vibhag",

                        vibhag.status

                    ]

                );

            }


            // ---------------------------------------------
            // SUCCESS
            // ---------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Vibhag login successful",

                user: {

                    id:
                        vibhag.id,

                    user_id:
                        vibhag.user_id,

                    name:
                        vibhag.head,

                    role:
                        "vibhag",

                    status:
                        vibhag.status,

                    district_id:
                        vibhag.district_id,

                    taluka_id:
                        vibhag.taluka_id,

                    vibhag_id:
                        vibhag.id,

                    vibhag_name:
                        vibhag.vibhag,

                    email:
                        vibhag.email,

                    contact_number:
                        vibhag.contact_number

                }

            });

        }


        // =================================================
        // TRAINER
        // =================================================

        const [trainers] =
            await db.query(

                `
                SELECT *
                FROM trainers
                WHERE user_id = ?
                LIMIT 1
                `,

                [
                    cleanUserId
                ]

            );


        if (
            trainers.length > 0
        ) {

            const trainer =
                trainers[0];


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            if (
                String(
                    trainer.status || ""
                ).toLowerCase() !== "active"
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Trainer account is inactive"

                });

            }


            // ---------------------------------------------
            // PASSWORD
            // ---------------------------------------------

            if (
                String(
                    trainer.password || ""
                ) !== cleanPassword
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid User ID or Password"

                });

            }


            // ---------------------------------------------
            // TRAINER NAME
            // ---------------------------------------------

            const trainerName =
                trainer.name ||
                trainer.head ||
                trainer.trainer_name ||
                "Trainer";


            // ---------------------------------------------
            // CHECK USERS TABLE
            // ---------------------------------------------

            const [existingTrainerUser] =
                await db.query(

                    `
                    SELECT id
                    FROM users
                    WHERE user_id = ?
                    LIMIT 1
                    `,

                    [
                        trainer.user_id
                    ]

                );


            // ---------------------------------------------
            // CREATE USER
            // ---------------------------------------------

            if (
                existingTrainerUser.length === 0
            ) {

                await db.query(

                    `
                    INSERT INTO users
                    (
                        user_id,
                        password,
                        name,
                        role,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,

                    [

                        trainer.user_id,

                        trainer.password,

                        trainerName,

                        "trainer",

                        trainer.status

                    ]

                );

            }


            // ---------------------------------------------
            // SUCCESS
            // ---------------------------------------------

            // Resolve district/taluka names for BDO dashboard prefill
            let trainerDistrictName = null;
            let trainerTalukaName = null;
            try {
                if (trainer.district_id) {
                    const [dRows] = await db.query(
                        `SELECT district_name FROM districts WHERE id = ? LIMIT 1`,
                        [trainer.district_id]
                    );
                    trainerDistrictName = dRows[0]?.district_name || null;
                }
                if (trainer.taluka_id) {
                    const [tRows] = await db.query(
                        `SELECT taluka_name FROM talukas WHERE id = ? LIMIT 1`,
                        [trainer.taluka_id]
                    );
                    trainerTalukaName = tRows[0]?.taluka_name || null;
                }
            } catch (nameErr) {
                console.error(
                    "TRAINER LOGIN NAME LOOKUP WARNING:",
                    nameErr.message || nameErr
                );
            }

            return res.status(200).json({

                success: true,

                message:
                    "Trainer login successful",

                user: {

                    id:
                        trainer.id,

                    user_id:
                        trainer.user_id,

                    name:
                        trainerName,

                    role:
                        "trainer",

                    status:
                        trainer.status,

                    trainer_id:
                        trainer.id,

                    district_id:
                        trainer.district_id ||
                        null,

                    district_name:
                        trainerDistrictName,

                    taluka_id:
                        trainer.taluka_id ||
                        null,

                    taluka_name:
                        trainerTalukaName,

                    email:
                        trainer.email ||
                        "",

                    contact_number:
                        trainer.contact_number ||
                        "",

                    address:
                        trainer.address ||
                        ""

                }

            });

        }


        // =================================================
        // INVALID LOGIN
        // =================================================

        return res.status(401).json({

            success: false,

            message:
                "Invalid User ID or Password"

        });


    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "LOGIN ERROR:",
            error
        );

        console.error(
            "================================="
        );


        return res.status(500).json({

            success: false,

            message:
                "Login failed",

            error:
                error.message

        });

    }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    login
};