import React, { useEffect, useState } from "react";
import { Alert, Button, Spinner, Modal, Form, Row, Col } from "react-bootstrap";
import * as XLSX from "xlsx";
import { API_BASE_URL as ROOT_API_URL, BACKEND_ROOT_URL } from "../../../config/api";

// =========================================================
// API CONFIG
// =========================================================

const API_BASE_URL = `${ROOT_API_URL}/taluka-reports`;
const BACKEND_BASE_URL = BACKEND_ROOT_URL;

// =========================================================
// PHOTO URL HELPER
// =========================================================

const getPhotoUrl = (photo) => {
  if (!photo) return "";
  const value = String(photo).trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }

  if (value.startsWith("/uploads/")) {
    return `${BACKEND_BASE_URL}${value}`;
  }

  if (value.startsWith("uploads/")) {
    return `${BACKEND_BASE_URL}/${value}`;
  }

  if (value.startsWith("taluka-reports/")) {
    return `${BACKEND_BASE_URL}/uploads/${value}`;
  }

  return `${BACKEND_BASE_URL}/uploads/taluka-reports/${encodeURIComponent(value)}`;
};

// =========================================================
// DATE FORMATTERS
// =========================================================

const formatDate = (date) => {
  if (!date) return "-";
  const value = String(date).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
};

// =========================================================
// GET VALUE HELPER
// =========================================================

const getValue = (report, camelCase, snakeCase, defaultValue = "-") => {
  const value = report?.[camelCase] ?? report?.[snakeCase];
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  return value;
};

const getReportDateValue = (report) => {
  const raw = report?.report_date ?? report?.reportDate ?? "";
  return String(raw).split("T")[0];
};

// =========================================================
// MAIN COMPONENT: SSWF TALUKA DAILY REPORT FORM (ADMIN)
// =========================================================

const TalukaReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [talukaFilter, setTalukaFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // View Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    designation: "",
    taluka: "",
    district: "",
    mobile_number: "",
    report_date: "",
    total_authorised_center_heads: "",
    total_active_center_heads: "",
    visited_center_heads_names: "",
    sanitary_pads_boxes_sold: "",
    sanitary_pads_sales_amount: "",
    utr_number: "",
    additional_remarks: "",
  });

  const [editPhoto1, setEditPhoto1] = useState(null);
  const [editPhoto2, setEditPhoto2] = useState(null);
  const [previewPhoto1, setPreviewPhoto1] = useState(null);
  const [previewPhoto2, setPreviewPhoto2] = useState(null);

  // Fetch Reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const role = (localStorage.getItem("logged_in_role") || "admin").toLowerCase();
      const userId = localStorage.getItem("logged_in_user_id") || "";
      const params = new URLSearchParams();
      params.set("role", role);
      if (role !== "admin" && role !== "superadmin" && userId) {
        params.set("user_id", userId);
        const mobile = localStorage.getItem("logged_in_mobile") || "";
        const name = localStorage.getItem("logged_in_name") || "";
        if (mobile) params.set("mobile_number", mobile);
        if (name) params.set("user_name", name);
      }

      const res = await fetch(`${API_BASE_URL}?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to load Taluka reports");
      }

      const rows = data.reports || data.data || [];
      setReports(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("TALUKA REPORT FETCH ERROR:", err);
      setError(err.message || "Failed to load Taluka reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRefresh = async () => {
    setError("");
    setSuccess("");
    await fetchReports();
    setCurrentPage(1);
    setSuccess("Taluka reports refreshed successfully.");
  };

  const filteredReports = reports.filter((report) => {
    const name = String(getValue(report, "name", "name", "")).toLowerCase();
    const taluka = String(getValue(report, "taluka", "taluka", "")).toLowerCase();
    const district = String(getValue(report, "district", "district", "")).toLowerCase();
    const reportDate = getReportDateValue(report);

    const matchesName = !nameFilter.trim() || name.includes(nameFilter.trim().toLowerCase());
    const matchesTaluka = !talukaFilter.trim() || taluka.includes(talukaFilter.trim().toLowerCase());
    const matchesDistrict = !districtFilter.trim() || district.includes(districtFilter.trim().toLowerCase());
    const matchesDate = !dateFilter || reportDate === dateFilter;

    return matchesName && matchesTaluka && matchesDistrict && matchesDate;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, talukaFilter, districtFilter, dateFilter]);

  const totalRecords = filteredReports.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);

  const clearFilters = () => {
    setNameFilter("");
    setTalukaFilter("");
    setDistrictFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  const isFilterActive =
    nameFilter.trim() !== "" ||
    talukaFilter.trim() !== "" ||
    districtFilter.trim() !== "" ||
    dateFilter !== "";

  // View Report
  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  // Edit Report
  const handleEditReport = (report) => {
    setEditingId(report.id);
    setEditForm({
      name: getValue(report, "name", "name", ""),
      designation: getValue(report, "designation", "designation", ""),
      taluka: getValue(report, "taluka", "taluka", ""),
      district: getValue(report, "district", "district", ""),
      mobile_number: getValue(report, "mobileNumber", "mobile_number", ""),
      report_date: getReportDateValue(report),
      total_authorised_center_heads: getValue(
        report,
        "totalAuthorisedCenterHeads",
        "total_authorised_center_heads",
        ""
      ),
      total_active_center_heads: getValue(
        report,
        "totalActiveCenterHeads",
        "total_active_center_heads",
        ""
      ),
      visited_center_heads_names: getValue(
        report,
        "visitedCenterHeadsNames",
        "visited_center_heads_names",
        getValue(report, "todayVisitedCenterHeadsNames", "today_visited_center_heads_names", "")
      ),
      sanitary_pads_boxes_sold: getValue(
        report,
        "sanitaryPadsBoxesSold",
        "sanitary_pads_boxes_sold",
        getValue(report, "totalSanitaryPadsBoxesSoldToday", "total_sanitary_pad_boxes_sold_today", "")
      ),
      sanitary_pads_sales_amount: getValue(
        report,
        "sanitaryPadsSalesAmount",
        "sanitary_pads_sales_amount",
        getValue(report, "totalAmountFromSanitaryPadBoxSalesToday", "total_amount_from_sanitary_pad_sales_today", "")
      ),
      utr_number: getValue(report, "utrNumber", "utr_number", ""),
      additional_remarks: getValue(
        report,
        "additionalRemarks",
        "additional_remarks",
        ""
      ),
    });

    setEditPhoto1(null);
    setEditPhoto2(null);
    setPreviewPhoto1(
      getPhotoUrl(report.meeting_photo_1 || report.meetingPhoto1)
    );
    setPreviewPhoto2(
      getPhotoUrl(report.meeting_photo_2 || report.meetingPhoto2)
    );
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (field === "meeting_photo_1") {
      setEditPhoto1(file);
      setPreviewPhoto1(URL.createObjectURL(file));
    } else if (field === "meeting_photo_2") {
      setEditPhoto2(file);
      setPreviewPhoto2(URL.createObjectURL(file));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const fd = new FormData();
      Object.keys(editForm).forEach((key) => {
        if (editForm[key] !== null && editForm[key] !== undefined) {
          fd.append(key, editForm[key]);
        }
      });


      const res = await fetch(`${API_BASE_URL}/${editingId}`, {
        method: "PUT",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to update Taluka report");
      }

      setSuccess("Taluka report updated successfully.");
      setShowEditModal(false);
      await fetchReports();
    } catch (err) {
      console.error("EDIT TALUKA REPORT ERROR:", err);
      setError(err.message || "Failed to update Taluka report.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Taluka report?")) return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      const res = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete report");
      }

      setSuccess("Taluka report deleted successfully.");
      await fetchReports();
    } catch (err) {
      console.error("DELETE TALUKA REPORT ERROR:", err);
      setError(err.message || "Failed to delete Taluka report.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadExcel = () => {
    if (filteredReports.length === 0) {
      setError("Download करण्यासाठी कोणताही report उपलब्ध नाही.");
      return;
    }

    setError("");
    setSuccess("");

    const headers = [
      "SR",
      "Name (नाव)",
      "Designation ( पद)",
      "Taluka (तालुका)",
      "District (जिल्हा)",
      "Mobile Number (मोबाईल क्रमांक)",
      "Report Date (अहवालाची तारीख)",
      "Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०)",
      "Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)",
      "Today’s visited Center Heads Name( आज भेट दिलेल्या केंद्र प्रमुखांची नावे)",
      "Total Sanitary Pads box Sold Today( आज विक्री झालेल्या सॅनिटरी पॅडची एकूण संख्या)",
      "Total Amount from Sanitary Pad box Sales Today( आज सॅनिटरी पॅड विक्रीतून मिळालेली एकूण रक्कम )",
      "UTR Number(यूटीआर क्रमांक)",
      "Additional Remarks (इतर माहिती)",
      "Meeting Photo 1(बैठकीचा फोटो १)",
      "Meeting Photo 2(बैठकीचा फोटो २)",
      "Status",
    ];

    const rows = filteredReports.map((report, index) => [
      index + 1,
      getValue(report, "name", "name", ""),
      getValue(report, "designation", "designation", ""),
      getValue(report, "taluka", "taluka", ""),
      getValue(report, "district", "district", ""),
      getValue(report, "mobileNumber", "mobile_number", ""),
      formatDate(getReportDateValue(report)),
      getValue(report, "totalAuthorisedCenterHeads", "total_authorised_center_heads", "0"),
      getValue(report, "totalActiveCenterHeads", "total_active_center_heads", "0"),
      getValue(
        report,
        "visitedCenterHeadsNames",
        "visited_center_heads_names",
        getValue(report, "todayVisitedCenterHeadsNames", "today_visited_center_heads_names", "")
      ),
      getValue(
        report,
        "sanitaryPadsBoxesSold",
        "sanitary_pads_boxes_sold",
        getValue(report, "totalSanitaryPadsBoxesSoldToday", "total_sanitary_pad_boxes_sold_today", "0")
      ),
      getValue(
        report,
        "sanitaryPadsSalesAmount",
        "sanitary_pads_sales_amount",
        getValue(report, "totalAmountFromSanitaryPadBoxSalesToday", "total_amount_from_sanitary_pad_sales_today", "0")
      ),
      getValue(report, "utrNumber", "utr_number", ""),
      getValue(report, "additionalRemarks", "additional_remarks", ""),
      getPhotoUrl(report.meeting_photo_1 || report.meetingPhoto1) || "",
      getPhotoUrl(report.meeting_photo_2 || report.meetingPhoto2) || "",
      getValue(report, "status", "status", "active"),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Taluka Reports");
    XLSX.writeFile(
      workbook,
      `Taluka_Reports_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    setSuccess("Taluka reports exported to Excel successfully.");
  };

  return (
    <div className="taluka-report-page">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            SSWF Taluka Daily Report Form (एसएसडब्ल्यूएफ तालुका दैनंदिन अहवाल फॉर्म)
          </h4>
          <p className="text-muted mb-0">View, search, and manage all Taluka reports</p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline-dark" onClick={handleRefresh} disabled={loading}>
            Refresh
          </Button>

          <Button
            variant="success"
            onClick={handleDownloadExcel}
            disabled={loading || totalRecords === 0}
          >
            Download Excel
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")} className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess("")} className="mb-4">
          {success}
        </Alert>
      )}

      {/* TOTAL COUNTER */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-dark text-white rounded d-flex align-items-center justify-content-center fw-bold"
              style={{ width: "56px", height: "56px", fontSize: "20px" }}
            >
              {loading ? "..." : totalRecords}
            </div>

            <div>
              <small className="text-muted">Total Filtered Taluka Reports</small>
              <h4 className="fw-bold mb-0">
                {loading ? "Loading..." : `${totalRecords} Records`}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CARD */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">Name (नाव)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search Name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">Taluka (तालुका)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search Taluka..."
                value={talukaFilter}
                onChange={(e) => setTalukaFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">District (जिल्हा)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search District..."
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">Report Date (तारीख)</label>
              <input
                type="date"
                className="form-control"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            {isFilterActive && (
              <div className="col-12 text-end">
                <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table
              className="table table-hover table-bordered align-middle mb-0"
              style={{ minWidth: "2600px" }}
            >
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: "60px" }}>
                    SR
                  </th>
                  <th style={{ minWidth: "180px" }}>Name (नाव)</th>
                  <th style={{ minWidth: "150px" }}>Designation ( पद)</th>
                  <th style={{ minWidth: "140px" }}>Taluka (तालुका)</th>
                  <th style={{ minWidth: "140px" }}>District (जिल्हा)</th>
                  <th style={{ minWidth: "150px" }}>Mobile Number (मोबाईल क्रमांक)</th>
                  <th style={{ minWidth: "140px" }}>Report Date (अहवालाची तारीख)</th>
                  <th className="text-center" style={{ minWidth: "250px" }}>
                    Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०)
                  </th>
                  <th className="text-center" style={{ minWidth: "180px" }}>
                    Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)
                  </th>
                  <th style={{ minWidth: "250px" }}>
                    Today’s visited Center Heads Name( आज भेट दिलेल्या केंद्र प्रमुखांची नावे)
                  </th>
                  <th className="text-center" style={{ minWidth: "250px" }}>
                    Total Sanitary Pads box Sold Today( आज विक्री झालेल्या सॅनिटरी पॅडची एकूण संख्या)
                  </th>
                  <th className="text-center" style={{ minWidth: "250px" }}>
                    Total Amount from Sanitary Pad box Sales Today( आज सॅनिटरी पॅड विक्रीतून मिळालेली एकूण रक्कम )
                  </th>
                  <th style={{ minWidth: "160px" }}>UTR Number(यूटीआर क्रमांक)</th>
                  <th style={{ minWidth: "240px" }}>Additional Remarks (इतर माहिती)</th>
                  <th className="text-center" style={{ minWidth: "140px" }}>
                    Meeting Photo 1(बैठकीचा फोटो १)
                  </th>
                  <th className="text-center" style={{ minWidth: "140px" }}>
                    Meeting Photo 2(बैठकीचा फोटो २)
                  </th>
                  <th className="text-center" style={{ minWidth: "100px" }}>
                    Status
                  </th>
                  <th className="text-center" style={{ minWidth: "200px" }}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="18" className="text-center py-5">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading Taluka reports...
                    </td>
                  </tr>
                ) : totalRecords === 0 ? (
                  <tr>
                    <td colSpan="18" className="text-center py-5 text-muted">
                      No Taluka reports found.
                    </td>
                  </tr>
                ) : (
                  currentReports.map((report, index) => {
                    const photo1 = getPhotoUrl(report.meeting_photo_1 || report.meetingPhoto1);
                    const photo2 = getPhotoUrl(report.meeting_photo_2 || report.meetingPhoto2);

                    return (
                      <tr key={report.id || index}>
                        <td className="text-center">{startIndex + index + 1}</td>
                        <td className="fw-semibold">{getValue(report, "name", "name")}</td>
                        <td>{getValue(report, "designation", "designation")}</td>
                        <td>{getValue(report, "taluka", "taluka")}</td>
                        <td>{getValue(report, "district", "district")}</td>
                        <td>{getValue(report, "mobileNumber", "mobile_number")}</td>
                        <td>{formatDate(getReportDateValue(report))}</td>
                        <td className="text-center">
                          {getValue(report, "totalAuthorisedCenterHeads", "total_authorised_center_heads", "0")}
                        </td>
                        <td className="text-center">
                          {getValue(report, "totalActiveCenterHeads", "total_active_center_heads", "0")}
                        </td>
                        <td>
                          {getValue(
                            report,
                            "visitedCenterHeadsNames",
                            "visited_center_heads_names",
                            getValue(report, "todayVisitedCenterHeadsNames", "today_visited_center_heads_names", "-")
                          )}
                        </td>
                        <td className="text-center">
                          {getValue(
                            report,
                            "sanitaryPadsBoxesSold",
                            "sanitary_pads_boxes_sold",
                            getValue(report, "totalSanitaryPadsBoxesSoldToday", "total_sanitary_pad_boxes_sold_today", "0")
                          )}
                        </td>
                        <td className="text-center fw-semibold">
                          ₹{getValue(
                            report,
                            "sanitaryPadsSalesAmount",
                            "sanitary_pads_sales_amount",
                            getValue(report, "totalAmountFromSanitaryPadBoxSalesToday", "total_amount_from_sanitary_pad_sales_today", "0")
                          )}
                        </td>
                        <td>{getValue(report, "utrNumber", "utr_number")}</td>
                        <td>{getValue(report, "additionalRemarks", "additional_remarks")}</td>
                        <td className="text-center">
                          {photo1 ? (
                            <a href={photo1} target="_blank" rel="noreferrer">
                              <img
                                src={photo1}
                                alt="Photo 1"
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                }}
                              />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-center">
                          {photo2 ? (
                            <a href={photo2} target="_blank" rel="noreferrer">
                              <img
                                src={photo2}
                                alt="Photo 2"
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                }}
                              />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-success-subtle text-success">
                            {getValue(report, "status", "status", "active")}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="d-flex justify-content-center align-items-center gap-1">
                            <Button
                              size="sm"
                              variant="dark"
                              onClick={() => handleViewReport(report)}
                              title="View Details"
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleEditReport(report)}
                              title="Edit Report"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={deletingId === report.id}
                              onClick={() => handleDeleteReport(report.id)}
                              title="Delete Report"
                            >
                              {deletingId === report.id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                "Delete"
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="card-footer bg-white py-3 d-flex justify-content-between align-items-center">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-muted small">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* DETAIL MODAL WITH EXACT 15 MARATHI LABELS */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Taluka Report Details (तालुका अहवाल तपशील)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {selectedReport && (
            <div className="row g-3">
              <div className="col-md-6">
                <strong>Name (नाव):</strong>
                <div>{getValue(selectedReport, "name", "name")}</div>
              </div>
              <div className="col-md-6">
                <strong>Designation ( पद):</strong>
                <div>{getValue(selectedReport, "designation", "designation")}</div>
              </div>
              <div className="col-md-6">
                <strong>Taluka (तालुका):</strong>
                <div>{getValue(selectedReport, "taluka", "taluka")}</div>
              </div>
              <div className="col-md-6">
                <strong>District (जिल्हा):</strong>
                <div>{getValue(selectedReport, "district", "district")}</div>
              </div>
              <div className="col-md-6">
                <strong>Mobile Number (मोबाईल क्रमांक):</strong>
                <div>{getValue(selectedReport, "mobileNumber", "mobile_number")}</div>
              </div>
              <div className="col-md-6">
                <strong>Report Date (अहवालाची तारीख):</strong>
                <div>{formatDate(getReportDateValue(selectedReport))}</div>
              </div>
              <div className="col-md-6">
                <strong>Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०):</strong>
                <div>
                  {getValue(
                    selectedReport,
                    "totalAuthorisedCenterHeads",
                    "total_authorised_center_heads",
                    "0"
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या):</strong>
                <div>
                  {getValue(
                    selectedReport,
                    "totalActiveCenterHeads",
                    "total_active_center_heads",
                    "0"
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Today’s visited Center Heads Name( आज भेट दिलेल्या केंद्र प्रमुखांची नावे):</strong>
                <div>
                  {getValue(
                    selectedReport,
                    "visitedCenterHeadsNames",
                    "visited_center_heads_names",
                    getValue(selectedReport, "todayVisitedCenterHeadsNames", "today_visited_center_heads_names", "-")
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Total Sanitary Pads box Sold Today( आज विक्री झालेल्या सॅनिटरी पॅडची एकूण संख्या):</strong>
                <div>
                  {getValue(
                    selectedReport,
                    "sanitaryPadsBoxesSold",
                    "sanitary_pads_boxes_sold",
                    getValue(selectedReport, "totalSanitaryPadsBoxesSoldToday", "total_sanitary_pad_boxes_sold_today", "0")
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Total Amount from Sanitary Pad box Sales Today( आज सॅनिटरी पॅड विक्रीतून मिळालेली एकूण रक्कम ):</strong>
                <div className="fw-bold text-success">
                  ₹{getValue(
                    selectedReport,
                    "sanitaryPadsSalesAmount",
                    "sanitary_pads_sales_amount",
                    getValue(selectedReport, "totalAmountFromSanitaryPadBoxSalesToday", "total_amount_from_sanitary_pad_sales_today", "0")
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>UTR Number(यूटीआर क्रमांक):</strong>
                <div>{getValue(selectedReport, "utrNumber", "utr_number")}</div>
              </div>
              <div className="col-12">
                <strong>Additional Remarks (इतर माहिती):</strong>
                <div>{getValue(selectedReport, "additionalRemarks", "additional_remarks")}</div>
              </div>
              <div className="col-md-6">
                <strong>Meeting Photo 1(बैठकीचा फोटो १):</strong>
                <div className="mt-2">
                  {getPhotoUrl(selectedReport.meeting_photo_1 || selectedReport.meetingPhoto1) ? (
                    <a
                      href={getPhotoUrl(selectedReport.meeting_photo_1 || selectedReport.meetingPhoto1)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getPhotoUrl(selectedReport.meeting_photo_1 || selectedReport.meetingPhoto1)}
                        alt="Meeting Photo 1"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "200px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    </a>
                  ) : (
                    "No photo uploaded"
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Meeting Photo 2(बैठकीचा फोटो २):</strong>
                <div className="mt-2">
                  {getPhotoUrl(selectedReport.meeting_photo_2 || selectedReport.meetingPhoto2) ? (
                    <a
                      href={getPhotoUrl(selectedReport.meeting_photo_2 || selectedReport.meetingPhoto2)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getPhotoUrl(selectedReport.meeting_photo_2 || selectedReport.meetingPhoto2)}
                        alt="Meeting Photo 2"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "200px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    </a>
                  ) : (
                    "No photo uploaded"
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* EDIT MODAL WITH EXACT 15 FIELDS */}
      <Modal
        show={showEditModal}
        onHide={() => {
          if (!saving) setShowEditModal(false);
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Edit Taluka Report (तालुका अहवाल संपादित करा)
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveEdit}>
          <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Name (नाव)</Form.Label>
                  <Form.Control
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Designation ( पद)</Form.Label>
                  <Form.Control
                    name="designation"
                    value={editForm.designation}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Taluka (तालुका)</Form.Label>
                  <Form.Control
                    name="taluka"
                    value={editForm.taluka}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">District (जिल्हा)</Form.Label>
                  <Form.Control
                    name="district"
                    value={editForm.district}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Mobile Number (मोबाईल क्रमांक)</Form.Label>
                  <Form.Control
                    name="mobile_number"
                    value={editForm.mobile_number}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Report Date (अहवालाची तारीख)</Form.Label>
                  <Form.Control
                    type="date"
                    name="report_date"
                    value={editForm.report_date}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total authourised center Head-50 (अधिकृत केंद्र प्रमुखांची एकूण संख्या -५०)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="total_authorised_center_heads"
                    value={editForm.total_authorised_center_heads}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="total_active_center_heads"
                    value={editForm.total_active_center_heads}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today’s visited Center Heads Name( आज भेट दिलेल्या केंद्र प्रमुखांची नावे)
                  </Form.Label>
                  <Form.Control
                    name="visited_center_heads_names"
                    value={editForm.visited_center_heads_names}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total Sanitary Pads box Sold Today( आज विक्री झालेल्या सॅनिटरी पॅडची एकूण संख्या)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="sanitary_pads_boxes_sold"
                    value={editForm.sanitary_pads_boxes_sold}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total Amount from Sanitary Pad box Sales Today( आज सॅनिटरी पॅड विक्रीतून मिळालेली एकूण रक्कम )
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="sanitary_pads_sales_amount"
                    value={editForm.sanitary_pads_sales_amount}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">UTR Number(यूटीआर क्रमांक)</Form.Label>
                  <Form.Control
                    name="utr_number"
                    value={editForm.utr_number}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Additional Remarks (इतर माहिती)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="additional_remarks"
                    value={editForm.additional_remarks}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default TalukaReport;
