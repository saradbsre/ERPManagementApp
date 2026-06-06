import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  fetchSections,
  fetchMasters,
  getReportsName,
} from "../api/api";

import {
  LayoutDashboard,
  Settings,
  BookOpen,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const [hoverMenu, setHoverMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [sections, setSections] = useState([]);
  const [masters, setMasters] = useState([]);
  const [reports, setReports] = useState([]);
  const [openMain, setOpenMain] = useState(null);

  const User = JSON.parse(localStorage.getItem("user"));

  const role = (User?.role || "user")
    .toLowerCase()
    .trim();

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

  const isActive = (path) =>
    location.pathname === path;

  const showAdmin =
    role !== "user" &&
    role !== "asst admin";

  const showMasters =
    role !== "user";

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={18} />,
      path: "/dashboard",
    },

    showAdmin && {
      name: "Admin",
      icon: <Settings size={18} />,
      path: "/admin",
    },

    showMasters && {
      name: "Masters",
      icon: <BookOpen size={18} />,
      children: masters.map((master) => ({
        key: master.master_name,
        id: master.master_name,
        name: master.display_name,
        master,
        path: `/masters/${master.master_name}`,
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
      icon: <FileBarChart2 size={18} />,
      children: reports.map((report) => ({
        key: `${report.id}_${report.filter_name}`,
        id: report.id,
        name: report.filter_name,
        report,
        path: `/reports/${report.id}`,
      })),
    },
  ].filter(Boolean);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* MOBILE MENU BUTTON */}
<button
  onClick={() => setMobileOpen(true)}
  className="
    md:hidden
    fixed
    top-4
    left-4
    z-[60]
    p-2
    rounded-lg
    bg-white
    shadow
    border
  "
>
  <Menu size={22} />
</button>

      {/* BACKDROP */}
      {mobileOpen && (
        <div
          className="
            md:hidden
            fixed
            inset-0
            bg-black/40
            z-40
          "
          onClick={closeMobile}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`
          fixed top-0 left-0 h-screen
          bg-gray-100 text-gray-900
          overflow-y-auto
          overflow-x-visible
          z-50
          transition-all duration-300

          ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }

          ${
            collapsed
              ? "md:w-20"
              : "md:w-64"
          }

          w-64
        `}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <h1 className="text-lg font-bold">
              BINSHABIB GROUP
            </h1>
          )}

          <div className="flex items-center gap-2">
            {/* DESKTOP COLLAPSE */}
            <button
              onClick={() =>
                setCollapsed(!collapsed)
              }
              className="
                hidden md:block
                p-1 rounded
                hover:bg-gray-200
              "
            >
              {collapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>

            {/* MOBILE CLOSE */}
            <button
              onClick={closeMobile}
              className="
                md:hidden
                p-1 rounded
                hover:bg-gray-200
              "
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* MENU */}
        <nav className="space-y-2 p-3">
          {menuItems.map((item, i) => (
            <div key={i}>
              {/* NORMAL LINK */}
              {item.path ? (
                <Link
                  to={item.path}
                  onClick={closeMobile}
                  className={`
  flex items-center
  ${collapsed ? "justify-center" : "gap-3"}
  px-3 py-2 rounded
  ${
    isActive(item.path)
      ? "bg-gray-300"
      : "hover:bg-gray-200"
  }
`}
                >
                  <span>{item.icon}</span>

                  {!collapsed && (
                    <span>{item.name}</span>
                  )}
                </Link>
              ) : (
                <div
  className="
    relative
    flex justify-between
    items-center
    px-3 py-2
    rounded
    cursor-pointer
    hover:bg-gray-200
  "
  onClick={() => {
    if (!collapsed) {
      setOpenMain(
        openMain === item.name
          ? null
          : item.name
      );
    }
  }}
  onMouseEnter={() => {
    if (collapsed) {
      setHoverMenu(item.name);
    }
  }}
  onMouseLeave={() => {
    if (collapsed) {
      setHoverMenu(null);
    }
  }}
>
                  <div
  className={`flex items-center ${
    collapsed
      ? "justify-center w-full"
      : "gap-3"
  }`}
>
                    <span>{item.icon}</span>

                    {!collapsed && (
                      <span>{item.name}</span>
                    )}
                  </div>

                  {!collapsed && (
                    <span>
                      {openMain === item.name
                        ? "▾"
                        : "▸"}
                    </span>
                  )}
                </div>
              )}

              {/* CHILDREN */}
              {item.children &&
                openMain === item.name &&
                !collapsed && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.children.map(
                      (child) => (
                        <Link
                          key={child.key}
                          to={child.path}
                          onClick={closeMobile}
                          state={
                            child.master
                              ? {
                                  master:
                                    child.master,
                                }
                              : child.report
                              ? {
                                  report:
                                    child.report,
                                }
                              : {
                                  module:
                                    child.module,
                                }
                          }
                          className={`
                            block
                            px-3 py-2
                            rounded
                            text-sm

                            ${
                              isActive(
                                child.path
                              )
                                ? "bg-gray-300"
                                : "hover:bg-gray-200"
                            }
                          `}
                        >
                          {child.name}
                        </Link>
                      )
                    )}
                  </div>
                )}
                {collapsed &&
  item.children &&
  hoverMenu === item.name && (
    <div
      className="
        absolute
        left-full
        top-0
        ml-2
        min-w-[260px]
        bg-white
        border
        rounded-lg
        shadow-xl
        z-[9999]
        py-2
      "
      onMouseEnter={() =>
        setHoverMenu(item.name)
      }
      onMouseLeave={() =>
        setHoverMenu(null)
      }
    >
      <div
        className="
          px-3
          py-2
          font-semibold
          border-b
          bg-gray-50
        "
      >
        {item.name}
      </div>

      {item.children.map((child) => (
        <Link
          key={child.key}
          to={child.path}
          onClick={closeMobile}
          state={
            child.master
              ? { master: child.master }
              : child.report
              ? { report: child.report }
              : { module: child.module }
          }
          className="
            block
            px-3
            py-2
            text-sm
            hover:bg-gray-100
          "
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
    </>
  );
}