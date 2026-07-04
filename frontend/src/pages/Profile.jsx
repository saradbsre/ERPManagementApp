import React, { useState } from "react";
import UserProfileCard from "../components/profiles/PersInfo";
import Settings from "../components/profiles/Settings";
import AccountCenter from "../components/profiles/AccountInfo";



const tabs = [
    // { label: "Personal Info", component: <UserProfileCard /> },
    // { label: "Settings", component: <Settings /> },
    { label: "Account Info", component: <AccountCenter /> }
];

export default function Profile() {
    const [activeTab, setActiveTab] = useState(0);

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