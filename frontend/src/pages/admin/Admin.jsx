import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import UserList from "../../components/admin/UserList";
import RoleAccess from "../../components/admin/RoleAccess";
import Approvals from "../../components/admin/Approvals";
import Sections from "../../components/sections/Sections";
import Masters from "../../components/masters/Masters";
import Logs from "../../components/admin/Logs";


const tabs = [
    { label: "Users", component: <UserList /> },
    { label: "Approvals", component: <Approvals /> },
    { label: "Roles & Permissions", component: <RoleAccess /> },
    { label: "Sections", component: <Sections /> },
    // { label: "Masters", component: <Masters /> },
    { label: "Logs", component: <Logs /> },

];

export default function Admin() {
    const location = useLocation();
    const initialTab = location.state?.activeTab ?? 0;
    const [activeTab, setActiveTab] = useState(initialTab);

    return (
        <div>
            {/* <h1 className="text-3xl font-bold mb-6">Admin Panel</h1> */}
            <div className="bg-white p-6 rounded shadow">
                {/* Tabs */}
                <div className="border-b mb-4">
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab, idx) => (
                            <button
                                key={tab.label}
                                onClick={() => setActiveTab(idx)}
                                className={`pb-2 px-1 text-lg font-semibold ${
                                    activeTab === idx
                                        ? "text-blue-600 border-b-2 border-blue-600"
                                        : "text-gray-500 hover:text-blue-600"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                {/* Tab Content */}
                <div className="mt-4">
                    {tabs[activeTab].component}
                </div>
            </div>
        </div>
    );
}