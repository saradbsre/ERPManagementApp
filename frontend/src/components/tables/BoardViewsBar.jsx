import React from "react";
import {
  TableCellsIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ViewColumnsIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function BoardViewsBar({
  views = [],
  activeViewId,
  setActiveViewId,
  onMainViewClick,
  onTableViewClick,
  onApplyView,
  showViewDropdown,
  setShowViewDropdown,
  onCreateTableView,
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-4">
      <div className="flex items-center gap-1">

        <button
          onClick={() => {
            setActiveViewId("main");
            onMainViewClick?.();
          }}
          className={`px-4 py-3 text-sm border-b-2 ${
            activeViewId === "main"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Main View
        </button>

        {/* <button
          onClick={() => {
            setActiveViewId("table");
            onTableViewClick?.();
          }}
          className={`px-4 py-3 text-sm border-b-2 flex items-center gap-2 ${
            activeViewId === "table"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <TableCellsIcon className="w-4 h-4" />
          Table
        </button> */}

        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => {
              setActiveViewId(view.id);
              onApplyView?.(view);
            }}
            className={`px-4 py-3 text-sm border-b-2 max-w-[180px] truncate ${
              String(activeViewId) === String(view.id)
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
            title={view.view_name}
          >
            {view.view_name}
          </button>
        ))}

        <div className="relative">
          <button
            onClick={() => setShowViewDropdown((prev) => !prev)}
            className="ml-1 px-3 py-2 rounded-md text-lg hover:bg-gray-100"
          >
            +
          </button>

          {showViewDropdown && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
              <div className="px-4 py-3 border-b">
                <div className="font-semibold text-gray-700">
                  Board views
                </div>
                <div className="text-xs text-gray-400">
                  Create a new view
                </div>
              </div>

              <button
                onClick={() => {
                  onCreateTableView?.();
                  setShowViewDropdown(false);
                }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
              >
                <TableCellsIcon className="w-5 h-5 text-gray-500" />
                Table
              </button>

             
            </div>
          )}
        </div>

      </div>
    </div>
  );
}