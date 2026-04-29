import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";
import { logOut } from "../api/api";

export default function Header() {
    const navigate = useNavigate();
    const { setUser } = useUser();

    const handleLogout = async () => {
    try {
        await logOut(); // server-side session remove

        // clear frontend session
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser({});

        // redirect to login
        navigate("/");

    } catch (error) {
        console.error("Logout failed:", error);
    }
};

    return (
        <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 
                        flex items-center justify-end px-6 ml-64 sticky top-0 z-50">

            {/* Right actions */}
            <div className="flex items-center gap-4">

                {/* Optional user chip */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        U
                    </div>
                    <span className="text-sm text-gray-700">User</span>
                </div>

                {/* Logout button */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl 
                               bg-red-50 text-red-600 hover:bg-red-100 
                               transition-all duration-200 text-sm font-medium"
                >
                    <FiLogOut size={16} />
                    Logout
                </button>

            </div>

        </div>
    );
}