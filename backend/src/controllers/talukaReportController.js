const pool = require("../config/db");
const {
    ensureReportOwnershipColumns,
    getOwnershipFromBody,
    fetchReportsForRole,
} = require("../utils/ensureReportOwnership");

// =====================================================
// GET ALL TALUKA REPORTS
// =====================================================

const getTalukaReports = async (req, res) => {
    try {
        const rows = await fetchReportsForRole(
            pool,
            "taluka_reports",
            req.query
        );

        return res.status(200).json({ success: true, reports: rows });

    } catch (error) {
        console.error("GET TALUKA REPORTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load Taluka reports",
        });
    }
};


// =====================================================
// GET SINGLE TALUKA REPORT
// =====================================================

const getTalukaReportById = async (req, res) => {

    try {

        const { id } = req.params;

        const [rows] = await pool.query(
            `
            SELECT *
            FROM taluka_reports
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );


        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    "Taluka report not found",
            });

        }


        return res.status(200).json({
            success: true,
            report: rows[0],
        });

    } catch (error) {

        console.error(
            "GET TALUKA REPORT BY ID ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to get Taluka report",
        });

    }

};


// =====================================================
// CREATE TALUKA REPORT
// =====================================================

const createTalukaReport = async (req, res) => {

    try {

        console.log(
            "TALUKA BODY:",
            req.body
        );

        console.log(
            "TALUKA FILES:",
            req.files
        );


        const {

            name,

            designation,

            taluka,

            district,

            mobile_number,

            report_date,

            // =================================================
            // CENTER HEAD DETAILS
            // =================================================

            total_authorised_center_heads,

            total_active_center_heads,

            // =================================================
            // VISITED CENTER HEADS
            // =================================================

            visited_center_heads_names,

            // =================================================
            // SANITARY PAD DETAILS
            // =================================================

            sanitary_pads_boxes_sold,

            sanitary_pads_sales_amount,

            // =================================================
            // OTHER
            // =================================================

            utr_number,

            additional_remarks,

        } = req.body;


        // =====================================================
        // VALIDATION
        // =====================================================

        if (!name) {

            return res.status(400).json({
                success: false,
                message:
                    "Name is required",
            });

        }


        if (!designation) {

            return res.status(400).json({
                success: false,
                message:
                    "Designation is required",
            });

        }


        if (!taluka) {

            return res.status(400).json({
                success: false,
                message:
                    "Taluka is required",
            });

        }


        if (!district) {

            return res.status(400).json({
                success: false,
                message:
                    "District is required",
            });

        }


        const finalMobile = mobile_number || req.body.mobileNumber || req.body.mobile || "";
        if (!finalMobile) {

            return res.status(400).json({
                success: false,
                message:
                    "Mobile number is required",
            });

        }

        const finalReportDate = report_date || req.body.reportDate || "";
        if (!finalReportDate) {

            return res.status(400).json({
                success: false,
                message:
                    "Report date is required",
            });

        }


        // =====================================================
        // FILES
        // =====================================================

        const meetingPhoto1 =
            req.files?.meeting_photo_1?.[0]
                ?.filename || null;


        const meetingPhoto2 =
            req.files?.meeting_photo_2?.[0]
                ?.filename || null;


        // =====================================================
        // INSERT
        // =====================================================

        // Capture the logged-in user identity from form data (sent by frontend)
        await ensureReportOwnershipColumns(pool);
        const ownership = getOwnershipFromBody(req.body);
        const submittedUserId = ownership.userId;
        const submittedRole = ownership.role;
        const submittedCreatedBy = ownership.createdBy;

        const sql = `

            INSERT INTO taluka_reports

            (
                user_id,

                created_by,

                created_by_role,

                name,

                designation,

                taluka,

                district,

                mobile_number,

                report_date,

                total_authorised_center_heads,

                total_active_center_heads,

                visited_center_heads_names,

                sanitary_pads_boxes_sold,

                sanitary_pads_sales_amount,

                utr_number,

                additional_remarks,

                meeting_photo_1,

                meeting_photo_2,

                status

            )

            VALUES

            (

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?

            )

        `;


        const values = [

            // =================================================
            // USER IDENTITY (for role-based filtering)
            // =================================================

            submittedUserId,

            submittedCreatedBy,

            submittedRole,

            // =================================================
            // BASIC
            // =================================================

            name?.trim() || "",

            designation?.trim() || "",

            taluka?.trim() || "",

            district?.trim() || "",

            finalMobile?.trim() || "",

            finalReportDate,


            // =================================================
            // AUTHORISED CENTER HEAD
            // =================================================

            Number(
                total_authorised_center_heads
            ) || 0,


            // =================================================
            // ACTIVE CENTER HEAD
            // =================================================

            Number(
                total_active_center_heads
            ) || 0,


            // =================================================
            // VISITED CENTER HEADS
            // =================================================

            visited_center_heads_names
                ?.trim() || "",


            // =================================================
            // SANITARY PADS BOXES
            // =================================================

            Number(
                sanitary_pads_boxes_sold
            ) || 0,


            // =================================================
            // SALES AMOUNT
            // =================================================

            Number(
                sanitary_pads_sales_amount
            ) || 0,


            // =================================================
            // UTR
            // =================================================

            utr_number?.trim() || "",


            // =================================================
            // REMARKS
            // =================================================

            additional_remarks?.trim() || "",


            // =================================================
            // PHOTOS
            // =================================================

            meetingPhoto1,

            meetingPhoto2,


            // =================================================
            // STATUS
            // =================================================

            "active",

        ];


        const [result] =
            await pool.query(
                sql,
                values
            );


        return res.status(201).json({

            success: true,

            message:
                "Taluka report added successfully.",

            id:
                result.insertId,

        });

    } catch (error) {

        console.error(
            "CREATE TALUKA REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to create Taluka report",

        });

    }

};


// =====================================================
// UPDATE TALUKA REPORT
// =====================================================

const updateTalukaReport = async (
    req,
    res
) => {

    try {

        const { id } =
            req.params;


        console.log(
            "UPDATE TALUKA BODY:",
            req.body
        );


        console.log(
            "UPDATE TALUKA FILES:",
            req.files
        );


        const {

            name,

            designation,

            taluka,

            district,

            mobile_number,

            report_date,

            // =================================================
            // CENTER HEAD DETAILS
            // =================================================

            total_authorised_center_heads,

            total_active_center_heads,

            // =================================================
            // VISITED CENTER HEADS
            // =================================================

            visited_center_heads_names,

            // =================================================
            // SANITARY PAD DETAILS
            // =================================================

            sanitary_pads_boxes_sold,

            sanitary_pads_sales_amount,

            // =================================================
            // OTHER
            // =================================================

            utr_number,

            additional_remarks,

        } = req.body;


        // =====================================================
        // GET EXISTING REPORT
        // =====================================================

        const [existingRows] =
            await pool.query(
                `
                SELECT *
                FROM taluka_reports
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );


        if (
            existingRows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Taluka report not found",

            });

        }


        const existing =
            existingRows[0];


        // =====================================================
        // KEEP OLD PHOTO
        // =====================================================

        let meetingPhoto1 =
            existing.meeting_photo_1 ||
            null;


        let meetingPhoto2 =
            existing.meeting_photo_2 ||
            null;


        // =====================================================
        // NEW PHOTO 1
        // =====================================================

        if (
            req.files?.meeting_photo_1?.[0]
        ) {

            meetingPhoto1 =
                req.files
                    .meeting_photo_1[0]
                    .filename;

        }


        // =====================================================
        // NEW PHOTO 2
        // =====================================================

        if (
            req.files?.meeting_photo_2?.[0]
        ) {

            meetingPhoto2 =
                req.files
                    .meeting_photo_2[0]
                    .filename;

        }


        // =====================================================
        // UPDATE SQL
        // =====================================================

        await ensureReportOwnershipColumns(pool);
        const ownership = getOwnershipFromBody(req.body);

        const sql = `

            UPDATE taluka_reports

            SET

                user_id = COALESCE(user_id, ?),

                created_by = COALESCE(created_by, ?),

                created_by_role = COALESCE(created_by_role, ?),

                updated_by = ?,

                updated_by_id = ?,

                name = ?,

                designation = ?,

                taluka = ?,

                district = ?,

                mobile_number = ?,

                report_date = ?,

                total_authorised_center_heads = ?,

                total_active_center_heads = ?,

                visited_center_heads_names = ?,

                sanitary_pads_boxes_sold = ?,

                sanitary_pads_sales_amount = ?,

                utr_number = ?,

                additional_remarks = ?,

                meeting_photo_1 = ?,

                meeting_photo_2 = ?,

                status = ?

            WHERE id = ?

        `;


        const values = [

            ownership.userId,
            ownership.createdBy,
            ownership.role,
            ownership.updatedBy,
            ownership.updatedById,

            // =================================================
            // BASIC
            // =================================================

            name ??
                existing.name ??
                "",


            designation ??
                existing.designation ??
                "",


            taluka ??
                existing.taluka ??
                "",


            district ??
                existing.district ??
                "",


            mobile_number ??
                existing.mobile_number ??
                "",


            report_date ??
                existing.report_date,


            // =================================================
            // AUTHORISED CENTER HEAD
            // =================================================

            total_authorised_center_heads !==
            undefined

                ? Number(
                    total_authorised_center_heads
                ) || 0

                : (
                    existing
                        .total_authorised_center_heads
                    || 0
                ),


            // =================================================
            // ACTIVE CENTER HEAD
            // =================================================

            total_active_center_heads !==
            undefined

                ? Number(
                    total_active_center_heads
                ) || 0

                : (
                    existing
                        .total_active_center_heads
                    || 0
                ),


            // =================================================
            // VISITED CENTER HEADS
            // =================================================

            visited_center_heads_names ??
                existing.visited_center_heads_names ??
                "",


            // =================================================
            // SANITARY PAD BOXES
            // =================================================

            sanitary_pads_boxes_sold !==
            undefined

                ? Number(
                    sanitary_pads_boxes_sold
                ) || 0

                : (
                    existing
                        .sanitary_pads_boxes_sold
                    || 0
                ),


            // =================================================
            // SALES AMOUNT
            // =================================================

            sanitary_pads_sales_amount !==
            undefined

                ? Number(
                    sanitary_pads_sales_amount
                ) || 0

                : (
                    existing
                        .sanitary_pads_sales_amount
                    || 0
                ),


            // =================================================
            // UTR
            // =================================================

            utr_number ??
                existing.utr_number ??
                "",


            // =================================================
            // REMARKS
            // =================================================

            additional_remarks ??
                existing.additional_remarks ??
                "",


            // =================================================
            // PHOTOS
            // =================================================

            meetingPhoto1,

            meetingPhoto2,


            // =================================================
            // STATUS
            // =================================================

            existing.status ||
                "active",


            // =================================================
            // ID
            // =================================================

            id,

        ];


        await pool.query(
            sql,
            values
        );


        return res.status(200).json({

            success: true,

            message:
                "Taluka report updated successfully.",

        });

    } catch (error) {

        console.error(
            "UPDATE TALUKA REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to update Taluka report",

        });

    }

};


// =====================================================
// DELETE TALUKA REPORT
// =====================================================

const deleteTalukaReport = async (
    req,
    res
) => {

    try {

        const { id } =
            req.params;


        const [result] =
            await pool.query(
                `
                DELETE FROM taluka_reports
                WHERE id = ?
                `,
                [id]
            );


        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Taluka report not found",

            });

        }


        return res.status(200).json({

            success: true,

            message:
                "Taluka report deleted successfully.",

        });

    } catch (error) {

        console.error(
            "DELETE TALUKA REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to delete Taluka report",

        });

    }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getTalukaReports,

    getTalukaReportById,

    createTalukaReport,

    updateTalukaReport,

    deleteTalukaReport,

};