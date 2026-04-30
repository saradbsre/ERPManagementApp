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
        setRequests([...result?.data || result || [], ...forgotPasswordReqs?.data || forgotPasswordReqs || []]);
      } catch (err) {
        console.error(err);
        setRequests([]);
      }
    };

    fetchData();
  }, []);

  // ACCEPT ALL
  const handleAcceptAll = () => {
    navigate("/admin/approvals", {
      state: { requests }
    });
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-lg">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">
          Signup Requests
        </h2>

        {/* COMMON BUTTON */}
        <button
          onClick={handleAcceptAll}
          disabled={requests.length === 0}
          className={`px-4 py-2 rounded-lg text-white transition
            ${
              requests.length > 0
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gray-300 cursor-not-allowed"
            }
          `}
        >
          Accept
        </button>
      </div>

      {/* CARDS LIST (READ ONLY) */}
      <div className="space-y-3 max-h-80 overflow-y-auto">

        {requests.length === 0 && (
          <p className="text-gray-400 text-sm">
            No signup requests
          </p>
        )}

        {requests.map((req) => (
          <div
            key={req.id}
            className="p-4 rounded-xl border bg-gray-50 flex justify-between items-center hover:shadow-sm transition"
          >
            {/* LEFT */}
            <div>
              <p className="font-medium text-gray-800">
                {req.name || "Unknown User"}
              </p>
              <p className="text-xs text-gray-500">
                {req.email || "No email"}
              </p>
            </div>

            {/* RIGHT BADGE */}
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
        ))}

      </div>
    </div>
  );
}