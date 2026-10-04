import React, { useEffect, useState } from "react";
import { Button, Form, Modal, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { API_BASE_URL as ROOT_API_URL, BACKEND_ROOT_URL } from "../../config/api";

const API_BASE_URL = `${ROOT_API_URL}/district-reports`;
const API_ORIGIN = BACKEND_ROOT_URL;

const FILE_PREVIEW_URLS = new WeakMap();

const EMPTY_FORM = {
  name: "",
  designation: "",
  taluka: "",
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
  machine1_camp_photo: null,
  machine2_camp_photo: null,
};

const getTodayForInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDateForTable = (date) => {
  if (!date) return "-";
  const str = String(date).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${d}/${m}/${y}`;
  }
  return date;
};

const formatDateForInput = (date) => {
  if (!date) return "";
  const str = String(date).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/");
    return `${y}-${m}-${d}`;
  }
  return "";
};

const getImageUrl = (image) => {
  if (!image) return null;

  if (image instanceof File) {
    const cached = FILE_PREVIEW_URLS.get(image);
    if (cached) return cached;
    const url = URL.createObjectURL(image);
    FILE_PREVIEW_URLS.set(image, url);
    return url;
  }

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

const DistrictDashboard = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({
    name: "",
    taluka: "",
    district: "",
    report_date: "",
  });

  const loggedInDistrictName =
    localStorage.getItem("logged_in_district_name") ||
    localStorage.getItem("logged_in_name") ||
    "District User";

  const getDistrictUserId = () => {
    // Only the login user_id — never district table PK
    return localStorage.getItem("logged_in_user_id") || "";
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setError("");

      const role = (localStorage.getItem("logged_in_role") || "").toLowerCase();
      const isAdmin = role === "admin" || role === "superadmin";
      const userId = getDistrictUserId();
      const mobile = localStorage.getItem("logged_in_mobile") || "";
      const userName = localStorage.getItem("logged_in_name") || "";

      const params = new URLSearchParams();
      params.set("role", role || (isAdmin ? "admin" : "district"));
      if (!isAdmin) {
        if (userId) params.set("user_id", userId);
        if (mobile) params.set("mobile_number", mobile);
        if (userName) params.set("user_name", userName);
      }

      const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load reports");
      }

      const rows = data.reports || data.data || [];
      const list = Array.isArray(rows) ? rows : [];

      if (isAdmin) {
        setReports(list);
      } else {
        const myId = String(userId || "").trim().toLowerCase();
        const myMobile = String(mobile || "").trim();
        const myName = String(userName || "").trim().toLowerCase();

        const myReports = list.filter((r) => {
          const rUid = String(r?.user_id || r?.created_by_id || "").trim().toLowerCase();

          // Owned row → must match logged-in user_id exactly
          if (rUid) {
            return Boolean(myId) && rUid === myId;
          }

          // Legacy unowned row → created_by or mobile only (never form name)
          const rCreatedBy = String(r?.created_by || "").trim().toLowerCase();
          if (myName && rCreatedBy && rCreatedBy === myName) return true;

          const rMobile = String(r?.mobile_number || r?.mobileNumber || "").trim();
          if (myMobile && rMobile && rMobile === myMobile) return true;

          return false;
        });
        setReports(myReports);
      }
    } catch (err) {
      console.error("Report loading error:", err);
      setError(err.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleChange = (e) => {
    const { name, value, files, type } = e.target;

    if (type === "file") {
      const newFile = files?.[0] || null;
      setFormData((prev) => ({
        ...prev,
        [name]: newFile,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddReport = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_FORM,
      report_date: getTodayForInput(),
      name: localStorage.getItem("logged_in_name") || "",
      taluka: localStorage.getItem("logged_in_taluka_name") || "",
      district: localStorage.getItem("logged_in_district_name") || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleEdit = (report) => {
    setEditingId(report.id);
    setFormData({
      name: report.name || "",
      designation: report.designation || "",
      taluka: report.taluka || "",
      district: report.district || "",
      mobile_number: report.mobile_number || report.mobileNumber || "",
      report_date: formatDateForInput(report.report_date || report.reportDate),
      total_authorised_center_heads_300_to_500:
        report.total_authorised_center_heads_300_to_500 ??
        report.totalAuthorisedCenterHeads ??
        "",
      total_active_center_heads:
        report.total_active_center_heads ??
        report.totalActiveCenterHeads ??
        "",
      machine1_camp_name: report.machine1_camp_name || "",
      machine1_test_amount: report.machine1_test_amount ?? "",
      machine1_medicine_amount: report.machine1_medicine_amount ?? "",
      machine1_total_amount: report.machine1_total_amount ?? "",
      machine2_camp_name: report.machine2_camp_name || "",
      machine2_test_amount: report.machine2_test_amount ?? "",
      machine2_medicine_amount: report.machine2_medicine_amount ?? "",
      machine2_total_amount: report.machine2_total_amount ?? "",
      utr_number: report.utr_number || report.utrNumber || "",
      additional_remarks:
        report.additional_remarks ||
        report.additionalRemarks ||
        "",
      machine1_camp_photo: report.machine1_camp_photo || null,
      machine2_camp_photo: report.machine2_camp_photo || null,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("नाव (Name) आवश्यक आहे.");
      return;
    }

    if (!formData.report_date) {
      setError("अहवालाची तारीख (Report Date) आवश्यक आहे.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const userId = getDistrictUserId();
      const formPayload = new FormData();

      if (userId) {
        formPayload.append("user_id", userId);
        formPayload.append("created_by_id", userId);
        formPayload.append("updated_by_id", userId);
      }

      formPayload.append("role", "district");
      formPayload.append("created_by_role", "district");
      formPayload.append(
        "created_by",
        String(
          localStorage.getItem("logged_in_name") ||
          formData.name ||
          ""
        ).trim()
      );
      formPayload.append(
        "updated_by",
        String(
          localStorage.getItem("logged_in_name") ||
          formData.name ||
          ""
        ).trim()
      );

      formPayload.append("name", formData.name.trim());
      formPayload.append("designation", formData.designation.trim());
      formPayload.append("taluka", (formData.taluka || "").trim());
      formPayload.append("district", formData.district.trim());
      formPayload.append("mobile_number", formData.mobile_number.trim());
      formPayload.append("report_date", formData.report_date);

      formPayload.append(
        "total_authorised_center_heads_300_to_500",
        formData.total_authorised_center_heads_300_to_500 || "0"
      );
      formPayload.append(
        "total_active_center_heads",
        formData.total_active_center_heads || "0"
      );
      formPayload.append("machine1_camp_name", formData.machine1_camp_name || "");
      formPayload.append("machine1_test_amount", formData.machine1_test_amount || "0");
      formPayload.append("machine1_medicine_amount", formData.machine1_medicine_amount || "0");
      formPayload.append("machine1_total_amount", formData.machine1_total_amount || "0");
      formPayload.append("machine2_camp_name", formData.machine2_camp_name || "");
      formPayload.append("machine2_test_amount", formData.machine2_test_amount || "0");
      formPayload.append("machine2_medicine_amount", formData.machine2_medicine_amount || "0");
      formPayload.append("machine2_total_amount", formData.machine2_total_amount || "0");
      formPayload.append("utr_number", formData.utr_number || "");
      formPayload.append("additional_remarks", formData.additional_remarks || "");

      const url = editingId
        ? `${API_BASE_URL}/${editingId}`
        : API_BASE_URL;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formPayload,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save district report");
      }

      setSuccess(
        editingId
          ? "District report updated successfully!"
          : "District report added successfully!"
      );

      handleClose();
      await loadReports();
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save district report.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    Swal.fire({
      title: "Delete Confirmation",
      text: "Are you sure you want to delete this district report?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    }).then(async (res) => {
      if (res.isConfirmed) {
        try {
          const userId = getDistrictUserId();
          const url = userId
            ? `${API_BASE_URL}/${id}?user_id=${encodeURIComponent(userId)}`
            : `${API_BASE_URL}/${id}`;

          const response = await fetch(url, {
            method: "DELETE",
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || "Failed to delete report");
          }

          setSuccess("District report deleted successfully!");
          await loadReports();
        } catch (err) {
          console.error("Delete error:", err);
          setError(err.message || "Failed to delete report.");
        }
      }
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: "Logout Confirmation",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Logout",
      cancelButtonText: "Cancel",
    }).then((res) => {
      if (res.isConfirmed) {
        localStorage.clear();
        navigate("/login", { replace: true });
      }
    });
  };

  const normalize = (value) =>
    value === null || value === undefined
      ? ""
      : String(value).trim().toLowerCase();

  const filteredReports = reports.filter((report) => {
    const globalKeyword = normalize(search);
    const nameKeyword = normalize(filters.name);
    const talukaKeyword = normalize(filters.taluka);
    const districtKeyword = normalize(filters.district);
    const dateKeyword = filters.report_date.trim();

    const matchesGlobal =
      !globalKeyword ||
      [
        report?.name,
        report?.designation,
        report?.taluka,
        report?.district,
        report?.mobile_number,
        report?.mobileNumber,
        report?.utr_number,
        report?.utrNumber,
        report?.visited_center_head_name,
      ].some((val) => normalize(val).includes(globalKeyword));

    const matchesName = !nameKeyword || normalize(report?.name).includes(nameKeyword);
    const matchesTaluka = !talukaKeyword || normalize(report?.taluka).includes(talukaKeyword);
    const matchesDistrict = !districtKeyword || normalize(report?.district).includes(districtKeyword);

    const rawDate = report?.report_date ?? report?.reportDate ?? "";
    const reportDate = String(rawDate).split("T")[0];
    const matchesDate = !dateKeyword || reportDate === dateKeyword;

    return matchesGlobal && matchesName && matchesTaluka && matchesDistrict && matchesDate;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setSearch("");
    setFilters({
      name: "",
      taluka: "",
      district: "",
      report_date: "",
    });
  };

  const downloadExcel = () => {
    if (!filteredReports.length) {
      setError("Download करण्यासाठी कोणताही report उपलब्ध नाही.");
      return;
    }

    const headers = [
      "SR",
      "Name(नाव)",
      "Designation(पद)",
      "Taluka (तालुका)",
      "District (जिल्हा)",
      "Mobile Number (मोबाईल क्रमांक)",
      "Report Date (अहवालाची तारीख)",
      "Total authourised center Head 300 to 500 (अधिकृत केंद्र प्रमुखांची एकूण संख्या (३०० ते ५००)",
      "Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)",
      "Today's Machine-1 Camp Name आजच्या मशीन 1 शिबिराचे नाव",
      "Today's Machine-1 Total Test Amount (₹)  आजची मशीन 1 तपासणीची एकूण रक्कम (₹)",
      "Today's Machine-1 Total Medicine Amount (₹) आजची मशीन 1 औषधांची एकूण रक्कम (₹)",
      "Today's Machine-1 Total Amount (₹)  आजची मशीन 1 एकूण रक्कम (₹)",
      "Today's Machine-2 Camp Name (आजच्या मशीन 2 शिबिराचे नाव )",
      "Today's Machine-2 Total Test Amount (₹)  आजची मशीन 2 तपासणीची एकूण रक्कम (₹)",
      "Today's Machine-2 Total Medicine Amount (₹) (आजची मशीन 2 औषधांची एकूण रक्कम (₹))",
      "Today's Machine-2 Total Amount (₹) (आजची मशीन 2 एकूण रक्कम (₹) )",
      "Machine 1 and Machine-2 UTR Number( मशीन 1 आणि मशीन 2 च्या व्यवहारांचे UTR क्रमांक)",
      "Additional Remarks (इतर माहिती)",
      "Status",
    ];

    const rows = filteredReports.map((r, idx) => [
      idx + 1,
      r.name || "-",
      r.designation || "-",
      r.taluka || "-",
      r.district || "-",
      r.mobile_number || r.mobileNumber || "-",
      formatDateForTable(r.report_date || r.reportDate),
      r.total_authorised_center_heads_300_to_500 ?? "0",
      r.total_active_center_heads ?? "0",
      r.machine1_camp_name || "-",
      r.machine1_test_amount ?? "0",
      r.machine1_medicine_amount ?? "0",
      r.machine1_total_amount ?? "0",
      r.machine2_camp_name || "-",
      r.machine2_test_amount ?? "0",
      r.machine2_medicine_amount ?? "0",
      r.machine2_total_amount ?? "0",
      r.utr_number || r.utrNumber || "-",
      r.additional_remarks || "-",
      r.status || "active",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((v) => `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`)
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `District_Reports_${getTodayForInput()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess("District reports downloaded successfully.");
  };

  return (
    <div className="district-dashboard-wrapper">
      {/* HEADER NAVBAR */}
      <header className="district-navbar bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center sticky-top shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <div
            className="bg-dark text-white rounded d-flex align-items-center justify-content-center fw-bold"
            style={{ width: "42px", height: "42px", fontSize: "16px" }}
          >
            D
          </div>
          <div>
            <h5 className="fw-bold mb-0">District Dashboard</h5>
            <small className="text-muted">{loggedInDistrictName}</small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <Button variant="dark" onClick={handleAddReport} className="fw-semibold shadow-sm">
            <span className="me-1">+</span> Add District
          </Button>

          <button
            type="button"
            className="btn btn-outline-danger d-flex align-items-center gap-2 fw-semibold"
            onClick={handleLogout}
            title="Logout"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="p-4" style={{ background: "#f8fafc", minHeight: "calc(100vh - 78px)" }}>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* COUNTER CARD */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-md-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="bg-dark text-white rounded d-flex align-items-center justify-content-center fw-bold"
                style={{ width: "56px", height: "56px", fontSize: "20px" }}
              >
                {reports.length}
              </div>
              <div>
                <small className="text-muted">Total District Reports</small>
                <h4 className="fw-bold mb-0">{reports.length}</h4>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-md-4">
            <div className="row g-3">
              <div className="col-12 col-md-6 col-xl-3">
                <Form.Label className="fw-semibold">Name (नाव)</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={filters.name}
                  onChange={handleFilterChange}
                  placeholder="Search Name..."
                />
              </div>

              <div className="col-12 col-md-6 col-xl-3">
                <Form.Label className="fw-semibold">Taluka (तालुका)</Form.Label>
                <Form.Control
                  type="text"
                  name="taluka"
                  value={filters.taluka}
                  onChange={handleFilterChange}
                  placeholder="Search Taluka..."
                />
              </div>

              <div className="col-12 col-md-6 col-xl-3">
                <Form.Label className="fw-semibold">District (जिल्हा)</Form.Label>
                <Form.Control
                  type="text"
                  name="district"
                  value={filters.district}
                  onChange={handleFilterChange}
                  placeholder="Search District..."
                />
              </div>

              <div className="col-12 col-md-6 col-xl-3">
                <Form.Label className="fw-semibold">Report Date (अहवालाची तारीख)</Form.Label>
                <Form.Control
                  type="date"
                  name="report_date"
                  value={filters.report_date}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="col-12">
                <div className="row g-2 align-items-end">
                  <div className="col-12 col-lg">
                    <Form.Label className="fw-semibold">Search</Form.Label>
                    <Form.Control
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by Name, Taluka, District, Mobile, UTR, Center Name..."
                    />
                  </div>

                  <div className="col-12 col-sm-auto">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      className="w-100"
                      onClick={clearFilters}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="col-12 col-sm-auto">
                    <Button
                      type="button"
                      variant="success"
                      className="w-100 fw-semibold"
                      onClick={downloadExcel}
                      disabled={!filteredReports.length}
                    >
                      Download Excel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle mb-0" style={{ minWidth: "3000px" }}>
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: "60px" }}>SR</th>
                    <th style={{ minWidth: "180px" }}>Name(नाव)</th>
                    <th style={{ minWidth: "150px" }}>Designation(पद)</th>
                    <th style={{ minWidth: "140px" }}>Taluka (तालुका)</th>
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
                    <th style={{ minWidth: "260px" }}>Additional Remarks (इतर माहिती)</th>
                    <th className="text-center" style={{ minWidth: "150px" }}>
                      Machine 1camp photo (मशीन 1 च्या शिबिराचा फोटो)
                    </th>
                    <th className="text-center" style={{ minWidth: "150px" }}>
                      Machine 2 Camp photo (मशीन 2च्या शिबिराचा फोटो)
                    </th>
                    <th className="text-center" style={{ minWidth: "100px" }}>Status</th>
                    <th className="text-center" style={{ minWidth: "140px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="23" className="text-center py-5">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading reports...
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan="23" className="text-center py-5 text-muted">
                        No district reports found.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report, index) => {
                      const photo1 = report.machine1_camp_photo;
                      const photo2 = report.machine2_camp_photo;

                      return (
                        <tr key={report.id}>
                          <td className="text-center">{index + 1}</td>
                          <td>{report.name || "-"}</td>
                          <td>{report.designation || "-"}</td>
                          <td>{report.taluka || "-"}</td>
                          <td>{report.district || "-"}</td>
                          <td>{report.mobile_number || report.mobileNumber || "-"}</td>
                          <td>{formatDateForTable(report.report_date || report.reportDate)}</td>
                          <td className="text-center">
                            {report.total_authorised_center_heads_300_to_500 ??
                              "0"}
                          </td>
                          <td className="text-center">{report.total_active_center_heads ?? "0"}</td>
                          <td>{report.machine1_camp_name || "-"}</td>
                          <td className="text-center">{report.machine1_test_amount ?? "0"}</td>
                          <td className="text-center">{report.machine1_medicine_amount ?? "0"}</td>
                          <td className="text-center">{report.machine1_total_amount ?? "0"}</td>
                          <td>{report.machine2_camp_name || "-"}</td>
                          <td className="text-center">{report.machine2_test_amount ?? "0"}</td>
                          <td className="text-center">{report.machine2_medicine_amount ?? "0"}</td>
                          <td className="text-center">{report.machine2_total_amount ?? "0"}</td>
                          <td>{report.utr_number || report.utrNumber || "-"}</td>
                          <td>{report.additional_remarks || "-"}</td>
                          <td className="text-center">
                            {photo1 ? (
                              <a href={getImageUrl(photo1)} target="_blank" rel="noreferrer">
                                <img
                                  src={getImageUrl(photo1)}
                                  alt="Photo 1"
                                  style={{
                                    width: "50px",
                                    height: "50px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                />
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-center">
                            {photo2 ? (
                              <a href={getImageUrl(photo2)} target="_blank" rel="noreferrer">
                                <img
                                  src={getImageUrl(photo2)}
                                  alt="Photo 2"
                                  style={{
                                    width: "50px",
                                    height: "50px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                  }}
                                />
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-success-subtle text-success">
                              {report.status || "active"}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-2 justify-content-center">
                              <Button
                                size="sm"
                                variant="outline-dark"
                                onClick={() => handleEdit(report)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleDelete(report.id)}
                              >
                                Delete
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
        </div>
      </main>

      {/* ADD / EDIT DISTRICT REPORT MODAL WITH EXACT MARATHI LABELS */}
      <Modal
        show={showModal}
        onHide={handleClose}
        centered
        size="xl"
        backdrop="static"
      >
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              {editingId !== null ? "Edit District Report" : "Add District Report (अहवाल जोडा)"}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
            <div className="row g-3">
              {/* 1. Name (नाव) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Name (नाव) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="नाव प्रविष्ट करा"
                    required
                  />
                </Form.Group>
              </div>

              {/* 2. Designation ( पद) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Designation ( पद)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="पद प्रविष्ट करा"
                  />
                </Form.Group>
              </div>

              {/* 3. Taluka (तालुका) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Taluka (तालुका)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="taluka"
                    value={formData.taluka}
                    onChange={handleChange}
                    placeholder="तालुका प्रविष्ट करा"
                  />
                </Form.Group>
              </div>

              {/* 4. District (जिल्हा) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    District (जिल्हा)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="जिल्हा प्रविष्ट करा"
                  />
                </Form.Group>
              </div>

              {/* 4. Mobile Number (मोबाईल क्रमांक) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Mobile Number (मोबाईल क्रमांक)
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    placeholder="१० अंकी मोबाईल क्रमांक प्रविष्ट करा"
                    maxLength="10"
                  />
                </Form.Group>
              </div>

              {/* 5. Report Date (अहवालाची तारीख) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Report Date (अहवालाची तारीख) <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="report_date"
                    value={formData.report_date}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>

              {/* 6. Total authourised center Head 300 to 500(अधिकृत केंद्र प्रमुखांची एकूण संख्या ३०० ते ५००) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total authourised center Head 300 to 500(अधिकृत केंद्र प्रमुखांची एकूण संख्या ३०० ते ५००)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="total_authorised_center_heads_300_to_500"
                    value={formData.total_authorised_center_heads_300_to_500}
                    onChange={handleChange}
                    placeholder="संख्या प्रविष्ट करा"
                    min="0"
                  />
                </Form.Group>
              </div>

              {/* 7. Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या) */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Total Active center Head (सक्रिय केंद्र प्रमुखांची एकूण संख्या)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="total_active_center_heads"
                    value={formData.total_active_center_heads}
                    onChange={handleChange}
                    placeholder="संख्या प्रविष्ट करा"
                    min="0"
                  />
                </Form.Group>
              </div>

              {/* 9. Today's Machine-1 Camp Name */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Camp Name (आजच्या मशीन 1 शिबिराचे नाव)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="machine1_camp_name"
                    value={formData.machine1_camp_name}
                    onChange={handleChange}
                    placeholder="मशीन 1 शिबिराचे नाव"
                  />
                </Form.Group>
              </div>

              {/* 10. Machine-1 Test Amount */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Total Test Amount (₹) (आजची मशीन 1 तपासणीची एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine1_test_amount"
                    value={formData.machine1_test_amount}
                    onChange={handleChange}
                    placeholder="₹"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>

              {/* 11. Machine-1 Medicine Amount */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Total Medicine Amount (₹) (आजची मशीन 1 औषधांची एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine1_medicine_amount"
                    value={formData.machine1_medicine_amount}
                    onChange={handleChange}
                    placeholder="₹"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>

              {/* 12. Machine-1 Total Amount */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-1 Total Amount (₹) (आजची मशीन 1 एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine1_total_amount"
                    value={formData.machine1_total_amount}
                    onChange={handleChange}
                    placeholder="₹"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>

              {/* 13. Machine-2 Camp Name */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Camp Name (आजच्या मशीन 2 शिबिराचे नाव)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="machine2_camp_name"
                    value={formData.machine2_camp_name}
                    onChange={handleChange}
                    placeholder="मशीन 2 शिबिराचे नाव"
                  />
                </Form.Group>
              </div>

              {/* 14. Machine-2 Test Amount */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Total Test Amount (₹) (आजची मशीन 2 तपासणीची एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine2_test_amount"
                    value={formData.machine2_test_amount}
                    onChange={handleChange}
                    placeholder="₹"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>

              {/* 15. Machine-2 Medicine Amount */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Total Medicine Amount (₹) (आजची मशीन 2 औषधांची एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine2_medicine_amount"
                    value={formData.machine2_medicine_amount}
                    onChange={handleChange}
                    placeholder="₹"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>

              {/* 16. Machine-2 Total Amount */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Today's Machine-2 Total Amount (₹) (आजची मशीन 2 एकूण रक्कम)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="machine2_total_amount"
                    value={formData.machine2_total_amount}
                    onChange={handleChange}
                    placeholder="₹"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </div>

              {/* 17. UTR Number */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Machine 1 and Machine-2 UTR Number( मशीन 1 आणि मशीन 2 च्या व्यवहारांचे UTR क्रमांक)
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="utr_number"
                    value={formData.utr_number}
                    onChange={handleChange}
                    placeholder="UTR क्रमांक प्रविष्ट करा"
                  />
                </Form.Group>
              </div>

              {/* 18. Additional Remarks (इतर माहिती) */}
              <div className="col-12">
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    Additional Remarks (इतर माहिती)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="additional_remarks"
                    value={formData.additional_remarks}
                    onChange={handleChange}
                    placeholder="इतर कोणतीही माहिती असल्यास येथे लिहा"
                  />
                </Form.Group>
              </div>

            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="dark" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Report" : "Save Report"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default DistrictDashboard;
