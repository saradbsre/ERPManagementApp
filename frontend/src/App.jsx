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

const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now(); // check expiry
  } catch {
    return false;
  }
};

function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/" replace />;
}

function App() {
  return (
    <Router>
      <Routes>

        {/* PUBLIC */}
       <Route
          path="/"
          element={
            isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />
         <Route
              path="/forgot-password"
              element={<ForgotPassword />}
             />

        {/* PROTECTED */}
        <Route element={<ProtectedRoute />}>

          {/* LAYOUT WRAPPER */}
          <Route element={<Layout />}>

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />

            {/* 🔥 ADD THIS */}
            <Route
              path="/workspace/:id"
              element={<DynamicTablePage />}
            />
            <Route
              path="/masters/:masterName"
              element={<MasterTablePage />}
            />
            <Route
              path="/admin/approvals"
              element={<Approvals />}
            />
           

          </Route>

        </Route>

      </Routes>
    </Router>
  );
}

export default App;