import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_BASE_URL } from "../../config/api";

// =====================================================
// LOGIN COMPONENT
// =====================================================

const Login = () => {

  const navigate = useNavigate();

  // =====================================================
  // FORM STATE
  // =====================================================

  const [formData, setFormData] = useState({
    userId: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {

    const {
      name,
      value,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // =====================================================
  // CLEAR OLD SESSION
  // =====================================================

  const clearOldSession = () => {

    const keys = [
      "admin_logged_in",
      "logged_in_user",
      "logged_in_user_id",
      "logged_in_name",
      "logged_in_role",
      "logged_in_status",
      "logged_in_mobile",

      "logged_in_district_id",
      "logged_in_district_name",

      "logged_in_taluka_id",
      "logged_in_taluka_name",

      "logged_in_vibhag_id",
      "logged_in_vibhag_name",

      "logged_in_trainer_id",
      "logged_in_trainer_name",
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
  };

  // =====================================================
  // SAVE LOGIN SESSION
  // =====================================================

  const saveLoginSession = (user) => {

    localStorage.setItem(
      "admin_logged_in",
      "true"
    );

    localStorage.setItem(
      "logged_in_user",
      JSON.stringify(user)
    );

    localStorage.setItem(
      "logged_in_user_id",
      // Never fall back to numeric table id — that breaks ownership filters
      user.user_id ||
        ""
    );

    localStorage.setItem(
      "logged_in_name",
      user.name ||
        user.full_name ||
        ""
    );

    localStorage.setItem(
      "logged_in_role",
      String(user.role || "").trim().toLowerCase()
    );

    localStorage.setItem(
      "logged_in_status",
      user.status ||
        ""
    );

    localStorage.setItem(
      "logged_in_mobile",
      user.contact_number ||
        user.mobile_number ||
        ""
    );

    // ===================================================
    // DISTRICT
    // ===================================================

    if (user.role === "district") {

      localStorage.setItem(
        "logged_in_district_id",
        user.district_id || ""
      );

      localStorage.setItem(
        "logged_in_district_name",
        user.district_name ||
          user.name ||
          user.full_name ||
          ""
      );
    }

    // ===================================================
    // TALUKA
    // ===================================================

    if (user.role === "taluka") {

      localStorage.setItem(
        "logged_in_taluka_id",
        user.taluka_id || ""
      );

      localStorage.setItem(
        "logged_in_taluka_name",
        user.taluka_name ||
          user.name ||
          user.full_name ||
          ""
      );

      if (user.district_id) {

        localStorage.setItem(
          "logged_in_district_id",
          user.district_id
        );
      }

      if (user.district_name) {

        localStorage.setItem(
          "logged_in_district_name",
          user.district_name
        );
      }
    }

    // ===================================================
    // VIBHAG
    // ===================================================

    if (user.role === "vibhag") {

      localStorage.setItem(
        "logged_in_vibhag_id",
        user.vibhag_id || ""
      );

      localStorage.setItem(
        "logged_in_vibhag_name",
        user.vibhag_name ||
          user.name ||
          user.full_name ||
          ""
      );

      if (user.taluka_id) {

        localStorage.setItem(
          "logged_in_taluka_id",
          user.taluka_id
        );
      }

      if (user.taluka_name) {

        localStorage.setItem(
          "logged_in_taluka_name",
          user.taluka_name
        );
      }

      if (user.district_id) {

        localStorage.setItem(
          "logged_in_district_id",
          user.district_id
        );
      }

      if (user.district_name) {

        localStorage.setItem(
          "logged_in_district_name",
          user.district_name
        );
      }
    }

    // ===================================================
    // TRAINER
    // ===================================================

    if (user.role === "trainer") {

      localStorage.setItem(
        "logged_in_trainer_id",
        user.trainer_id ||
          user.id ||
          ""
      );

      localStorage.setItem(
        "logged_in_trainer_name",
        user.trainer_name ||
          user.name ||
          user.full_name ||
          ""
      );

      if (user.vibhag_id) {

        localStorage.setItem(
          "logged_in_vibhag_id",
          user.vibhag_id
        );
      }

      if (user.vibhag_name) {

        localStorage.setItem(
          "logged_in_vibhag_name",
          user.vibhag_name
        );
      }

      if (user.taluka_id) {

        localStorage.setItem(
          "logged_in_taluka_id",
          user.taluka_id
        );
      }

      if (user.taluka_name) {

        localStorage.setItem(
          "logged_in_taluka_name",
          user.taluka_name
        );
      }

      if (user.district_id) {

        localStorage.setItem(
          "logged_in_district_id",
          user.district_id
        );
      }

      if (user.district_name) {

        localStorage.setItem(
          "logged_in_district_name",
          user.district_name
        );
      }
    }
  };

  // =====================================================
  // ROLE BASED REDIRECT
  // =====================================================

  const redirectByRole = (role) => {

    const normalized = String(role || "").trim().toLowerCase();

    switch (normalized) {

      case "admin":
      case "superadmin":

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );

        break;

      case "district":

        navigate(
          "/district-dashboard",
          {
            replace: true,
          }
        );

        break;

      case "taluka":

        navigate(
          "/taluka-dashboard",
          {
            replace: true,
          }
        );

        break;

      case "vibhag":

        navigate(
          "/vibhag-dashboard",
          {
            replace: true,
          }
        );

        break;

      case "trainer":

        navigate(
          "/trainer-dashboard",
          {
            replace: true,
          }
        );

        break;

      default:

        setError(
          "Invalid user role. Please contact administrator."
        );

        break;
    }
  };

  // =====================================================
  // LOGIN SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    const userId =
      formData.userId.trim();

    const password =
      formData.password.trim();

    // ===================================================
    // VALIDATION
    // ===================================================

    if (!userId) {

      setError(
        "Please enter User ID."
      );

      return;
    }

    if (!password) {

      setError(
        "Please enter Password."
      );

      return;
    }

    setLoading(true);
    setError("");

    clearOldSession();

    try {

      // =================================================
      // FINAL LOGIN URL
      // =================================================

      const loginUrl =
        `${API_BASE_URL}/auth/login`;

      console.log(
        "================================="
      );

      console.log(
        "LOGIN URL:",
        loginUrl
      );

      console.log(
        "LOGIN USER ID:",
        userId
      );

      console.log(
        "================================="
      );

      // =================================================
      // LOGIN API
      // =================================================

      const response =
        await axios.post(
          loginUrl,
          {
            user_id: userId,
            password: password,
          },
          {
            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            withCredentials: true,

            timeout: 20000,
          }
        );

      // =================================================
      // RESPONSE
      // =================================================

      console.log(
        "LOGIN RESPONSE:",
        response.data
      );

      // =================================================
      // SUCCESS
      // =================================================

      if (
        response.data &&
        response.data.success === true &&
        response.data.user
      ) {

        const user =
          response.data.user;

        console.log(
          "LOGIN USER:",
          user
        );

        // ===============================================
        // STATUS
        // ===============================================

        if (
          user.status &&
          String(user.status).toLowerCase() !==
            "active"
        ) {

          setError(
            "Your account is inactive. Please contact administrator."
          );

          setLoading(false);

          return;
        }

        // ===============================================
        // SAVE SESSION
        // ===============================================

        saveLoginSession(
          user
        );

        // ===============================================
        // REDIRECT
        // Hard navigation avoids route-guard race where
        // localStorage is set but React still sees old auth.
        // ===============================================

        const normalizedRole = String(user.role || "").trim().toLowerCase();
        const roleHome = {
          admin: "/dashboard",
          superadmin: "/dashboard",
          district: "/district-dashboard",
          taluka: "/taluka-dashboard",
          vibhag: "/vibhag-dashboard",
          trainer: "/trainer-dashboard",
        }[normalizedRole];

        if (roleHome) {
          window.location.assign(roleHome);
          return;
        }

        setError(
          "Invalid user role. Please contact administrator."
        );

        return;
      }

      // =================================================
      // LOGIN FAILED
      // =================================================

      setError(
        response.data?.message ||
          "Invalid User ID or Password."
      );

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

      // =================================================
      // BACKEND RESPONSE
      // =================================================

      if (error.response) {

        console.error(
          "BACKEND STATUS:",
          error.response.status
        );

        console.error(
          "BACKEND RESPONSE:",
          error.response.data
        );

        setError(
          error.response.data?.message ||
            "Invalid User ID or Password."
        );

      }

      // =================================================
      // NETWORK / CORS / SERVER ERROR
      // =================================================

      else if (error.request) {

        console.error(
          "NO RESPONSE FROM BACKEND:",
          error.request
        );

        setError(
          "Unable to connect to backend server."
        );

      }

      // =================================================
      // OTHER ERROR
      // =================================================

      else {

        console.error(
          "REQUEST ERROR:",
          error.message
        );

        setError(
          "Unable to login. Please try again."
        );
      }

    } finally {

      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (

    <div
      className="
        min-vh-100
        d-flex
        align-items-center
        justify-content-center
        bg-light
      "
    >

      <div
        className="card border-0 shadow"
        style={{
          width: "100%",
          maxWidth: "530px",
          borderRadius: "12px",
        }}
      >

        <div
          className="card-body p-4 p-md-5"
        >

          {/* ===========================================
              HEADER
          =========================================== */}

          <div
            className="text-center mb-4"
          >

            <h3
              className="fw-bold mb-2"
            >
              Admin Login
            </h3>

            <p
              className="text-muted mb-0"
            >
              Login to your management system
            </p>

          </div>

          {/* ===========================================
              ERROR
          =========================================== */}

          {error && (

            <div
              className="alert alert-danger"
              role="alert"
            >
              {error}
            </div>

          )}

          {/* ===========================================
              LOGIN FORM
          =========================================== */}

          <form
            onSubmit={handleSubmit}
          >

            {/* USER ID */}

            <div
              className="mb-3"
            >

              <label
                className="form-label fw-semibold"
              >
                User ID
              </label>

              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter User ID"
                autoComplete="username"
                disabled={loading}
              />

            </div>

            {/* PASSWORD */}

            <div
              className="mb-4"
            >

              <label
                className="form-label fw-semibold"
              >
                Password
              </label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Password"
                autoComplete="current-password"
                disabled={loading}
              />

            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="btn btn-dark w-100 py-2 fw-semibold"
              disabled={loading}
            >

              {loading
                ? "Logging in..."
                : "Login"}

            </button>

          </form>

        </div>

      </div>

    </div>
  );
};

export default Login;