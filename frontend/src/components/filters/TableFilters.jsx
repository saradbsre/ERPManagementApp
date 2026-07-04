import { useEffect, useState } from "react";
import { getMasterValues } from "../../api/api";

export default function TableFilters({
  masterList = [],
  filters,
  setFilters,
  currencies = [],   // ✅ ADD THIS
  masterDataMap,
  setMasterDataMap,
}) {
 // console.log("Rendering TableFilters with masterList:", masterList);
  const [open, setOpen] = useState(false);
 



  // ================= MASTER LIST =================
  const masterList1 = [
  ...(masterList || []),
  { master: "currency", display_name: "Currency" }
];

 // console.log("Master List for Filters:", masterList1);

  // ================= GET OPTIONS =================
const getOptions = (master) => {
  if (master === "currency") {
    return currencies.map(c => c.currency_code);
  }

  return (masterDataMap[master] || []).map(item => item.value);
};

  // ================= ADD FILTER =================
   const addFilter = async (master) => {

  if (filters.some(f => f.master === master)) return;

  setFilters(prev => [
    ...prev,
    {
      master,
      values: []
    }
  ]);

  try {
    const res = await getMasterValues(master);

    const data = res?.data?.data || [];

    setMasterDataMap(prev => ({
      ...prev,
      [master]: data
    }));

  } catch (err) {
    console.error("Failed to load master:", master, err);
  }

  setOpen(false);
};

  return (
    <div className="relative">

      {/* BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200"
      >
         Filters ({filters.length})
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-2 bg-white border rounded-xl shadow-lg w-64 max-h-72 overflow-auto">

          <div className="px-3 py-2 border-b text-sm font-semibold">
            Select Filter
          </div>

         {masterList1.map((item, i) => (
  <div
    key={i}
    onClick={() => addFilter(item.master)}
    className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between"
  >
    <span>{item.display_name}</span>

    {filters.some(f => f.master === item.master) && (
      <span className="text-blue-500 text-xs">✓</span>
    )}
  </div>
))}

        </div>
      )}

    </div>
  );
}