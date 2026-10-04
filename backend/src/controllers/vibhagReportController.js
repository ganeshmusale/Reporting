const db = require("../config/db");
const {
    ensureReportOwnershipColumns,
    getOwnershipFromBody,
    fetchReportsForRole,
} = require("../utils/ensureReportOwnership");


// =====================================================
// HELPER - GET FILE NAME
// multer.fields() returns OBJECT
// multer.array() returns ARRAY
// This helper supports BOTH
// =====================================================

const getFileName = (files, possibleNames) => {

    if (!files) {
        return null;
    }

    // =================================================
    // multer.fields()
    // req.files = {
    //   meeting_photo_1: [file],
    //   meeting_photo_2: [file]
    // }
    // =================================================

    if (
        !Array.isArray(files) &&
        typeof files === "object"
    ) {

        for (const fieldName of possibleNames) {

            if (
                files[fieldName] &&
                Array.isArray(files[fieldName]) &&
                files[fieldName].length > 0
            ) {

                return files[fieldName][0].filename;

            }

        }

    }


    // =================================================
    // multer.array()
    // =================================================

    if (Array.isArray(files)) {

        const file = files.find(
            (item) =>
                possibleNames.includes(
                    item.fieldname
                )
        );

        return file
            ? file.filename
            : null;

    }


    return null;

};


// =====================================================
// CREATE VIBHAG REPORT
// POST /api/vibhag-reports
// =====================================================

const createVibhagReport = async (
    req,
    res
) => {

    try {

        console.log(
            "================================="
        );

        console.log(
            "CREATE VIBHAG REPORT"
        );

        console.log(
            "BODY:",
            req.body
        );

        console.log(
            "FILES:",
            req.files
        );

        console.log(
            "================================="
        );


        const {

            name,
            designation,
            taluka,
            district,
            mobile_number,
            mobileNumber,
            report_date,
            reportDate,

            total_authorised_center_heads,
            totalAuthorisedCenterHeads,
            total_active_center_heads,
            totalActiveCenterHeads,

            today_visited_centers,
            todayVisitedCenters,
            visited_center_head_name,
            visited_center_heads_names,
            names_of_center_heads_visited_today,
            namesOfCenterHeadsVisitedToday,

            new_members_added_today,

            sanitary_pad_box_sales,
            sanitary_pads_boxes_sold,
            total_sanitary_pads_box_sold_today,
            totalSanitaryPadsBoxSoldToday,

            health_atm_machine_details,

            birth_baby_girls,
            death_count,
            accident_count,

            utr_number,
            utrNumber,

            any_other_information,
            additional_remarks,
            additionalRemarks,

        } = req.body;


        // =================================================
        // VALIDATION
        // =================================================

        if (
            !name ||
            !String(name).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name is required",

            });

        }

        const finalReportDate = report_date || reportDate;

        if (!finalReportDate) {

            return res.status(400).json({

                success: false,

                message:
                    "Report date is required",

            });

        }


        // =================================================
        // GET PHOTOS
        // =================================================

        const meetingPhoto1 =
            getFileName(
                req.files,
                [
                    "meeting_photo_1",
                    "meetingPhoto1",
                    "meeting1Photo",
                    "meeting_photo1",
                ]
            );


        const meetingPhoto2 =
            getFileName(
                req.files,
                [
                    "meeting_photo_2",
                    "meetingPhoto2",
                    "meeting2Photo",
                    "meeting_photo2",
                ]
            );


        console.log(
            "MEETING PHOTO 1:",
            meetingPhoto1
        );

        console.log(
            "MEETING PHOTO 2:",
            meetingPhoto2
        );

        const finalMobile = mobile_number || mobileNumber || null;
        const finalAuthorised = Number(total_authorised_center_heads ?? totalAuthorisedCenterHeads ?? req.body.total_center_heads ?? req.body.totalCenterHeads ?? 0) || 0;
        const finalActive = Number(total_active_center_heads ?? totalActiveCenterHeads ?? 0) || 0;
        const finalVisitedCenters = Number(today_visited_centers ?? todayVisitedCenters ?? 0) || 0;
        const finalVisitedName = visited_center_head_name || visited_center_heads_names || names_of_center_heads_visited_today || namesOfCenterHeadsVisitedToday || null;
        const finalPadSales = Number(sanitary_pad_box_sales ?? total_sanitary_pads_box_sold_today ?? sanitary_pads_boxes_sold ?? totalSanitaryPadsBoxSoldToday ?? 0) || 0;
        const finalUtr = utr_number || utrNumber || null;
        const finalRemarks = any_other_information || additional_remarks || additionalRemarks || null;


        // =================================================
        // INSERT
        // =================================================

        const submitted = getOwnershipFromBody(req.body);
        await ensureReportOwnershipColumns(db);
        const submittedUserId = submitted.userId;
        const submittedRole   = submitted.role;
        const submittedCreatedBy = submitted.createdBy;

        const [result] =
            await db.query(

                `
                INSERT INTO vibhag_reports
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

                    today_visited_centers,
                    visited_center_head_name,

                    new_members_added_today,

                    sanitary_pad_box_sales,

                    health_atm_machine_details,

                    birth_baby_girls,
                    death_count,
                    accident_count,

                    utr_number,

                    any_other_information,

                    meeting_photo_1,
                    meeting_photo_2,

                    status
                )

                VALUES
                (
                    ?, ?, ?,

                    ?, ?, ?, ?, ?, ?,

                    ?, ?,

                    ?, ?,

                    ?,

                    ?,

                    ?,

                    ?, ?, ?,

                    ?,

                    ?,

                    ?, ?,

                    ?
                )
                `,

                [
                    submittedUserId,
                    submittedCreatedBy,
                    submittedRole,

                    String(name).trim(),

                    designation
                        ? String(designation).trim()
                        : null,

                    taluka
                        ? String(taluka).trim()
                        : null,

                    district
                        ? String(district).trim()
                        : null,

                    finalMobile
                        ? String(finalMobile).trim()
                        : null,

                    finalReportDate,


                    finalAuthorised,

                    finalActive,


                    finalVisitedCenters,

                    finalVisitedName
                        ? String(
                            finalVisitedName
                          ).trim()
                        : null,


                    Number(
                        new_members_added_today
                    ) || 0,


                    finalPadSales,


                    health_atm_machine_details
                        ? String(
                            health_atm_machine_details
                          ).trim()
                        : null,


                    Number(
                        birth_baby_girls
                    ) || 0,

                    Number(
                        death_count
                    ) || 0,

                    Number(
                        accident_count
                    ) || 0,


                    finalUtr
                        ? String(finalUtr).trim()
                        : null,


                    finalRemarks
                        ? String(
                            finalRemarks
                          ).trim()
                        : null,


                    meetingPhoto1,

                    meetingPhoto2,


                    "active",

                ]

            );


        // =================================================
        // GET CREATED REPORT
        // =================================================

        const [rows] =
            await db.query(

                `
                SELECT *

                FROM vibhag_reports

                WHERE id = ?

                LIMIT 1
                `,

                [
                    result.insertId
                ]

            );


        return res.status(201).json({

            success: true,

            message:
                "Vibhag report created successfully",

            report:
                rows[0],

            data:
                rows[0],

        });


    } catch (error) {

        console.error(
            "CREATE VIBHAG REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to create Vibhag report",

        });

    }

};


// =====================================================
// GET ALL VIBHAG REPORTS
// GET /api/vibhag-reports
// =====================================================

const getVibhagReports = async (
    req,
    res
) => {

    try {
        const rows = await fetchReportsForRole(
            db,
            "vibhag_reports",
            req.query
        );

        return res.status(200).json({
            success: true,
            count: rows.length,
            total: rows.length,
            reports: rows,
            data: rows,
        });

    } catch (error) {
        console.error("GET VIBHAG REPORTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch Vibhag reports",
        });
    }

};


// =====================================================
// GET SINGLE VIBHAG REPORT
// GET /api/vibhag-reports/:id
// =====================================================

const getVibhagReportById = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        const [rows] =
            await db.query(

                `
                SELECT *

                FROM vibhag_reports

                WHERE id = ?

                LIMIT 1
                `,

                [
                    id
                ]

            );


        if (
            rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Vibhag report not found",

            });

        }


        return res.status(200).json({

            success: true,

            report:
                rows[0],

            data:
                rows[0],

        });


    } catch (error) {

        console.error(
            "GET VIBHAG REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to fetch Vibhag report",

        });

    }

};


// =====================================================
// UPDATE VIBHAG REPORT
// PUT /api/vibhag-reports/:id
// =====================================================

const updateVibhagReport = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        const {

            name,
            designation,
            taluka,
            district,
            mobile_number,
            mobileNumber,
            report_date,
            reportDate,

            total_authorised_center_heads,
            totalAuthorisedCenterHeads,
            total_active_center_heads,
            totalActiveCenterHeads,

            today_visited_centers,
            todayVisitedCenters,
            visited_center_head_name,
            visited_center_heads_names,
            names_of_center_heads_visited_today,
            namesOfCenterHeadsVisitedToday,

            new_members_added_today,

            sanitary_pad_box_sales,
            sanitary_pads_boxes_sold,
            total_sanitary_pads_box_sold_today,
            totalSanitaryPadsBoxSoldToday,

            health_atm_machine_details,

            birth_baby_girls,
            death_count,
            accident_count,

            utr_number,
            utrNumber,

            any_other_information,
            additional_remarks,
            additionalRemarks,

            status,

        } = req.body;


        // =================================================
        // CHECK EXISTING REPORT
        // =================================================

        const [existing] =
            await db.query(

                `
                SELECT *

                FROM vibhag_reports

                WHERE id = ?

                LIMIT 1
                `,

                [
                    id
                ]

            );


        if (
            existing.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Vibhag report not found",

            });

        }


        // =================================================
        // KEEP OLD PHOTOS
        // =================================================

        let meetingPhoto1 =
            existing[0].meeting_photo_1 ||
            null;


        let meetingPhoto2 =
            existing[0].meeting_photo_2 ||
            null;


        // =================================================
        // GET NEW PHOTOS
        // =================================================

        const newPhoto1 =
            getFileName(
                req.files,
                [
                    "meeting_photo_1",
                    "meetingPhoto1",
                    "meeting1Photo",
                    "meeting_photo1",
                ]
            );


        const newPhoto2 =
            getFileName(
                req.files,
                [
                    "meeting_photo_2",
                    "meetingPhoto2",
                    "meeting2Photo",
                    "meeting_photo2",
                ]
            );


        // =================================================
        // REPLACE ONLY IF NEW PHOTO SELECTED
        // =================================================

        if (newPhoto1) {

            meetingPhoto1 =
                newPhoto1;

        }


        if (newPhoto2) {

            meetingPhoto2 =
                newPhoto2;

        }


        console.log(
            "UPDATED PHOTO 1:",
            meetingPhoto1
        );

        console.log(
            "UPDATED PHOTO 2:",
            meetingPhoto2
        );

        const finalName = name !== undefined ? (name ? String(name).trim() : null) : existing[0].name;
        const finalDesignation = designation !== undefined ? (designation ? String(designation).trim() : null) : existing[0].designation;
        const finalTaluka = taluka !== undefined ? (taluka ? String(taluka).trim() : null) : existing[0].taluka;
        const finalDistrict = district !== undefined ? (district ? String(district).trim() : null) : existing[0].district;
        const finalMobile = (mobile_number || mobileNumber) !== undefined ? String(mobile_number || mobileNumber || "").trim() || null : existing[0].mobile_number;
        const finalReportDate = (report_date || reportDate) || existing[0].report_date;
        const finalAuthorised = Number(total_authorised_center_heads ?? totalAuthorisedCenterHeads ?? req.body.total_center_heads ?? req.body.totalCenterHeads ?? existing[0].total_authorised_center_heads ?? 0) || 0;
        const finalActive = Number(total_active_center_heads ?? totalActiveCenterHeads ?? existing[0].total_active_center_heads ?? 0) || 0;
        const finalVisitedCenters = Number(today_visited_centers ?? todayVisitedCenters ?? existing[0].today_visited_centers ?? 0) || 0;
        const finalVisitedName = visited_center_head_name || visited_center_heads_names || names_of_center_heads_visited_today || namesOfCenterHeadsVisitedToday || existing[0].visited_center_head_name || null;
        const finalPadSales = Number(sanitary_pad_box_sales ?? total_sanitary_pads_box_sold_today ?? sanitary_pads_boxes_sold ?? totalSanitaryPadsBoxSoldToday ?? existing[0].sanitary_pad_box_sales ?? 0) || 0;
        const finalUtr = utr_number || utrNumber || existing[0].utr_number || null;
        const finalRemarks = any_other_information || additional_remarks || additionalRemarks || existing[0].any_other_information || null;


        // =================================================
        // UPDATE DATABASE
        // =================================================

        await ensureReportOwnershipColumns(db);
        const ownership = getOwnershipFromBody(req.body);

        await db.query(

            `
            UPDATE vibhag_reports

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

                today_visited_centers = ?,
                visited_center_head_name = ?,

                new_members_added_today = ?,

                sanitary_pad_box_sales = ?,

                health_atm_machine_details = ?,

                birth_baby_girls = ?,
                death_count = ?,
                accident_count = ?,

                utr_number = ?,

                any_other_information = ?,

                meeting_photo_1 = ?,
                meeting_photo_2 = ?,

                status = ?

            WHERE id = ?
            `,

            [

                ownership.userId,
                ownership.createdBy,
                ownership.role,
                ownership.updatedBy,
                ownership.updatedById,

                finalName,

                finalDesignation,

                finalTaluka,

                finalDistrict,

                finalMobile,

                finalReportDate,


                finalAuthorised,

                finalActive,


                finalVisitedCenters,

                finalVisitedName
                    ? String(
                        finalVisitedName
                      ).trim()
                    : null,


                Number(
                    new_members_added_today ?? existing[0].new_members_added_today ?? 0
                ) || 0,


                finalPadSales,


                health_atm_machine_details !== undefined
                    ? (health_atm_machine_details ? String(health_atm_machine_details).trim() : null)
                    : existing[0].health_atm_machine_details,


                Number(
                    birth_baby_girls ?? existing[0].birth_baby_girls ?? 0
                ) || 0,

                Number(
                    death_count ?? existing[0].death_count ?? 0
                ) || 0,

                Number(
                    accident_count ?? existing[0].accident_count ?? 0
                ) || 0,


                finalUtr
                    ? String(finalUtr).trim()
                    : null,


                finalRemarks
                    ? String(
                        finalRemarks
                      ).trim()
                    : null,


                meetingPhoto1,

                meetingPhoto2,


                status ||
                    existing[0].status ||
                    "active",


                id,

            ]

        );


        // =================================================
        // GET UPDATED REPORT
        // =================================================

        const [updatedRows] =
            await db.query(

                `
                SELECT *

                FROM vibhag_reports

                WHERE id = ?

                LIMIT 1
                `,

                [
                    id
                ]

            );


        return res.status(200).json({

            success: true,

            message:
                "Vibhag report updated successfully",

            report:
                updatedRows[0],

            data:
                updatedRows[0],

        });


    } catch (error) {

        console.error(
            "UPDATE VIBHAG REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to update Vibhag report",

        });

    }

};


// =====================================================
// DELETE VIBHAG REPORT
// DELETE /api/vibhag-reports/:id
// =====================================================

const deleteVibhagReport = async (
    req,
    res
) => {

    try {

        const {
            id
        } = req.params;


        const [rows] =
            await db.query(

                `
                SELECT
                    meeting_photo_1,
                    meeting_photo_2

                FROM vibhag_reports

                WHERE id = ?

                LIMIT 1
                `,

                [
                    id
                ]

            );


        if (
            rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Vibhag report not found",

            });

        }


        await db.query(

            `
            DELETE FROM vibhag_reports

            WHERE id = ?
            `,

            [
                id
            ]

        );


        return res.status(200).json({

            success: true,

            message:
                "Vibhag report deleted successfully",

        });


    } catch (error) {

        console.error(
            "DELETE VIBHAG REPORT ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to delete Vibhag report",

        });

    }

};


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    createVibhagReport,

    getVibhagReports,

    getVibhagReportById,

    updateVibhagReport,

    deleteVibhagReport,

};