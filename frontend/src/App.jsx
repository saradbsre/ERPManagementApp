import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import "./App.css";

import Login from "./pages/authpage/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/admin/Admin";
import Layout from "./layouts/Layout";
import DynamicTablePage from "./components/tables/CTable";
import MasterTablePage from "./components/masters/MasterTable";
import Approvals from "./components/admin/Approvals";
import ForgotPassword from "./pages/authpage/ForgotPassword";
import ReportPage from "./components/reports/ReportTable";

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // check auth once on load
useEffect(() => {
  const userStr = localStorage.getItem("user");

  try {
    const user = JSON.parse(userStr);

    // valid user check
    const isValidUser =
      user &&
      typeof user === "object" &&
      Object.keys(user).length > 0 &&
      user.email;

    setIsAuth(!!isValidUser);
  } catch (err) {
    setIsAuth(false);
  }

  setLoading(false);
}, []);

  // optional: auto sync when localStorage changes (logout/login in other tabs)
  useEffect(() => {
    const syncAuth = () => {
      const userStr = localStorage.getItem("user");

      try {
        const user = JSON.parse(userStr);

        // valid user check
        const isValidUser =
          user &&
          typeof user === "object" &&
          Object.keys(user).length > 0 &&
          user.email;

        setIsAuth(!!isValidUser);
      } catch (err) {
        setIsAuth(false);
      }
    };

    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  if (loading) return null; // or loader

  return (
    <Router>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route
          path="/"
          element={
            isAuth ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* PROTECTED ROUTES */}
        <Route
          element={
            isAuth ? <Outlet /> : <Navigate to="/" replace />
          }
        >
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/workspace/:id" element={<DynamicTablePage />} />
            <Route path="/masters/:masterName" element={<MasterTablePage />} />
            <Route path="/admin/approvals" element={<Approvals />} />
            <Route path="/reports/:id" element={<ReportPage />} />
          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;