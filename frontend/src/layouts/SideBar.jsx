import { act, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchSections, fetchMasters, getReportsName } from "../api/api";
import {
  LayoutDashboard,
  Settings,
  BookOpen,
  FolderKanban
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const [sections, setSections] = useState([]);
  const [openMain, setOpenMain] = useState(null);
  const [masters, setMasters] = useState([]);
  const [reports, setReports] = useState([]);

  const User = JSON.parse(localStorage.getItem("user"));
  const role = (User?.role || "user").toLowerCase().trim();

  useEffect(() => {
    loadSections();
    loadMasters();
    loadReportFilters();
  }, []);

  const loadSections = async () => {
    try {
      const res = await fetchSections();
      setSections(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMasters = async () => {
    try {
      const res = await fetchMasters();
      setMasters(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadReportFilters = async () => {
    try {
      const activeUserEmail = User?.email || "";
      const res = await getReportsName(activeUserEmail);
      setReports(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };


  const isActive = (path) => location.pathname === path;

  // ✅ ROLE FILTER LOGIC
  const showAdmin = role !== "user" && role !== "asst admin";
  const showMasters = role !== "user";

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/dashboard",
    },

    // ✅ ADMIN ONLY FOR SUPER ADMIN (NOT asst admin, NOT user)
    showAdmin && {
      name: "Admin",
      icon: <Settings size={18} />,
      path: "/admin",
    },

    // ✅ MASTERS ONLY FOR ADMIN LEVEL (NOT user)
    showMasters && {
      name: "Masters",
      icon: <BookOpen size={18} />,
      children: masters.map((master) => ({
        key: `${master.master_name}`,
        id: master.master_name,
        name: master.display_name,
        master: master,
        path: `/masters/${master.master_name}`,
        state: { master }
      })),
    },

    {
      name: "Workspace",
      icon: <FolderKanban size={18} />,
      children: sections.map((sec) => ({
        key: `${sec.module_id}_${sec.module_name}`,
        id: sec.module_id,
        name: sec.display_name,
        module: sec,
        path: `/workspace/${sec.module_id}`,
      })),
    },
    {
      name: "Reports",
      icon: <FolderKanban size={18} />,
      children: reports.map((report) => ({
        key: `${report.id}_${report.filter_name}`,
        id: report.id,
        name: report.filter_name,
        report: report,
        path: `/reports/${report.id}`,
      })),
    },
  ].filter(Boolean); // ✅ remove false entries

  return (
    <div className="h-screen w-64 bg-gray-100 text-gray-900 fixed top-0 left-0 p-5 overflow-y-auto">

      <h1 className="text-xl font-bold mb-6">BINSHABIB GROUP</h1>

      <nav className="space-y-2">

        {menuItems.map((item, i) => (
          <div key={i}>

            {/* MAIN */}
            {item.path ? (
              <Link
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded
                  ${isActive(item.path) ? "bg-gray-300" : "hover:bg-gray-200"}
                `}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            ) : (
              <div
                onClick={() =>
                  setOpenMain(openMain === item.name ? null : item.name)
                }
                className="flex justify-between items-center px-3 py-2 rounded cursor-pointer hover:bg-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  {item.name}
                </div>
                <span>{openMain === item.name ? "▾" : "▸"}</span>
              </div>
            )}

            {/* CHILDREN */}
            {item.children && openMain === item.name && (
              <div className="ml-4 mt-2 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.key}
                    to={child.path}
                    state={child.master ? { master: child.master } : child.report ? { report: child.report } : { module: child.module }}
                    className={`block px-3 py-2 rounded text-sm
                      ${isActive(child.path) ? "bg-gray-300" : "hover:bg-gray-200"}
                    `}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}

          </div>
        ))}

      </nav>
    </div>
  );
}