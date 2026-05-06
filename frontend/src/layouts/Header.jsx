import { useState, useEffect } from "react";
import { FiLogOut, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";
import { logOut } from "../api/api";

export default function Header() {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logOut();

      localStorage.removeItem("user");
      setUser(null);

      window.dispatchEvent(new Event("storage"));
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

//   useEffect(() => {
//   const handler = () => setOpen(false);
//   window.addEventListener("click", handler);
//   return () => window.removeEventListener("click", handler);
// }, []);

  const name = user?.email || "User";
  const initial = name?.charAt(0)?.toUpperCase();

  return (
    <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-end px-6 sticky top-0 z-50">

      {/* PROFILE DROPDOWN */}
      <div className="relative">

        {/* Avatar Button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
            {initial}
          </div>

          <span className="text-sm text-gray-700 hidden sm:block">
            {name}
          </span>
        </button>

        {/* DROPDOWN */}
        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg overflow-hidden">

            {/* User Info */}
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-800">
                {name}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role || "User"}
              </p>
            </div>

            {/* Menu Items */}
            <div className="py-2">

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