import { use, useState } from "react";
import { FiLogOut, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { useUser } from "../components/UserContext";
import { logOut } from "../api/api";

export default function Header() {
  const navigate = useNavigate();

  const { user, setUser } = useUser();

  const [open, setOpen] = useState(false);

 // console.log("Header component rendered with user:", user);

  // =========================
  // LOGOUT
  // =========================
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

  // =========================
  // USER DETAILS
  // =========================
  const name =
    user?.name ||
    "User";

  const initial =
    name?.charAt(0)?.toUpperCase() || "U";

  return (
    // <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-50" style={{ display:"none" }}>
      <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-30 md:z-50">
      {/* PROFILE DROPDOWN */}
      <div className="relative" style={{ display:"none" }}>

        {/* AVATAR BUTTON */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition"
        >
          {/* AVATAR */}
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>

          {/* NAME */}
          <span className="text-sm text-gray-700 hidden sm:block">
            {name}
          </span>
        </button>

        {/* DROPDOWN */}
        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg overflow-hidden">

            {/* USER INFO */}
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-800">
                {user?.email || "User"}
              </p>

              <p className="text-xs text-gray-500">
                {user?.role || "User"}
              </p>
            </div>

            {/* MENU */}
            <div className="py-2">

              {/* PROFILE */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setOpen(false);
                  navigate("/profile");
                }}
              >
                <FiUser />
                Profile
              </button>

              {/* LOGOUT */}
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <FiLogOut />
                Logout
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}