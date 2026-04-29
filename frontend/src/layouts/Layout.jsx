import SideBar from "./SideBar";
import Navbar from "./Header";
import { Outlet } from "react-router-dom"; 

export default function Layout({ children }) {
    return (
        <div className="flex">
            <SideBar />
            <div className="flex-1 ml-64 flex flex-col min-w-0">
                <Navbar />
                <div className="p-6 bg-gray-100 min-h-screen min-w-0 overflow-x-hidden">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}