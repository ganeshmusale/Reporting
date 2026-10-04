const db = require("../config/db");
const {
    ensureReportOwnershipColumns,
    getOwnershipFromBody,
    fetchReportsForRole,
} = require("../utils/ensureReportOwnership");

/*
=====================================================
HELPER
=====================================================
Gets the District user ID.
Priority:
1. Authenticated user (if auth middleware is available)
2. req.query.user_id
3. req.body.user_id
*/

const getCurrentUserId = (req) => {
    const authUser =
        req.user ||
        req.userData ||
        req.authUser ||
        null;

    const userId =
        authUser?.user_id ??
        authUser?.userId ??
        authUser?.username ??
        req.query?.user_id ??
        req.body?.user_id ??
        "";

    const value = String(userId).trim();

    return value || null;
};

// =====================================================
// CREATE DISTRICT REPORT
// POST /api/district-reports
// =====================================================

const createDistrictReport = async (req, res) => {
    try {
        console.log("CREATE REPORT BODY:", req.body);
        console.log("CREATE REPORT FILES:", req.files);

        const {
            user_id,
            name,
            designation,
            taluka,
            district,
            mobile_number,
            mobileNumber,
            report_date,
            reportDate,

            // CENTER HEAD DETAILS
            total_authorised_center_heads_300_to_500,
            total_active_center_heads,
            utr_number,
            additional_remarks,

            // LEGACY MACHINE FIELDS
            machine1_camp_name,
            machine1_test_amount,
            machine1_medicine_amount,
            machine1_total_amount,
            machine2_camp_name,
            machine2_test_amount,
            machine2_medicine_amount,
            machine2_total_amount,
            status,
        } = req.body;

        const currentUserId =
            getCurrentUserId(req) ||
            (user_id ? String(user_id).trim() : null);

        if (!currentUserId) {
            return res.status(400).json({
                success: false,
                message: "District user ID is required",
            });
        }

        if (!name || !String(name).trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        const finalReportDate = report_date || reportDate;
        if (!finalReportDate) {
            return res.status(400).json({
                success: false,
                message: "Report date is required",
            });
        }

        // PHOTO FILES
        let photo1 = null;
        let photo2 = null;

        if (req.files) {
            if (req.files.machine1_camp_photo && req.files.machine1_camp_photo.length > 0) {
                photo1 = req.files.machine1_camp_photo[0].filename;
            }

            if (req.files.machine2_camp_photo && req.files.machine2_camp_photo.length > 0) {
                photo2 = req.files.machine2_camp_photo[0].filename;
            }
        }

        const authCount = Number(total_authorised_center_heads_300_to_500) || 0;
        const activeCount = Number(total_active_center_heads) || 0;
        const otherInfo = additional_remarks || null;

        await ensureReportOwnershipColumns(db);
        const ownership = getOwnershipFromBody(req.body);

        const [result] = await db.query(
            `
            INSERT INTO district_reports
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

                total_authorised_center_heads_300_to_500,
                total_active_center_heads,
                utr_number,
                additional_remarks,

                machine1_camp_name,
                machine1_test_amount,
                machine1_medicine_amount,
                machine1_total_amount,
                machine2_camp_name,
                machine2_test_amount,
                machine2_medicine_amount,
                machine2_total_amount,

                machine1_camp_photo,
                machine2_camp_photo,

                status
            )
            VALUES
            (
                ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?
            )
            `,
            [
                currentUserId,
                ownership.createdBy || (name ? String(name).trim() : null),
                ownership.role || "district",
                name,
                designation || null,
                taluka || null,
                district || null,
                mobile_number || mobileNumber || null,
                finalReportDate,

                authCount,
                activeCount,
                utr_number || null,
                otherInfo,

                machine1_camp_name || null,
                Number(machine1_test_amount) || 0,
                Number(machine1_medicine_amount) || 0,
                Number(machine1_total_amount) || 0,
                machine2_camp_name || null,
                Number(machine2_test_amount) || 0,
                Number(machine2_medicine_amount) || 0,
                Number(machine2_total_amount) || 0,

                photo1,
                photo2,

                status || "active",
            ]
        );

        return res.status(201).json({
            success: true,
            message: "District report created successfully",
            id: result.insertId,
        });
    } catch (error) {
        console.error("CREATE DISTRICT REPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create district report",
            error: error.message,
        });
    }
};

// =====================================================
// GET DISTRICT REPORTS - USER WISE / ALL
// GET /api/district-reports
// =====================================================

const getDistrictReports = async (req, res) => {
    try {
        const reports = await fetchReportsForRole(
            db,
            "district_reports",
            {
                role: req.query.role || req.user?.role || "",
                user_id: getCurrentUserId(req) || req.query.user_id || "",
                mobile_number: req.query.mobile_number || "",
                user_name: req.query.user_name || req.query.name || "",
            }
        );

        return res.status(200).json({
            success: true,
            count: reports.length,
            total: reports.length,
            reports,
            data: reports,
        });
    } catch (error) {
        console.error("GET DISTRICT REPORTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch district reports",
            error: error.message,
        });
    }
};

// =====================================================
// GET SINGLE REPORT
// GET /api/district-reports/:id
// =====================================================

const getDistrictReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = getCurrentUserId(req);
        let reports;

        if (currentUserId) {
            [reports] = await db.query(
                `SELECT * FROM district_reports WHERE id = ? AND user_id = ? LIMIT 1`,
                [id, currentUserId]
            );
        } else {
            [reports] = await db.query(
                `SELECT * FROM district_reports WHERE id = ? LIMIT 1`,
                [id]
            );
        }

        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: "District report not found",
            });
        }

        return res.status(200).json({
            success: true,
            report: reports[0],
            data: reports[0],
        });
    } catch (error) {
        console.error("GET SINGLE DISTRICT REPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch district report",
            error: error.message,
        });
    }
};

// =====================================================
// UPDATE DISTRICT REPORT
// PUT /api/district-reports/:id
// =====================================================

const updateDistrictReport = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = getCurrentUserId(req) || (req.body.user_id ? String(req.body.user_id).trim() : null);

        let existing;
        if (currentUserId) {
            [existing] = await db.query(
                `SELECT * FROM district_reports WHERE id = ? AND user_id = ? LIMIT 1`,
                [id, currentUserId]
            );
        } else {
            [existing] = await db.query(
                `SELECT * FROM district_reports WHERE id = ? LIMIT 1`,
                [id]
            );
        }

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "District report not found or does not belong to this user",
            });
        }

        const old = existing[0];
        const {
            name,
            designation,
            taluka,
            district,
            mobile_number,
            mobileNumber,
            report_date,
            reportDate,
            total_authorised_center_heads_300_to_500,
            total_active_center_heads,
            utr_number,
            any_other_information,
            additional_remarks,
            machine1_camp_name,
            machine1_test_amount,
            machine1_medicine_amount,
            machine1_total_amount,
            machine2_camp_name,
            machine2_test_amount,
            machine2_medicine_amount,
            machine2_total_amount,
            status,
        } = req.body;

        let photo1 = old.machine1_camp_photo || null;
        let photo2 = old.machine2_camp_photo || null;

        if (req.files) {
            if (req.files.machine1_camp_photo && req.files.machine1_camp_photo.length > 0) {
                photo1 = req.files.machine1_camp_photo[0].filename;
            }

            if (req.files.machine2_camp_photo && req.files.machine2_camp_photo.length > 0) {
                photo2 = req.files.machine2_camp_photo[0].filename;
            }
        }

        const authCount = total_authorised_center_heads_300_to_500 !== undefined
            ? (Number(total_authorised_center_heads_300_to_500) || 0)
            : (old.total_authorised_center_heads_300_to_500 || 0);

        const activeCount = total_active_center_heads !== undefined
            ? (Number(total_active_center_heads) || 0)
            : (old.total_active_center_heads || 0);

        const otherInfo = additional_remarks ?? old.additional_remarks ?? null;

        await ensureReportOwnershipColumns(db);
        const ownership = getOwnershipFromBody(req.body);

        let updateQuery = `
            UPDATE district_reports
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

                total_authorised_center_heads_300_to_500 = ?,
                total_active_center_heads = ?,
                utr_number = ?,
                additional_remarks = ?,

                machine1_camp_name = ?,
                machine1_test_amount = ?,
                machine1_medicine_amount = ?,
                machine1_total_amount = ?,
                machine2_camp_name = ?,
                machine2_test_amount = ?,
                machine2_medicine_amount = ?,
                machine2_total_amount = ?,

                machine1_camp_photo = ?,
                machine2_camp_photo = ?,

                status = ?
            WHERE id = ?
        `;

        const updateValues = [
            currentUserId || ownership.userId,
            ownership.createdBy,
            ownership.role || "district",
            ownership.updatedBy,
            ownership.updatedById || currentUserId,
            name ?? old.name,
            designation ?? old.designation,
            taluka ?? old.taluka,
            district ?? old.district,
            mobile_number ?? mobileNumber ?? old.mobile_number,
            report_date ?? reportDate ?? old.report_date,

            authCount,
            activeCount,
            utr_number ?? old.utr_number,
            otherInfo,

            machine1_camp_name ?? old.machine1_camp_name,
            machine1_test_amount !== undefined ? (Number(machine1_test_amount) || 0) : old.machine1_test_amount,
            machine1_medicine_amount !== undefined ? (Number(machine1_medicine_amount) || 0) : old.machine1_medicine_amount,
            machine1_total_amount !== undefined ? (Number(machine1_total_amount) || 0) : old.machine1_total_amount,
            machine2_camp_name ?? old.machine2_camp_name,
            machine2_test_amount !== undefined ? (Number(machine2_test_amount) || 0) : old.machine2_test_amount,
            machine2_medicine_amount !== undefined ? (Number(machine2_medicine_amount) || 0) : old.machine2_medicine_amount,
            machine2_total_amount !== undefined ? (Number(machine2_total_amount) || 0) : old.machine2_total_amount,

            photo1,
            photo2,

            status || old.status || "active",
            id,
        ];

        if (currentUserId) {
            updateQuery = `${updateQuery} AND user_id = ?`;
            updateValues.push(currentUserId);
        }

        const [updateResult] = await db.query(updateQuery, updateValues);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "District report not found or does not belong to this user",
            });
        }

        return res.status(200).json({
            success: true,
            message: "District report updated successfully",
        });
    } catch (error) {
        console.error("UPDATE DISTRICT REPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update district report",
            error: error.message,
        });
    }
};

// =====================================================
// DELETE DISTRICT REPORT
// DELETE /api/district-reports/:id
// =====================================================

const deleteDistrictReport = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = getCurrentUserId(req);
        let result;

        if (currentUserId) {
            [result] = await db.query(
                `DELETE FROM district_reports WHERE id = ? AND user_id = ?`,
                [id, currentUserId]
            );
        } else {
            [result] = await db.query(
                `DELETE FROM district_reports WHERE id = ?`,
                [id]
            );
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "District report not found or does not belong to this user",
            });
        }

        return res.status(200).json({
            success: true,
            message: "District report deleted successfully",
        });
    } catch (error) {
        console.error("DELETE DISTRICT REPORT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete district report",
            error: error.message,
        });
    }
};

module.exports = {
    createDistrictReport,
    getDistrictReports,
    getDistrictReportById,
    updateDistrictReport,
    deleteDistrictReport,
};