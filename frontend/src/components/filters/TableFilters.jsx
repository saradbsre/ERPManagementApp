import { useEffect, useState } from "react";

export default function TableFilters({
  masterList = [],
  filters,
  setFilters,
  currencies = []   // ✅ ADD THIS
}) {
  const [open, setOpen] = useState(false);

  // ================= MASTER LIST =================
  const masterList1 = [
    ...new Set([...(masterList || []), "currency"])
  ];

  // ================= GET OPTIONS =================
  const getOptions = (master) => {
    if (master === "currency") {
      // 👉 take from API
      return currencies.map(c => c.currency_code);
    }

    return []; // later you can extend for other masters
  };

  // ================= ADD FILTER =================
  const addFilter = (master) => {
    if (filters.some(f => f.master === master)) return;

    setFilters(prev => [
      ...prev,
      {
        master,
        values: []
      }
    ]);

    setOpen(false);
  };

  return (
    <div className="relative">

      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200"
      >
        🔍 Filters ({filters.length})
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-2 bg-white border rounded-xl shadow-lg w-64 max-h-72 overflow-auto">

          <div className="px-3 py-2 border-b text-sm font-semibold">
            Select Filter
          </div>

          {masterList1.map((master, i) => (
            <div
              key={i}
              onClick={() => addFilter(master)}
              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between"
            >
              <span>{master}</span>

              {filters.some(f => f.master === master) && (
                <span className="text-blue-500 text-xs">✓</span>
              )}
            </div>
          ))}

        </div>
      )}

    </div>
  );
}