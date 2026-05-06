import SideBar from "./SideBar";
import Navbar from "./Header";
import { Outlet } from "react-router-dom"; 

export default function Layout({ children }) {
    return (
        <div className="flex">
            <SideBar />
            <div
                className="flex flex-col min-w-0 ml-64"
                style={{
                    width: "1824px",   // 19 inches
                    height: "2112px",  // 22 inches
                    maxWidth: "100vw",
                    maxHeight: "100vh",
                    background: "#f3f4f6" // same as bg-gray-100
                }}
            >
                <Navbar />
                <div className="p-6 min-w-0 overflow-x-hidden flex-1">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}