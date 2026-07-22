import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserProfileCard from "../components/profiles/PersInfo";
import Settings from "../components/profiles/Settings";
import AccountCenter from "../components/profiles/AccountInfo";
import { ArrowLeft } from "lucide-react";



const tabs = [
    // { label: "Personal Info", component: <UserProfileCard /> },
    // { label: "Settings", component: <Settings /> },
    { label: "Account Info", component: <AccountCenter /> }
];

export default function Profile() {
    const [activeTab, setActiveTab] = useState(0);
    const navigate = useNavigate();

    return (
            <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-2 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-200 rounded-lg transition"
        >
          <ArrowLeft size={24} />
        </button>

       <h1 className="text-xl font-semibold text-gray-800">
            Profile Settings
</h1>
      </div>
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