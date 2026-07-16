import { useState } from "react";
import SideBar from "./SideBar";
import Navbar from "./Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

 return (
  <div className="h-screen bg-gray-100 overflow-hidden">
    <SideBar collapsed={collapsed} setCollapsed={setCollapsed} />

    <div
      className={`h-screen flex flex-col transition-all duration-300 ${
        collapsed ? "md:pl-20" : "md:pl-64"
      }`}
    >
      <div className="shrink-0 md:hidden">
        <Navbar />
      </div>

     <main className="flex-1 overflow-y-auto p-0 md:p-6 min-w-0">
  <Outlet />
</main>
    </div>
  </div>
);
}