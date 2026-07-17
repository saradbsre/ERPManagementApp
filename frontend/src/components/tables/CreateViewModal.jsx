import React from "react";

export default function CreateViewModal({
  open,
  onClose,
  newViewName,
  setNewViewName,
  newViewType,
  setNewViewType,
  newViewVisibility,
  setNewViewVisibility,
  onCreate,
  activeUser,
  editingView,
}) {
  if (!open) return null;

  const isAdmin =
    String(activeUser?.role || "").toLowerCase() === "admin";

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden">

        <div className="px-5 py-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Create New View
            </h2>
            <p className="text-xs text-gray-500">
              Save current filters, columns, sort and group settings.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-red-50 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Name
            </label>
            <input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Example: July Invoices"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Type
            </label>
            <select
              value={newViewType}
              onChange={(e) => setNewViewType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="table">Table</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Access
            </label>
           <select
            value={newViewVisibility}
            onChange={(e) => setNewViewVisibility(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            >
            <option value="USER">Only Me</option>

            {(activeUser?.role === "ADMIN" || activeUser?.role === "SUPERADMIN") && (
                <option value="GLOBAL">Everyone</option>
            )}
            </select>
          </div>

        </div>

        <div className="px-5 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
          >
            Cancel
          </button>

        <button
  onClick={onCreate}
  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
>
  {editingView ? "Update View" : "Create View"}
</button>
        </div>

      </div>
    </div>
  );
}