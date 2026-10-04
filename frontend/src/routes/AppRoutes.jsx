import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

import DashboardLayout
  from "../pages/dashboardnew/DashboardLayout";

import Login
  from "../pages/dashboardnew/Login";

import NewDashboard
  from "../pages/dashboardnew/NewDashboard";

import District
  from "../pages/dashboardnew/District";

import Taluka
  from "../pages/dashboardnew/Taluka";

import Vibhag
  from "../pages/dashboardnew/Vibhag";

import Trainer
  from "../pages/dashboardnew/Trainer";


/* =========================================================
   ADMIN REPORTS
========================================================= */

import DistrictReport
  from "../pages/dashboardnew/reports/DistrictReport";

import TalukaReport
  from "../pages/dashboardnew/reports/TalukaReport";

import VibhagReport
  from "../pages/dashboardnew/reports/VibhagReport";

import TrainerReport
  from "../pages/dashboardnew/reports/TrainerReport";


/* =========================================================
   DISTRICT DASHBOARD
========================================================= */

import DistrictDashboard
  from "../pages/dashboardnew/DistrictDashboard";


/* =========================================================
   TALUKA DASHBOARD
========================================================= */

import TalukaDashboard
  from "../pages/dashboardnew/TalukaDashboard";


/* =========================================================
   VIBHAG DASHBOARD
========================================================= */

import VibhagDashboard
  from "../pages/dashboardnew/VibhagDashboard";


/* =========================================================
   TRAINER DASHBOARD
========================================================= */

import TrainerDashboard
  from "../pages/dashboardnew/TrainerDashboard";


/* =========================================================
   CSS
========================================================= */

import "../pages/dashboardnew/dashboard.css";


/* =========================================================
   ADMIN PROTECTED ROUTE
========================================================= */

const AdminRoute = ({ children }) => {

  const loggedIn =
    localStorage.getItem(
      "admin_logged_in"
    );

  const role = String(
    localStorage.getItem(
      "logged_in_role"
    ) || ""
  ).trim().toLowerCase();

  if (
    loggedIn !== "true" ||
    (role !== "admin" && role !== "superadmin")
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};


/* =========================================================
   DISTRICT PROTECTED ROUTE
========================================================= */

const DistrictRoute = ({ children }) => {

  const loggedIn =
    localStorage.getItem(
      "admin_logged_in"
    );

  const role = String(
    localStorage.getItem(
      "logged_in_role"
    ) || ""
  ).trim().toLowerCase();

  if (
    loggedIn !== "true" ||
    role !== "district"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};


/* =========================================================
   TALUKA PROTECTED ROUTE
========================================================= */

const TalukaRoute = ({ children }) => {

  const loggedIn =
    localStorage.getItem(
      "admin_logged_in"
    );

  const role = String(
    localStorage.getItem(
      "logged_in_role"
    ) || ""
  ).trim().toLowerCase();

  if (
    loggedIn !== "true" ||
    role !== "taluka"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};


/* =========================================================
   VIBHAG PROTECTED ROUTE
========================================================= */

const VibhagRoute = ({ children }) => {

  const loggedIn =
    localStorage.getItem(
      "admin_logged_in"
    );

  const role = String(
    localStorage.getItem(
      "logged_in_role"
    ) || ""
  ).trim().toLowerCase();

  if (
    loggedIn !== "true" ||
    role !== "vibhag"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};


/* =========================================================
   TRAINER PROTECTED ROUTE
========================================================= */

const TrainerRoute = ({ children }) => {

  const loggedIn =
    localStorage.getItem(
      "admin_logged_in"
    );

  const role = String(
    localStorage.getItem(
      "logged_in_role"
    ) || ""
  ).trim().toLowerCase();

  if (
    loggedIn !== "true" ||
    role !== "trainer"
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};


/* =========================================================
   APP ROUTES
========================================================= */

const AppRoutes = () => {

  return (

    <BrowserRouter>

      <Routes>


        {/* =================================================
            LOGIN
        ================================================= */}

        <Route
          path="/login"
          element={
            <Login />
          }
        />


        {/* =================================================
            ROOT
        ================================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />


        {/* =================================================
            ADMIN DASHBOARD
            WITH SIDEBAR
        ================================================= */}

        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >


          {/* =================================================
              ADMIN HOME
          ================================================= */}

          <Route
            index
            element={
              <NewDashboard />
            }
          />


          {/* =================================================
              DISTRICT MASTER
          ================================================= */}

          <Route
            path="district"
            element={
              <District />
            }
          />


          {/* =================================================
              TALUKA MASTER
          ================================================= */}

          <Route
            path="taluka"
            element={
              <Taluka />
            }
          />


          {/* =================================================
              VIBHAG MASTER
          ================================================= */}

          <Route
            path="vibhag"
            element={
              <Vibhag />
            }
          />


          {/* =================================================
              TRAINER MASTER
          ================================================= */}

          <Route
            path="trainer"
            element={
              <Trainer />
            }
          />


          {/* =================================================
              =================================================
              ADMIN REPORTS
              =================================================
          ================================================= */}


          {/* -------------------------------------------------
              DISTRICT REPORT
          ------------------------------------------------- */}

          <Route
            path="reports/district"
            element={
              <DistrictReport />
            }
          />


          {/* -------------------------------------------------
              TALUKA REPORT
          ------------------------------------------------- */}

          <Route
            path="reports/taluka"
            element={
              <TalukaReport />
            }
          />


          {/* -------------------------------------------------
              VIBHAG REPORT
          ------------------------------------------------- */}

          <Route
            path="reports/vibhag"
            element={
              <VibhagReport />
            }
          />


          {/* -------------------------------------------------
              TRAINER REPORT
          ------------------------------------------------- */}

          <Route
            path="reports/trainer"
            element={
              <TrainerReport />
            }
          />


        </Route>


        {/* =================================================
            DISTRICT DASHBOARD
            NO SIDEBAR
        ================================================= */}

        <Route
          path="/district-dashboard"
          element={
            <DistrictRoute>
              <DistrictDashboard />
            </DistrictRoute>
          }
        />


        {/* =================================================
            TALUKA DASHBOARD
            NO SIDEBAR
        ================================================= */}

        <Route
          path="/taluka-dashboard"
          element={
            <TalukaRoute>
              <TalukaDashboard />
            </TalukaRoute>
          }
        />


        {/* =================================================
            VIBHAG DASHBOARD
            NO SIDEBAR
        ================================================= */}

        <Route
          path="/vibhag-dashboard"
          element={
            <VibhagRoute>
              <VibhagDashboard />
            </VibhagRoute>
          }
        />


        {/* =================================================
            TRAINER DASHBOARD
            NO SIDEBAR
        ================================================= */}

        <Route
          path="/trainer-dashboard"
          element={
            <TrainerRoute>
              <TrainerDashboard />
            </TrainerRoute>
          }
        />


        {/* =================================================
            INVALID URL
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
};


export default AppRoutes;
