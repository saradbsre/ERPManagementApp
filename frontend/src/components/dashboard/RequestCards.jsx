import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signupRequest, fetchForgotPasswordReqs } from "../../api/api";

export default function SignupRequestsCard() {
  const [requests, setRequests] = useState([]);
  const navigate = useNavigate();

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await signupRequest();
        const forgotPasswordReqs = await fetchForgotPasswordReqs();

        setRequests([
          ...(result?.data || result || []),
          ...(forgotPasswordReqs?.data || forgotPasswordReqs || [])
        ]);
      } catch (err) {
        console.error(err);
        setRequests([]);
      }
    };

    fetchData();
  }, []);

  // NAVIGATE
  const handleAcceptAll = () => {
    navigate("/admin", {
  state: { activeTab: 1, requests }
});
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl  w-full h-96 overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">

        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Signup Requests
          </h2>

          <p className="text-xs text-gray-400">
            Pending approvals waiting review
          </p>
        </div>

        {/* BUTTON */}
        <button
          onClick={handleAcceptAll}
          disabled={requests.length === 0}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm
            ${
              requests.length > 0
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          Review All ({requests.length})
        </button>

      </div>

      {/* LIST */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">

        {requests.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            No pending requests 
          </div>
        )}

        {requests.map((req, index) => (
          <div
            key={req.id || index}
            className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >

            {/* LEFT */}
            <div className="flex items-center gap-3">

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {(req.name || "U").charAt(0).toUpperCase()}
              </div>

              {/* INFO */}
              <div>
                <p className="font-medium text-gray-800">
                  {req.name || "Unknown User"}
                </p>
                <p className="text-xs text-gray-500">
                  {req.email || "No email"}
                </p>
              </div>

            </div>

            {/* BADGE */}
            <span className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
              Pending
            </span>

          </div>
        ))}

      </div>
    </div>
  );
}