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
import PaymentReqForm from "./pages/PaymentReqForm";

import { useUser } from "./components/UserContext";

function App() {
  // ✅ SINGLE SOURCE OF TRUTH
  const { user } = useUser();

  return (
    <Router>
      <Routes>

        {/* ================= PUBLIC ROUTES ================= */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* ================= PROTECTED ROUTES ================= */}
        <Route
          element={
            user ? <Outlet /> : <Navigate to="/" replace />
          }
        >
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/workspace/:id" element={<DynamicTablePage />} />
            <Route path="/masters/:masterName" element={<MasterTablePage />} />
            <Route path="/admin/approvals" element={<Approvals />} />
            <Route path="/reports/:id" element={<ReportPage />} />
            <Route path="/payment-req-form" element={<PaymentReqForm />} />
          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;