import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { getDbStatus } from "./api/api";
import Login from "./pages/authpage/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/admin/Admin";
import Layout from "./layouts/Layout";
import DynamicTablePage from "./components/tables/CTable";
import MasterTablePage from "./components/masters/MasterTable";
import Approvals from "./components/admin/Approvals";
import ForgotPassword from "./pages/authpage/ForgotPassword";
import ViewPage from "./components/views/ViewTable";
import ReportTable from "./components/reports/ReportTable";
import PaymentReqForm from "./pages/PaymentReqForm";
import Profile from "./pages/Profile";
import PDFUpload from "./pages/PDFUpload";
import { useUser } from "./components/UserContext";
import { sessionHeartbeat, logOut } from "./api/api";
import DbStatusOverlay from "./components/DbStatusOverlay";
import { getAccessToken } from "./api/api";

function AppRouter() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const isActive = useRef(false);
  const inactiveCount = useRef(0);
  const [inactiveMsg, setInactiveMsg] = useState("");
  const [dbStatus, setDbStatus] = useState("loading"); 

useEffect(() => {

  const checkDb = async () => {
    // console.log("Checking database status...");
    // delay before showing loading
    const loadingTimer = setTimeout(() => {
      setDbStatus("loading");
    }, 1500); // 1.5 sec delay

    try {
      // console.log("Fetching database status...");
      const res = await getDbStatus();
      // console.log("DB Status Response:", res.data);
      // stop loading timer
      clearTimeout(loadingTimer);

      if (res.data?.status === "connected") {
        setDbStatus("connected");
      } else {
        setDbStatus("error");
      }

    } catch (err) {
      console.log(err.message);
      clearTimeout(loadingTimer);

      setDbStatus("error");
    }
  };

  checkDb();

  const interval = setInterval(() => {
    checkDb();
  }, 60000);

  return () => clearInterval(interval);

}, []);

useEffect(() => {
  if (!user) return;

  const markActive = () => {
    isActive.current = true;
    inactiveCount.current = 0;
    setInactiveMsg("");
  };

  window.addEventListener("mousemove", markActive);
  window.addEventListener("keydown", markActive);

  const interval = setInterval(() => {
    if (isActive.current) {
      sessionHeartbeat(user.email);
      isActive.current = false;
      console.log("Heartbeat sent");
    } else {
      inactiveCount.current += 1;
      console.log("User is inactive for", inactiveCount.current, "minute(s)");
      if (inactiveCount.current >= 5 && inactiveCount.current < 10) {
        setInactiveMsg("You have been inactive for a while.");
      }
      if (inactiveCount.current >= 10) { // 10 minutes
        setInactiveMsg("You have been logged out due to inactivity.");
        try {
          logOut();
          setUser(null);
          localStorage.removeItem("user");
          navigate("/", { replace: true });
        } catch (error) {
          console.error("Logout failed:", error);
        }
      }
    }
  }, 60000);

  return () => {
    window.removeEventListener("mousemove", markActive);
    window.removeEventListener("keydown", markActive);
    clearInterval(interval);
  };
}, [user, setUser, navigate]);

useEffect(() => {
  if (!user) return;

  const checkAccessToken = async () => {
    try {
      const res = await getAccessToken();

      if (!res.data?.accessToken) {
        throw new Error("No access token");
      }

      console.log("Access token is valid");
    } catch (err) {
      console.log("Access token missing or expired");

      setInactiveMsg("Your session has expired. Logging out...");

      setTimeout(async () => {
        try {
          await logOut();
        } catch (error) {
          console.error("Logout failed:", error);
        }

        setUser(null);
        localStorage.removeItem("user");
        navigate("/", { replace: true });
      }, 2000);
    }
  };

  // Check immediately
  checkAccessToken();

  // Check every 1 minute
  const interval = setInterval(checkAccessToken, 60000);

  return () => clearInterval(interval);

}, [user, navigate, setUser]);




  return (
    <>

      <DbStatusOverlay dbStatus={dbStatus} onRetry={() => window.location.reload()} />
      {inactiveMsg && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          background: "linear-gradient(90deg, #f59e0b, #f97316)",
          color: "#fff",
          textAlign: "center",
          padding: "12px 16px",
          zIndex: 9999,
          fontWeight: "600",
          fontSize: "14px",
          letterSpacing: "0.5px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          ⚠️ {inactiveMsg}
        </div>
      )}
      <Routes>
        {/* PUBLIC ROUTES */}
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
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* PROTECTED ROUTES */}
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
            <Route path="/views/:id" element={<ViewPage />} />
            <Route path="/payment-req-form" element={<PaymentReqForm />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reports/:id" element={<ReportTable />} />
            <Route path="/upload/:moduleId" element={<PDFUpload />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default AppRouter;