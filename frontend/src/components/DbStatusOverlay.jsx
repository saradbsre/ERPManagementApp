import React from "react";

export default function DbStatusOverlay({ dbStatus, onRetry }) {
  if (dbStatus === "connected") return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center  backdrop-blur-md z-50">

      {/* LOADING STATE */}
      {dbStatus === "loading" && (
        <div className="text-center text-white space-y-4">
          <div className="w-16 h-16 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto"></div>

          <h1 className="text-xl font-semibold text-black">
            Connecting to network...
          </h1>

          <p className="text-sm text-black">
            Please wait while we establish secure connection
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {dbStatus === "error" && (
        <div className="text-center text-white space-y-4 p-6">

          <div className="text-red-500 text-5xl">⚠️</div>

          <h1 className="text-2xl font-bold text-red-400">
            Network / Database Issue
          </h1>

          <p className="text-sm text-black max-w-md">
            Unable to connect to the system. Please check your internet or try again.
          </p>

          <button
            onClick={onRetry}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
          >
            Retry Connection
          </button>

        </div>
      )}

    </div>
  );
}