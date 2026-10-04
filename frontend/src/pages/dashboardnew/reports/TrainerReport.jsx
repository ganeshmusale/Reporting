import React, { useEffect, useState } from "react";
import { Alert, Button, Spinner, Modal, Form, Row, Col } from "react-bootstrap";
import * as XLSX from "xlsx";
import { API_BASE_URL as ROOT_API_URL, BACKEND_ROOT_URL } from "../../../config/api";

// =========================================================
// API CONFIG
// =========================================================

const API_BASE_URL = `${ROOT_API_URL}/trainer-reports`;
const BACKEND_BASE_URL = BACKEND_ROOT_URL;

// =========================================================
// MEDIA / IMAGE URL HELPER
// =========================================================

const getMediaUrl = (photo) => {
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

  if (value.startsWith("trainer-reports/")) {
    return `${BACKEND_BASE_URL}/uploads/${value}`;
  }

  return `${BACKEND_BASE_URL}/uploads/trainer-reports/${encodeURIComponent(value)}`;
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
// MAIN COMPONENT: BDO REPORT (ADMIN)
// =========================================================

const TrainerReport = () => {
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
    total_shops_visited_today: "",
    total_panel_registration_amount: "",
    payment_mode: "Cash",
  });

  const [editShopPhoto, setEditShopPhoto] = useState(null);
  const [editRegPhoto, setEditRegPhoto] = useState(null);
  const [editWorkProof, setEditWorkProof] = useState(null);

  const [previewShopPhoto, setPreviewShopPhoto] = useState(null);
  const [previewRegPhoto, setPreviewRegPhoto] = useState(null);
  const [previewWorkProof, setPreviewWorkProof] = useState(null);

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
        throw new Error(data.message || "Failed to load BDO reports");
      }

      const rows = data.reports || data.data || [];
      setReports(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("BDO REPORT FETCH ERROR:", err);
      setError(err.message || "Failed to load BDO reports.");
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
    setSuccess("BDO reports refreshed successfully.");
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
      total_shops_visited_today: getValue(report, "totalShopsVisitedToday", "total_shops_visited_today", ""),
      total_panel_registration_amount: getValue(report, "totalPanelRegistrationAmount", "total_panel_registration_amount", ""),
      payment_mode: getValue(report, "paymentMode", "payment_mode", "Cash"),
    });

    setEditShopPhoto(null);
    setEditRegPhoto(null);
    setEditWorkProof(null);

    setPreviewShopPhoto(getMediaUrl(report.shop_photo || report.shopPhoto));
    setPreviewRegPhoto(getMediaUrl(report.shopkeeper_registration_photo || report.shopkeeperRegistrationPhoto));
    setPreviewWorkProof(getMediaUrl(report.work_photo_video || report.workPhotoVideo));

    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    if (field === "shop_photo") {
      setEditShopPhoto(file);
      setPreviewShopPhoto(URL.createObjectURL(file));
    } else if (field === "shopkeeper_registration_photo") {
      setEditRegPhoto(file);
      setPreviewRegPhoto(URL.createObjectURL(file));
    } else if (field === "work_photo_video") {
      setEditWorkProof(file);
      setPreviewWorkProof(URL.createObjectURL(file));
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
        throw new Error(data.message || "Failed to update BDO report");
      }

      setSuccess("BDO report updated successfully.");
      setShowEditModal(false);
      await fetchReports();
    } catch (err) {
      console.error("EDIT BDO REPORT ERROR:", err);
      setError(err.message || "Failed to update BDO report.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this BDO report?")) return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      const res = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete report");
      }

      setSuccess("BDO report deleted successfully.");
      await fetchReports();
    } catch (err) {
      console.error("DELETE BDO REPORT ERROR:", err);
      setError(err.message || "Failed to delete BDO report.");
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
      "1 Date(दिनांक)",
      "2 BDO Full Name (BDO चे पूर्ण नाव)",
      "3 Designation (पद)",
      "4 Taluka Name (तालुक्याचे नाव)",
      "5 District Name (जिल्ह्याचे नाव)",
      "6 Mobile Number (मोबाईल नंबर)",
      "7 Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या)",
      "8 Total Amount Collected from Today’s Panel Registrations (आजच्या Panel Registration मधून जमा  झालेली एकूण रक्कम)",
      "9 Payment Mode (पेमेंट पद्धत)",
      "10 Shop Photo (दुकानाचा फोटो)",
      "11 Photo of the Shopkeeper’s Registration Form (दुकानदाराच्या Registration Form चा फोटो)",
      "12 Today’s Work Photo / Video Proof (आजच्या कामाचे Photo / Video Proof)",
      "Status",
    ];

    const rows = filteredReports.map((report, index) => [
      index + 1,
      formatDate(getReportDateValue(report)),
      getValue(report, "name", "name", ""),
      getValue(report, "designation", "designation", ""),
      getValue(report, "taluka", "taluka", ""),
      getValue(report, "district", "district", ""),
      getValue(report, "mobileNumber", "mobile_number", ""),
      getValue(report, "totalShopsVisitedToday", "total_shops_visited_today", "0"),
      getValue(report, "totalPanelRegistrationAmount", "total_panel_registration_amount", "0"),
      getValue(report, "paymentMode", "payment_mode", "Cash"),
      getMediaUrl(report.shop_photo || report.shopPhoto) || "",
      getMediaUrl(report.shopkeeper_registration_photo || report.shopkeeperRegistrationPhoto) || "",
      getMediaUrl(report.work_photo_video || report.workPhotoVideo) || "",
      getValue(report, "status", "status", "active"),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BDO Reports");
    XLSX.writeFile(
      workbook,
      `BDO_Reports_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    setSuccess("BDO reports exported to Excel successfully.");
  };

  return (
    <div className="trainer-report-page">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">BDO Reports (BDO / गटविकास अधिकारी अहवाल)</h4>
          <p className="text-muted mb-0">View, search, and manage all BDO reports</p>
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
              <small className="text-muted">Total Filtered BDO Reports</small>
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
              <label className="form-label fw-semibold">BDO Full Name (नाव)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search Name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">Taluka Name (तालुक्याचे नाव)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search Taluka..."
                value={talukaFilter}
                onChange={(e) => setTalukaFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">District Name (जिल्ह्याचे नाव)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search District..."
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label fw-semibold">Date (दिनांक)</label>
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
              style={{ minWidth: "2200px" }}
            >
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: "60px" }}>
                    SR
                  </th>
                  <th style={{ minWidth: "130px" }}>1 Date(दिनांक)</th>
                  <th style={{ minWidth: "180px" }}>2 BDO Full Name (BDO चे पूर्ण नाव)</th>
                  <th style={{ minWidth: "150px" }}>3 Designation (पद)</th>
                  <th style={{ minWidth: "140px" }}>4 Taluka Name (तालुक्याचे नाव)</th>
                  <th style={{ minWidth: "140px" }}>5 District Name (जिल्ह्याचे नाव)</th>
                  <th style={{ minWidth: "150px" }}>6 Mobile Number (मोबाईल नंबर)</th>
                  <th className="text-center" style={{ minWidth: "220px" }}>
                    7 Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या)
                  </th>
                  <th className="text-center" style={{ minWidth: "240px" }}>
                    8 Total Amount Collected from Today’s Panel Registrations (आजच्या Panel Registration मधून जमा  झालेली एकूण रक्कम)
                  </th>
                  <th className="text-center" style={{ minWidth: "150px" }}>
                    9 Payment Mode (पेमेंट पद्धत)
                  </th>
                  <th className="text-center" style={{ minWidth: "140px" }}>
                    10 Shop Photo (दुकानाचा फोटो)
                  </th>
                  <th className="text-center" style={{ minWidth: "180px" }}>
                    11 Photo of Registration Form (नोंदणी फॉर्म फोटो)
                  </th>
                  <th className="text-center" style={{ minWidth: "160px" }}>
                    12 Work Photo / Video Proof (कामाचा पुरावा)
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
                    <td colSpan="15" className="text-center py-5">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading BDO reports...
                    </td>
                  </tr>
                ) : totalRecords === 0 ? (
                  <tr>
                    <td colSpan="15" className="text-center py-5 text-muted">
                      No BDO reports found.
                    </td>
                  </tr>
                ) : (
                  currentReports.map((report, index) => {
                    const shopImg = getMediaUrl(report.shop_photo || report.shopPhoto);
                    const regImg = getMediaUrl(report.shopkeeper_registration_photo || report.shopkeeperRegistrationPhoto);
                    const workProof = getMediaUrl(report.work_photo_video || report.workPhotoVideo);

                    return (
                      <tr key={report.id || index}>
                        <td className="text-center">{startIndex + index + 1}</td>
                        <td>{formatDate(getReportDateValue(report))}</td>
                        <td className="fw-semibold">{getValue(report, "name", "name")}</td>
                        <td>{getValue(report, "designation", "designation")}</td>
                        <td>{getValue(report, "taluka", "taluka")}</td>
                        <td>{getValue(report, "district", "district")}</td>
                        <td>{getValue(report, "mobileNumber", "mobile_number")}</td>
                        <td className="text-center">
                          {getValue(report, "totalShopsVisitedToday", "total_shops_visited_today", "0")}
                        </td>
                        <td className="text-center fw-semibold">
                          ₹{getValue(report, "totalPanelRegistrationAmount", "total_panel_registration_amount", "0")}
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary-subtle text-primary">
                            {getValue(report, "paymentMode", "payment_mode", "Cash")}
                          </span>
                        </td>
                        <td className="text-center">
                          {shopImg ? (
                            <a href={shopImg} target="_blank" rel="noreferrer">
                              <img
                                src={shopImg}
                                alt="Shop"
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
                          {regImg ? (
                            <a href={regImg} target="_blank" rel="noreferrer">
                              <img
                                src={regImg}
                                alt="Registration Form"
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
                          {workProof ? (
                            <a
                              href={workProof}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm btn-outline-info"
                            >
                              View Proof
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

      {/* DETAIL MODAL WITH EXACT 12 BDO LABELS */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            BDO Report Details (BDO अहवाल तपशील)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {selectedReport && (
            <div className="row g-3">
              <div className="col-md-6">
                <strong>1 Date(दिनांक):</strong>
                <div>{formatDate(getReportDateValue(selectedReport))}</div>
              </div>
              <div className="col-md-6">
                <strong>2 BDO Full Name (BDO चे पूर्ण नाव):</strong>
                <div>{getValue(selectedReport, "name", "name")}</div>
              </div>
              <div className="col-md-6">
                <strong>3 Designation (पद):</strong>
                <div>{getValue(selectedReport, "designation", "designation")}</div>
              </div>
              <div className="col-md-6">
                <strong>4 Taluka Name (तालुक्याचे नाव):</strong>
                <div>{getValue(selectedReport, "taluka", "taluka")}</div>
              </div>
              <div className="col-md-6">
                <strong>5 District Name (जिल्ह्याचे नाव):</strong>
                <div>{getValue(selectedReport, "district", "district")}</div>
              </div>
              <div className="col-md-6">
                <strong>6 Mobile Number (मोबाईल नंबर):</strong>
                <div>{getValue(selectedReport, "mobileNumber", "mobile_number")}</div>
              </div>
              <div className="col-md-6">
                <strong>7 Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या):</strong>
                <div>{getValue(selectedReport, "totalShopsVisitedToday", "total_shops_visited_today", "0")}</div>
              </div>
              <div className="col-md-6">
                <strong>8 Total Amount Collected from Today’s Panel Registrations (आजच्या Panel Registration मधून जमा  झालेली एकूण रक्कम):</strong>
                <div className="fw-bold text-success">
                  ₹{getValue(selectedReport, "totalPanelRegistrationAmount", "total_panel_registration_amount", "0")}
                </div>
              </div>
              <div className="col-md-6">
                <strong>9 Payment Mode (पेमेंट पद्धत):</strong>
                <div>{getValue(selectedReport, "paymentMode", "payment_mode", "Cash")}</div>
              </div>
              <div className="col-md-6">
                <strong>Status:</strong>
                <div>{getValue(selectedReport, "status", "status", "active")}</div>
              </div>

              <div className="col-md-6">
                <strong>10 Shop Photo (दुकानाचा फोटो):</strong>
                <div className="mt-2">
                  {getMediaUrl(selectedReport.shop_photo || selectedReport.shopPhoto) ? (
                    <a
                      href={getMediaUrl(selectedReport.shop_photo || selectedReport.shopPhoto)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getMediaUrl(selectedReport.shop_photo || selectedReport.shopPhoto)}
                        alt="Shop"
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
                <strong>11 Photo of the Shopkeeper’s Registration Form (दुकानदाराच्या Registration Form चा फोटो):</strong>
                <div className="mt-2">
                  {getMediaUrl(selectedReport.shopkeeper_registration_photo || selectedReport.shopkeeperRegistrationPhoto) ? (
                    <a
                      href={getMediaUrl(selectedReport.shopkeeper_registration_photo || selectedReport.shopkeeperRegistrationPhoto)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getMediaUrl(selectedReport.shopkeeper_registration_photo || selectedReport.shopkeeperRegistrationPhoto)}
                        alt="Registration Form"
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

              <div className="col-12">
                <strong>12 Today’s Work Photo / Video Proof (आजच्या कामाचे Photo / Video Proof):</strong>
                <div className="mt-2">
                  {getMediaUrl(selectedReport.work_photo_video || selectedReport.workPhotoVideo) ? (
                    <a
                      href={getMediaUrl(selectedReport.work_photo_video || selectedReport.workPhotoVideo)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-primary"
                    >
                      Open Work Photo / Video Proof
                    </a>
                  ) : (
                    "No proof uploaded"
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

      {/* EDIT MODAL WITH EXACT 12 BDO FIELDS */}
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
            Edit BDO Report (BDO अहवाल संपादित करा)
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveEdit}>
          <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">1 Date(दिनांक)</Form.Label>
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
                  <Form.Label className="fw-semibold">2 BDO Full Name (BDO चे पूर्ण नाव)</Form.Label>
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
                  <Form.Label className="fw-semibold">3 Designation (पद)</Form.Label>
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
                  <Form.Label className="fw-semibold">4 Taluka Name (तालुक्याचे नाव)</Form.Label>
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
                  <Form.Label className="fw-semibold">5 District Name (जिल्ह्याचे नाव)</Form.Label>
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
                  <Form.Label className="fw-semibold">6 Mobile Number (मोबाईल नंबर)</Form.Label>
                  <Form.Control
                    name="mobile_number"
                    value={editForm.mobile_number}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    7 Total Number of Shops Visited Today (आज प्रत्यक्ष भेट दिलेल्या दुकानांची एकूण संख्या)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    name="total_shops_visited_today"
                    value={editForm.total_shops_visited_today}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    8 Total Amount Collected from Today’s Panel Registrations (आजच्या Panel Registration मधून जमा  झालेली एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    name="total_panel_registration_amount"
                    value={editForm.total_panel_registration_amount}
                    onChange={handleEditChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    9 Payment Mode (पेमेंट पद्धत)
                  </Form.Label>
                  <Form.Select
                    name="payment_mode"
                    value={editForm.payment_mode}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Online">Online</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </Form.Select>
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

export default TrainerReport;
