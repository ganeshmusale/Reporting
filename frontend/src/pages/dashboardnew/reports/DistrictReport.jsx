import React, { useEffect, useState } from "react";
import { Alert, Button, Spinner, Modal, Form, Row, Col } from "react-bootstrap";
import * as XLSX from "xlsx";
import { API_BASE_URL as ROOT_API_URL, BACKEND_ROOT_URL } from "../../../config/api";

// =========================================================
// API CONFIG
// =========================================================

const API_BASE_URL = `${ROOT_API_URL}/district-reports`;
const API_ORIGIN = BACKEND_ROOT_URL;

// =========================================================
// IMAGE URL
// =========================================================

const getImageUrl = (image) => {
  if (!image) return null;

  let value = String(image).trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  value = value.replace(/\\/g, "/").replace(/^\/+/, "");
  value = value.replace(/^api\//i, "");

  if (value.toLowerCase().startsWith("uploads/")) {
    return `${API_ORIGIN}/${value}`;
  }

  if (value.toLowerCase().startsWith("district-reports/")) {
    return `${API_ORIGIN}/uploads/${value}`;
  }

  return `${API_ORIGIN}/uploads/district-reports/${encodeURIComponent(value)}`;
};

// =========================================================
// DATE FORMAT
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
// MAIN COMPONENT: SSWF DISTRICT DAILY REPORT FORM (ADMIN)
// =========================================================

const DistrictReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [nameFilter, setNameFilter] = useState("");
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
    district: "",
    mobile_number: "",
    report_date: "",
    total_authorised_center_heads_300_to_500: "",
    total_active_center_heads: "",
    machine1_camp_name: "",
    machine1_test_amount: "",
    machine1_medicine_amount: "",
    machine1_total_amount: "",
    machine2_camp_name: "",
    machine2_test_amount: "",
    machine2_medicine_amount: "",
    machine2_total_amount: "",
    utr_number: "",
    additional_remarks: "",
  });

  const [editPhoto1, setEditPhoto1] = useState(null);
  const [editPhoto2, setEditPhoto2] = useState(null);
  const [previewPhoto1, setPreviewPhoto1] = useState(null);
  const [previewPhoto2, setPreviewPhoto2] = useState(null);

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
        throw new Error(data.message || "Failed to load district reports");
      }

      const rows = data.reports || data.data || [];
      setReports(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("DISTRICT REPORT FETCH ERROR:", err);
      setError(err.message || "Failed to load district reports.");
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
    setSuccess("District reports refreshed successfully.");
  };

  const filteredReports = reports.filter((report) => {
    const name = String(getValue(report, "name", "name", "")).toLowerCase();
    const district = String(getValue(report, "district", "district", "")).toLowerCase();
    const reportDate = getReportDateValue(report);

    const matchesName = !nameFilter.trim() || name.includes(nameFilter.trim().toLowerCase());
    const matchesDistrict = !districtFilter.trim() || district.includes(districtFilter.trim().toLowerCase());
    const matchesDate = !dateFilter || reportDate === dateFilter;

    return matchesName && matchesDistrict && matchesDate;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, districtFilter, dateFilter]);

  const totalRecords = filteredReports.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentReports = filteredReports.slice(startIndex, endIndex);

  const clearFilters = () => {
    setNameFilter("");
    setDistrictFilter("");
    setDateFilter("");
    setCurrentPage(1);
  };

  const isFilterActive =
    nameFilter.trim() !== "" ||
    districtFilter.trim() !== "" ||
    dateFilter !== "";

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const handleEditReport = (report) => {
    setEditingId(report.id);
    setEditForm({
      name: report.name || "",
      designation: report.designation || "",
      district: report.district || "",
      mobile_number: report.mobile_number || report.mobileNumber || "",
      report_date: (report.report_date || report.reportDate || "").split("T")[0],
      total_authorised_center_heads_300_to_500:
        report.total_authorised_center_heads_300_to_500 ??
        report.totalAuthorisedCenterHeads300To500 ??
        "",
      total_active_center_heads:
        report.total_active_center_heads ?? report.totalActiveCenterHeads ?? "",
      machine1_camp_name: report.machine1_camp_name || report.machine1CampName || "",
      machine1_test_amount: report.machine1_test_amount ?? report.machine1TestAmount ?? "",
      machine1_medicine_amount: report.machine1_medicine_amount ?? report.machine1MedicineAmount ?? "",
      machine1_total_amount: report.machine1_total_amount ?? report.machine1TotalAmount ?? "",
      machine2_camp_name: report.machine2_camp_name || report.machine2CampName || "",
      machine2_test_amount: report.machine2_test_amount ?? report.machine2TestAmount ?? "",
      machine2_medicine_amount: report.machine2_medicine_amount ?? report.machine2MedicineAmount ?? "",
      machine2_total_amount: report.machine2_total_amount ?? report.machine2TotalAmount ?? "",
      utr_number: report.utr_number || report.utrNumber || "",
      additional_remarks: report.additional_remarks || report.additionalRemarks || "",
    });
    setEditPhoto1(null);
    setEditPhoto2(null);
    setPreviewPhoto1(
      getImageUrl(
        report.machine1_camp_photo ||
          report.machine1CampPhoto ||
          report.meeting_photo_1 ||
          report.meetingPhoto1 ||
          ""
      )
    );
    setPreviewPhoto2(
      getImageUrl(
        report.machine2_camp_photo ||
          report.machine2CampPhoto ||
          report.meeting_photo_2 ||
          report.meetingPhoto2 ||
          ""
      )
    );
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "machine1_test_amount" || name === "machine1_medicine_amount") {
        const test = parseFloat(name === "machine1_test_amount" ? value : next.machine1_test_amount) || 0;
        const med = parseFloat(name === "machine1_medicine_amount" ? value : next.machine1_medicine_amount) || 0;
        next.machine1_total_amount = (test + med).toString();
      }
      if (name === "machine2_test_amount" || name === "machine2_medicine_amount") {
        const test = parseFloat(name === "machine2_test_amount" ? value : next.machine2_test_amount) || 0;
        const med = parseFloat(name === "machine2_medicine_amount" ? value : next.machine2_medicine_amount) || 0;
        next.machine2_total_amount = (test + med).toString();
      }
      return next;
    });
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (field === "machine1_camp_photo") {
        setEditPhoto1(file);
        setPreviewPhoto1(URL.createObjectURL(file));
      } else {
        setEditPhoto2(file);
        setPreviewPhoto2(URL.createObjectURL(file));
      }
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const fd = new FormData();
      Object.keys(editForm).forEach((k) => {
        if (editForm[k] !== null && editForm[k] !== undefined) {
          fd.append(k, editForm[k]);
        }
      });

      const res = await fetch(`${API_BASE_URL}/${editingId}`, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to update report");
      }
      setSuccess("District report updated successfully.");
      setShowEditModal(false);
      await fetchReports();
    } catch (err) {
      console.error("EDIT DISTRICT REPORT ERROR:", err);
      setError(err.message || "Failed to update district report.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("Are you sure you want to delete this district report?")) return;
    try {
      setDeletingId(id);
      setError("");
      setSuccess("");
      const res = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || "Failed to delete report");
      }
      setSuccess("District report deleted successfully.");
      await fetchReports();
    } catch (err) {
      console.error("DELETE DISTRICT REPORT ERROR:", err);
      setError(err.message || "Failed to delete district report.");
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
      "Name(नाव)",
      "Designation(पद)",
      "District (जिल्हा)",
      "Mobile Number (मोबाईल क्रमांक)",
      "Report Date (अहवालाची तारीख)",
      "Total authourised center Head 300 to 500 (अधिकृत केंद्र प्रमुखांची एकूण संख्या (३०० ते ५००)",
      "Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)",
      "Today's Machine-1 Camp Name आजच्या मशीन 1 शिबिराचे नाव",
      "Today's Machine-1 Total Test Amount (₹) आजची मशीन 1 तपासणीची एकूण रक्कम (₹)",
      "Today's Machine-1 Total Medicine Amount (₹) आजची मशीन 1 औषधांची एकूण रक्कम (₹)",
      "Today's Machine-1 Total Amount (₹) आजची मशीन 1 एकूण रक्कम (₹)",
      "Today's Machine-2 Camp Name (आजच्या मशीन 2 शिबिराचे नाव )",
      "Today's Machine-2 Total Test Amount (₹) आजची मशीन 2 तपासणीची एकूण रक्कम (₹)",
      "Today's Machine-2 Total Medicine Amount (₹) (आजची मशीन 2 औषधांची एकूण रक्कम (₹))",
      "Today's Machine-2 Total Amount (₹) (आजची मशीन 2 एकूण रक्कम (₹) )",
      "Machine 1 and Machine-2 UTR Number( मशीन 1 आणि मशीन 2 च्या व्यवहारांचे UTR क्रमांक)",
      "Additional Remarks (इतर माहिती)",
      "Machine 1camp photo (मशीन 1 च्या शिबिराचा फोटो)",
      "Machine 2 Camp photo (मशीन 2च्या शिबिराचा फोटो)",
      "Status",
    ];

    const rows = filteredReports.map((report, index) => [
      index + 1,
      getValue(report, "name", "name", ""),
      getValue(report, "designation", "designation", ""),
      getValue(report, "district", "district", ""),
      getValue(report, "mobileNumber", "mobile_number", ""),
      formatDate(getReportDateValue(report)),
      getValue(
        report,
        "totalAuthorisedCenterHeads300To500",
        "total_authorised_center_heads_300_to_500",
        getValue(report, "totalAuthorisedCenterHeads", "total_authorised_center_heads", "0")
      ),
      getValue(report, "totalActiveCenterHeads", "total_active_center_heads", "0"),
      getValue(report, "machine1CampName", "machine1_camp_name", "-"),
      getValue(report, "machine1TestAmount", "machine1_test_amount", "0"),
      getValue(report, "machine1MedicineAmount", "machine1_medicine_amount", "0"),
      getValue(report, "machine1TotalAmount", "machine1_total_amount", "0"),
      getValue(report, "machine2CampName", "machine2_camp_name", "-"),
      getValue(report, "machine2TestAmount", "machine2_test_amount", "0"),
      getValue(report, "machine2MedicineAmount", "machine2_medicine_amount", "0"),
      getValue(report, "machine2TotalAmount", "machine2_total_amount", "0"),
      getValue(report, "utrNumber", "utr_number", ""),
      getValue(
        report,
        "additionalRemarks",
        "additional_remarks",
        getValue(report, "anyOtherInformation", "any_other_information", "-")
      ),
      getImageUrl(
        getValue(
          report,
          "machine1CampPhoto",
          "machine1_camp_photo",
          getValue(report, "meetingPhoto1", "meeting_photo_1", "")
        )
      ) || "",
      getImageUrl(
        getValue(
          report,
          "machine2CampPhoto",
          "machine2_camp_photo",
          getValue(report, "meetingPhoto2", "meeting_photo_2", "")
        )
      ) || "",
      getValue(report, "status", "status", "active"),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "District Reports");
    XLSX.writeFile(
      workbook,
      `District_Reports_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    setSuccess("District reports exported to Excel successfully.");
  };

  return (
    <div className="district-report-page">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            SSWF District Daily Report Form (एसएसडब्ल्यूएफ जिल्हा दैनंदिन अहवाल फॉर्म)
          </h4>
          <p className="text-muted mb-0">View, search, and manage all district reports</p>
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
              <small className="text-muted">Total Filtered District Reports</small>
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
              <label className="form-label fw-semibold">Name(नाव)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search Name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
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
              style={{ minWidth: "3200px" }}
            >
              <thead className="table-light">
                <tr>
                  <th className="text-center" style={{ width: "60px" }}>
                    SR
                  </th>
                  <th style={{ minWidth: "180px" }}>Name(नाव)</th>
                  <th style={{ minWidth: "150px" }}>Designation(पद)</th>
                  <th style={{ minWidth: "130px" }}>District (जिल्हा)</th>
                  <th style={{ minWidth: "150px" }}>Mobile Number (मोबाईल क्रमांक)</th>
                  <th style={{ minWidth: "140px" }}>Report Date (अहवालाची तारीख)</th>
                  <th className="text-center" style={{ minWidth: "260px" }}>
                    Total authourised center Head 300 to 500 (अधिकृत केंद्र प्रमुखांची एकूण संख्या (३०० ते ५००)
                  </th>
                  <th className="text-center" style={{ minWidth: "180px" }}>
                    Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)
                  </th>
                  <th style={{ minWidth: "230px" }}>
                    Today's Machine-1 Camp Name आजच्या मशीन 1 शिबिराचे नाव
                  </th>
                  <th className="text-center" style={{ minWidth: "200px" }}>
                    Today's Machine-1 Total Test Amount (₹)  आजची मशीन 1 तपासणीची एकूण रक्कम (₹)
                  </th>
                  <th className="text-center" style={{ minWidth: "220px" }}>
                    Today's Machine-1 Total Medicine Amount (₹) आजची मशीन 1 औषधांची एकूण रक्कम (₹)
                  </th>
                  <th className="text-center" style={{ minWidth: "200px" }}>
                    Today's Machine-1 Total Amount (₹)  आजची मशीन 1 एकूण रक्कम (₹)
                  </th>
                  <th style={{ minWidth: "230px" }}>
                    Today's Machine-2 Camp Name (आजच्या मशीन 2 शिबिराचे नाव )
                  </th>
                  <th className="text-center" style={{ minWidth: "200px" }}>
                    Today's Machine-2 Total Test Amount (₹)  आजची मशीन 2 तपासणीची एकूण रक्कम (₹)
                  </th>
                  <th className="text-center" style={{ minWidth: "220px" }}>
                    Today's Machine-2 Total Medicine Amount (₹) (आजची मशीन 2 औषधांची एकूण रक्कम (₹))
                  </th>
                  <th className="text-center" style={{ minWidth: "200px" }}>
                    Today's Machine-2 Total Amount (₹) (आजची मशीन 2 एकूण रक्कम (₹) )
                  </th>
                  <th style={{ minWidth: "220px" }}>
                    Machine 1 and Machine-2 UTR Number( मशीन 1 आणि मशीन 2 च्या व्यवहारांचे UTR क्रमांक)
                  </th>
                  <th style={{ minWidth: "260px" }}>
                    Additional Remarks (इतर माहिती)
                  </th>
                  <th className="text-center" style={{ minWidth: "150px" }}>
                    Machine 1camp photo (मशीन 1 च्या शिबिराचा फोटो)
                  </th>
                  <th className="text-center" style={{ minWidth: "150px" }}>
                    Machine 2 Camp photo (मशीन 2च्या शिबिराचा फोटो)
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
                    <td colSpan="22" className="text-center py-5">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading district reports...
                    </td>
                  </tr>
                ) : totalRecords === 0 ? (
                  <tr>
                    <td colSpan="22" className="text-center py-5 text-muted">
                      No district reports found.
                    </td>
                  </tr>
                ) : (
                  currentReports.map((report, index) => {
                    const photo1 = getImageUrl(
                      getValue(
                        report,
                        "machine1CampPhoto",
                        "machine1_camp_photo",
                        getValue(report, "meetingPhoto1", "meeting_photo_1", "")
                      )
                    );
                    const photo2 = getImageUrl(
                      getValue(
                        report,
                        "machine2CampPhoto",
                        "machine2_camp_photo",
                        getValue(report, "meetingPhoto2", "meeting_photo_2", "")
                      )
                    );

                    return (
                      <tr key={report.id || index}>
                        <td className="text-center">{startIndex + index + 1}</td>
                        <td className="fw-semibold">{getValue(report, "name", "name")}</td>
                        <td>{getValue(report, "designation", "designation")}</td>
                        <td>{getValue(report, "district", "district")}</td>
                        <td>{getValue(report, "mobileNumber", "mobile_number")}</td>
                        <td>{formatDate(getReportDateValue(report))}</td>
                        <td className="text-center">
                          {getValue(
                            report,
                            "totalAuthorisedCenterHeads300To500",
                            "total_authorised_center_heads_300_to_500",
                            getValue(report, "totalAuthorisedCenterHeads", "total_authorised_center_heads", "0")
                          )}
                        </td>
                        <td className="text-center">
                          {getValue(report, "totalActiveCenterHeads", "total_active_center_heads", "0")}
                        </td>
                        <td>{getValue(report, "machine1CampName", "machine1_camp_name")}</td>
                        <td className="text-center">
                          {getValue(report, "machine1TestAmount", "machine1_test_amount", "0")}
                        </td>
                        <td className="text-center">
                          {getValue(report, "machine1MedicineAmount", "machine1_medicine_amount", "0")}
                        </td>
                        <td className="text-center fw-semibold">
                          ₹{getValue(report, "machine1TotalAmount", "machine1_total_amount", "0")}
                        </td>
                        <td>{getValue(report, "machine2CampName", "machine2_camp_name")}</td>
                        <td className="text-center">
                          {getValue(report, "machine2TestAmount", "machine2_test_amount", "0")}
                        </td>
                        <td className="text-center">
                          {getValue(report, "machine2MedicineAmount", "machine2_medicine_amount", "0")}
                        </td>
                        <td className="text-center fw-semibold">
                          ₹{getValue(report, "machine2TotalAmount", "machine2_total_amount", "0")}
                        </td>
                        <td>{getValue(report, "utrNumber", "utr_number")}</td>
                        <td>
                          {getValue(
                            report,
                            "additionalRemarks",
                            "additional_remarks",
                            getValue(report, "anyOtherInformation", "any_other_information", "-")
                          )}
                        </td>
                        <td className="text-center">
                          {photo1 ? (
                            <a href={photo1} target="_blank" rel="noreferrer">
                              <img
                                src={photo1}
                                alt="Machine 1 Photo"
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
                                alt="Machine 2 Photo"
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

      {/* DETAIL MODAL WITH EXACT MARATHI LABELS */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            District Report Details (जिल्हा अहवाल तपशील)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {selectedReport && (
            <div className="row g-3">
              <div className="col-md-6">
                <strong>Name(नाव):</strong>
                <div>{getValue(selectedReport, "name", "name")}</div>
              </div>
              <div className="col-md-6">
                <strong>Designation(पद):</strong>
                <div>{getValue(selectedReport, "designation", "designation")}</div>
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
                <strong>Total authourised center Head 300 to 500 (अधिकृत केंद्र प्रमुखांची एकूण संख्या (३०० ते ५००):</strong>
                <div>
                  {getValue(
                    selectedReport,
                    "totalAuthorisedCenterHeads300To500",
                    "total_authorised_center_heads_300_to_500",
                    getValue(selectedReport, "totalAuthorisedCenterHeads", "total_authorised_center_heads", "0")
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या):</strong>
                <div>{getValue(selectedReport, "totalActiveCenterHeads", "total_active_center_heads", "0")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-1 Camp Name आजच्या मशीन 1 शिबिराचे नाव:</strong>
                <div>{getValue(selectedReport, "machine1CampName", "machine1_camp_name")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-1 Total Test Amount (₹)  आजची मशीन 1 तपासणीची एकूण रक्कम (₹):</strong>
                <div>₹{getValue(selectedReport, "machine1TestAmount", "machine1_test_amount", "0")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-1 Total Medicine Amount (₹) आजची मशीन 1 औषधांची एकूण रक्कम (₹):</strong>
                <div>₹{getValue(selectedReport, "machine1MedicineAmount", "machine1_medicine_amount", "0")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-1 Total Amount (₹)  आजची मशीन 1 एकूण रक्कम (₹):</strong>
                <div className="fw-bold text-success">
                  ₹{getValue(selectedReport, "machine1TotalAmount", "machine1_total_amount", "0")}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-2 Camp Name (आजच्या मशीन 2 शिबिराचे नाव ):</strong>
                <div>{getValue(selectedReport, "machine2CampName", "machine2_camp_name")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-2 Total Test Amount (₹)  आजची मशीन 2 तपासणीची एकूण रक्कम (₹):</strong>
                <div>₹{getValue(selectedReport, "machine2TestAmount", "machine2_test_amount", "0")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-2 Total Medicine Amount (₹) (आजची मशीन 2 औषधांची एकूण रक्कम (₹)):</strong>
                <div>₹{getValue(selectedReport, "machine2MedicineAmount", "machine2_medicine_amount", "0")}</div>
              </div>
              <div className="col-md-6">
                <strong>Today's Machine-2 Total Amount (₹) (आजची मशीन 2 एकूण रक्कम (₹) ):</strong>
                <div className="fw-bold text-success">
                  ₹{getValue(selectedReport, "machine2TotalAmount", "machine2_total_amount", "0")}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Machine 1 and Machine-2 UTR Number( मशीन 1 आणि मशीन 2 च्या व्यवहारांचे UTR क्रमांक):</strong>
                <div>{getValue(selectedReport, "utrNumber", "utr_number")}</div>
              </div>
              <div className="col-12">
                <strong>Additional Remarks (इतर माहिती):</strong>
                <div>
                  {getValue(
                    selectedReport,
                    "additionalRemarks",
                    "additional_remarks",
                    getValue(selectedReport, "anyOtherInformation", "any_other_information", "-")
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <strong>Machine 1camp photo (मशीन 1 च्या शिबिराचा फोटो):</strong>
                <div>
                  {getImageUrl(
                    getValue(
                      selectedReport,
                      "machine1CampPhoto",
                      "machine1_camp_photo",
                      getValue(selectedReport, "meetingPhoto1", "meeting_photo_1", "")
                    )
                  ) ? (
                    <a
                      href={getImageUrl(
                        getValue(
                          selectedReport,
                          "machine1CampPhoto",
                          "machine1_camp_photo",
                          getValue(selectedReport, "meetingPhoto1", "meeting_photo_1", "")
                        )
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getImageUrl(
                          getValue(
                            selectedReport,
                            "machine1CampPhoto",
                            "machine1_camp_photo",
                            getValue(selectedReport, "meetingPhoto1", "meeting_photo_1", "")
                          )
                        )}
                        alt="Machine 1 Photo"
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
                <strong>Machine 2 Camp photo (मशीन 2च्या शिबिराचा फोटो):</strong>
                <div>
                  {getImageUrl(
                    getValue(
                      selectedReport,
                      "machine2CampPhoto",
                      "machine2_camp_photo",
                      getValue(selectedReport, "meetingPhoto2", "meeting_photo_2", "")
                    )
                  ) ? (
                    <a
                      href={getImageUrl(
                        getValue(
                          selectedReport,
                          "machine2CampPhoto",
                          "machine2_camp_photo",
                          getValue(selectedReport, "meetingPhoto2", "meeting_photo_2", "")
                        )
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={getImageUrl(
                          getValue(
                            selectedReport,
                            "machine2CampPhoto",
                            "machine2_camp_photo",
                            getValue(selectedReport, "meetingPhoto2", "meeting_photo_2", "")
                          )
                        )}
                        alt="Machine 2 Photo"
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

      {/* EDIT MODAL WITH EXACT MARATHI LABELS */}
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
            Edit District Report (जिल्हा अहवाल संपादित करा)
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveEdit}>
          <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Name(नाव)</Form.Label>
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
                  <Form.Label className="fw-semibold">Designation(पद)</Form.Label>
                  <Form.Control
                    name="designation"
                    value={editForm.designation}
                    onChange={handleEditChange}
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
                    Total authourised center Head 300 to 500 (अधिकृत केंद्र प्रमुखांची एकूण संख्या (३०० ते ५००)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="total_authorised_center_heads_300_to_500"
                    value={editForm.total_authorised_center_heads_300_to_500}
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
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Camp Name आजच्या मशीन 1 शिबिराचे नाव
                  </Form.Label>
                  <Form.Control
                    name="machine1_camp_name"
                    value={editForm.machine1_camp_name}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Total Test Amount (₹)  आजची मशीन 1 तपासणीची एकूण रक्कम (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine1_test_amount"
                    value={editForm.machine1_test_amount}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Total Medicine Amount (₹) आजची मशीन 1 औषधांची एकूण रक्कम (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine1_medicine_amount"
                    value={editForm.machine1_medicine_amount}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Total Amount (₹)  आजची मशीन 1 एकूण रक्कम (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine1_total_amount"
                    value={editForm.machine1_total_amount}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Camp Name (आजच्या मशीन 2 शिबिराचे नाव )
                  </Form.Label>
                  <Form.Control
                    name="machine2_camp_name"
                    value={editForm.machine2_camp_name}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Total Test Amount (₹)  आजची मशीन 2 तपासणीची एकूण रक्कम (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine2_test_amount"
                    value={editForm.machine2_test_amount}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Total Medicine Amount (₹) (आजची मशीन 2 औषधांची एकूण रक्कम (₹))
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine2_medicine_amount"
                    value={editForm.machine2_medicine_amount}
                    onChange={handleEditChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Total Amount (₹) (आजची मशीन 2 एकूण रक्कम (₹) )
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine2_total_amount"
                    value={editForm.machine2_total_amount}
                    readOnly
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Machine 1 and Machine-2 UTR Number( मशीन 1 आणि मशीन 2 च्या व्यवहारांचे UTR क्रमांक)
                  </Form.Label>
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

export default DistrictReport;
