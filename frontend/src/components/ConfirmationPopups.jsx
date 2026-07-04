// components/ConfirmModal.jsx

import React from "react";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // danger | warning | info
  onConfirm,
  onClose
}) {
  if (!open) return null;

  const styles = {
    danger: {
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      button: "bg-red-600 hover:bg-red-700"
    },
    warning: {
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      button: "bg-yellow-500 hover:bg-yellow-600"
    },
    info: {
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700"
    }
  };

  const current = styles[type];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">

      <div className="w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="px-6 pt-6 flex items-start gap-4">

          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${current.iconBg}`}
          >
            <span className={`text-2xl ${current.iconColor}`}>
              {type === "danger"
                ? "🗑️"
                : type === "warning"
                ? "⚠️"
                : "ℹ️"}
            </span>
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">
              {title}
            </h2>

            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {message}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-5 mt-4 bg-gray-50 border-t">

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-white text-sm font-medium shadow-md transition ${current.button}`}
          >
            {confirmText}
          </button>

        </div>

      </div>

    </div>
  );
}