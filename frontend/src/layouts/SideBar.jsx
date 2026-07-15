import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logOut } from "../api/api";
import { useUser } from "../components/UserContext";

import {
  fetchSections,
  fetchMasters,
  getReportsName,
  getReportMenu,
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
  ChevronDown,
  ChevronRight as ArrowRight,
  UserCircle2, LogOut, UserPen
} from "lucide-react";

export default function SideBar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [masters, setMasters] = useState([]);
  const [reports, setReports] = useState([]);
  const [views, setViews] = useState([]);
  const [openMain, setOpenMain] = useState(null);
  const [hoverMenu, setHoverMenu] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  // const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { user, setUser } = useUser();
  const role = (user?.role || "user").toLowerCase().trim();

  useEffect(() => {
    loadSections();
    loadMasters();
    loadReportFilters();
    loadReportMenu();
  }, []);

  const loadSections = async () => {
    try {
      const res = await fetchSections();
      setSections(res.data || []);
    } catch (err) {
      console.error("Failed to load sections:", err);
    }
  };

  const loadMasters = async () => {
    try {
      const res = await fetchMasters();
      setMasters(res.data || []);
    } catch (err) {
      console.error("Failed to load masters:", err);
    }
  };

  const loadReportFilters = async () => {
    try {
      const activeUserEmail = user?.email || "";
      const res = await getReportsName(activeUserEmail);
      setViews(res.data || []);
    } catch (err) {
      console.error("Failed to load views:", err);
    }
  };

  const loadReportMenu = async () => {
    try {
      const res = await getReportMenu();
      setReports(res.data || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const isActive = (path) => location.pathname === path;

  const isChildActive = (children = []) =>
    children.some((child) => location.pathname === child.path);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const showAdmin = role !== "user" && role !== "asst admin";
  const showMasters = role !== "user";

  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={19} />,
      path: "/dashboard",
    },

    showAdmin && {
      name: "Admin",
      icon: <Settings size={19} />,
      path: "/admin",
    },

    showMasters && {
      name: "Masters",
      icon: <BookOpen size={19} />,
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
      icon: <FolderKanban size={19} />,
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
      icon: <FileBarChart2 size={19} />,
      children: reports.map((report) => ({
        key: `${report.report_id}`,
        id: report.report_id,
        name: report.description,
        report,
        path: `/reports/${report.report_id}`,
      })),
    },

    //  {
    //   name: "Views",
    //   icon: <FileBarChart2 size={18} />,
    //   children: views.map((view) => ({
    //     key: `${view.id}_${view.filter_name}`,
    //     id: view.id,
    //     name: view.filter_name,
    //     view: view,
    //     path: `/views/${view.id}`,
    //   })),
    // },
  ].filter(Boolean);

  const sidebarWidth = collapsed ? "md:w-20" : "md:w-64";
const openHoverMenu = (menuName) => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    setHoverTimeout(null);
  }

  setHoverMenu(menuName);
};

const closeHoverMenuWithDelay = () => {
  const timeout = setTimeout(() => {
    setHoverMenu(null);
  }, 250);

  setHoverTimeout(timeout);
};

 const handleLogout = async () => {
  try {
    await logOut();

    setUser(null);
    localStorage.removeItem("user");

    setOpen(false);

    navigate("/", { replace: true }); // prevents back navigation
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

  return (
    <>
      {/* mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white shadow border border-gray-200 text-gray-700"
      >
        <Menu size={22} />
      </button>

      {/* mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={closeMobile}
        />
      )}

      {/* sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 shadow-sm z-50 transition-all duration-300
        ${sidebarWidth}
        w-64
        ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="flex flex-col h-full">
         
        {/* logo/header */}
{/* logo/header */}
<div className="h-16 flex items-center justify-start px-3 border-b border-gray-200 relative">
  {!collapsed ? (
    <>
      <div className="min-w-0 mr-10">
          <h1 className="text-lg font-bold text-[#264d86] truncate">
          BIN SHABIB GROUP
        </h1>
        <p className="text-xs text-gray-500 truncate">
          IT Asset Management
        </p>
      </div>

      <button
        onClick={() => setCollapsed(true)}
        className="hidden md:flex absolute right-3 items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Collapse sidebar"
      >
        <ChevronLeft size={18} />
      </button>
    </>
  ) : (
    <>
      <div className="w-9 h-9 rounded-xl bg-[#264d86] text-white flex items-center justify-center font-bold text-lg">
        B
      </div>

      <button
        onClick={() => setCollapsed(false)}
        className=" hidden md:flex absolute right-1 items-center justify-center w-6 h-6 rounded-lg hover:bg-gray-100 text-gray-600"
        title="Expand sidebar"
      >
        <ChevronRight size={17} />
      </button>
    </>
  )}

  <button
    onClick={closeMobile}
    className="md:hidden absolute right-3 flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600"
  >
    <X size={18} />
  </button>
</div>

          {/* menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {menuItems.map((item) => {
              const activeParent = item.path
                ? isActive(item.path)
                : isChildActive(item.children);

              const isOpen = openMain === item.name;

              return (
               <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => collapsed && openHoverMenu(item.name)}
                  onMouseLeave={() => collapsed && closeHoverMenuWithDelay()}
                >
                  {item.path ? (
                    <Link
                      to={item.path}
                      onClick={closeMobile}
                      className={`group flex items-center rounded-xl transition-all duration-200
                        ${
                          collapsed
                            ? "justify-center px-2 py-3"
                            : "gap-3 px-3 py-2.5"
                        }
                        ${
                          activeParent
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-100"
                        }
                      `}
                    >
                      <span
                        className={`shrink-0 ${
                          activeParent ? "text-blue-700" : "text-gray-500"
                        }`}
                      >
                        {item.icon}
                      </span>

                      {!collapsed && (
                        <span className="text-sm truncate">{item.name}</span>
                      )}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!collapsed) {
                          setOpenMain(isOpen ? null : item.name);
                        }
                      }}
                      className={`w-full flex items-center rounded-xl transition-all duration-200
                        ${
                          collapsed
                            ? "justify-center px-2 py-3"
                            : "justify-between gap-3 px-3 py-2.5"
                        }
                        ${
                          activeParent
                            ? "bg-blue-50 text-blue-700 font-semibold"
                            : "text-gray-700 hover:bg-gray-100"
                        }
                      `}
                    >
                      <span
                        className={`flex items-center ${
                          collapsed ? "justify-center" : "gap-3"
                        } min-w-0`}
                      >
                        <span
                          className={`shrink-0 ${
                            activeParent ? "text-blue-700" : "text-gray-500"
                          }`}
                        >
                          {item.icon}
                        </span>

                        {!collapsed && (
                          <span className="text-sm truncate">{item.name}</span>
                        )}
                      </span>

                      {!collapsed && (
                        <span className="text-gray-400">
                          {isOpen ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                        </span>
                      )}
                    </button>
                  )}

                  {/* expanded submenu */}
                  {!collapsed && item.children && isOpen && (
                    <div className="mt-1 ml-8 pl-2 border-l border-gray-200 space-y-1">
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
                          className={`block rounded-lg px-3 py-2 text-sm transition
                            ${
                              isActive(child.path)
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }
                          `}
                        >
                          <span className="line-clamp-1">{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* collapsed hover submenu */}
                  {collapsed && item.children && hoverMenu === item.name && (
  <div
    className="fixed left-21 min-w-[280px] max-w-[360px] max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] py-2"
    style={{
      top: `${Math.max(70, 85 + menuItems.findIndex((m) => m.name === item.name) * 52)}px`,
    }}
    onMouseEnter={() => openHoverMenu(item.name)}
    onMouseLeave={closeHoverMenuWithDelay}
  >
    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl">
      <p className="text-sm font-semibold text-gray-900">
        {item.name}
      </p>
    </div>

    <div className="p-2 space-y-1">
      {item.children.map((child) => (
        <Link
          key={child.key}
          to={child.path}
          onClick={() => {
            closeMobile();
            setHoverMenu(null);
          }}
          state={
            child.master
              ? { master: child.master }
              : child.report
              ? { report: child.report }
              : { module: child.module }
          }
          className={`block rounded-lg px-3 py-2 text-sm transition
            ${
              isActive(child.path)
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-100"
            }
          `}
        >
          {child.name}
        </Link>
      ))}
    </div>
  </div>
)}
                </div>
              );
            })}
          </nav>

          {/* footer */}
        {/* footer */}
<div className="p-3 border-t border-gray-200">
  {!collapsed ? (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
      <div className="w-9 h-9 rounded-full bg-[#264d86] text-white flex items-center justify-center font-semibold">
        {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {user?.name || user?.username || "User"}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {user?.role || "User"}
        </p>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-1">
        <button
          title="Profile"
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => {
            // Navigate to profile
            navigate("/profile");
          }}
        >
          <UserPen size={18} className="text-gray-600" />  
        </button>

        <button
          title="Logout"
          className="p-2 rounded-lg hover:bg-red-100 transition-colors"
         onClick={handleLogout}
        >
          <LogOut size={18} className="text-red-500" />
        </button>
      </div>
    </div>
  )  : (
  <div className="flex flex-col items-center gap-3">
   

    {/* Profile */}
    <button
      title="Profile"
      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      onClick={() => {
        // Navigate to profile
        navigate("/profile");
      }}
    >
      <UserPen size={18} className="text-gray-600" />
    </button>

    {/* Logout */}
    <button
      title="Logout"
      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
     onClick={handleLogout}
    >
      <LogOut size={18} className="text-red-500" />
    </button>

     {/* User Avatar */}
    <div
      className="w-10 h-10 rounded-full bg-[#264d86] text-white flex items-center justify-center font-semibold"
      title={user?.name || user?.username || "User"}
    >
      {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
    </div>
  </div>
)}
</div>
        </div>
      </aside>
    </>
  );
}