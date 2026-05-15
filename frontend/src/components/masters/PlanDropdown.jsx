import { useState, useMemo, useRef, useEffect } from "react";

export default function PlanDropdown({
  unmappedPlans,
  selectedPlanToAdd,
  setSelectedPlanToAdd
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const wrapperRef = useRef(null);

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    return unmappedPlans.filter(p =>
      p.plan_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, unmappedPlans]);

  return (
    <div ref={wrapperRef} className="relative w-full">

      {/* INPUT (opens dropdown) */}
      <input
        type="text"
        placeholder="Select or search plan"
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
          setSelectedPlanToAdd("");
        }}
        className="border px-3 py-2 rounded w-full focus:outline-blue-400"
      />

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-56 overflow-auto">

          {filtered.length === 0 && (
            <div className="p-3 text-sm text-gray-400">
              No plans found
            </div>
          )}

          {filtered.map((plan) => (
            <div
              key={plan.id}
              onClick={() => {
                setSelectedPlanToAdd(plan.id);
                setSearch(plan.plan_name);
                setOpen(false);
              }}
              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer"
            >
              {plan.plan_name}
            </div>
          ))}

        </div>
      )}

    </div>
  );
}