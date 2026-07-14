import { useState } from "react";
import SideBar from "./SideBar";
import Navbar from "./Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      <SideBar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <Navbar />

        <main className="p-4 md:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}