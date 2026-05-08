import { useState } from "react";
import SideBar from "./SideBar";
import Navbar from "./Header";
import { Outlet } from "react-router-dom";

export default function Layout() {

  // ✅ SIDEBAR STATE
  const [collapsed, setCollapsed] = useState(false);

  return (

    <div className="flex">

      {/* SIDEBAR */}
      <SideBar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* MAIN CONTENT */}
      <div
        className={`
          flex flex-col min-w-0 transition-all duration-300
          ${collapsed ? "ml-20" : "ml-64"}
        `}
        style={{
          width: "100%",
          minHeight: "100vh",
          background: "#f3f4f6"
        }}
      >

        {/* HEADER */}
        <Navbar />

        {/* PAGE */}
        <div className="p-6 min-w-0 overflow-x-hidden flex-1">
          <Outlet />
        </div>

      </div>

    </div>
  );
}