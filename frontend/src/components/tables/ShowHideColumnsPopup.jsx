import React, { useEffect, useMemo, useRef, useState } from "react";

export default function ShowHideColumnsPopup({
  columns,
  tempHideColumns,
  setTempHideColumns,
  onSave,
  onCancel,
  anchorPosition,
}) {
  const [search, setSearch] = useState("");
  const panelRef = useRef(null);
  const allColumnNames = columns.map((c) => c.column_name);

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((c) =>
      String(c.display_name || c.column_name || "")
        .toLowerCase()
        .includes(q)
    );
  }, [columns, search]);

  const panelWidth = 340;
  const gutter = 12;
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 900;

  const preferredLeft = (anchorPosition?.left ?? 0) + 236;
  const maxLeft = viewportWidth - panelWidth - gutter;
  const panelLeft = Math.max(gutter, Math.min(preferredLeft, maxLeft));
  const panelTop = Math.max(gutter, Math.min((anchorPosition?.top ?? 120) - 6, viewportHeight - 520));

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onCancel();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [onCancel]);

  return (
    <div
      ref={panelRef}
      className="fixed z-[10000] w-[340px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
      style={{ top: panelTop, left: panelLeft }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-slate-100 px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-slate-800">
            Show / Hide Columns
          </div>
          <button
            className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-200"
            onClick={onCancel}
          >
            ✕
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {tempHideColumns.length} / {allColumnNames.length} selected
        </div>
      </div>

      <div className="p-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search columns..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <div className="flex items-center justify-between text-sm">
          <button
            className="rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 hover:bg-blue-100"
            onClick={() => setTempHideColumns(allColumnNames)}
          >
            Select All
          </button>
          <button
            className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700 hover:bg-rose-100"
            onClick={() => setTempHideColumns([])}
          >
            Clear All
          </button>
        </div>

        <div className="max-h-72 overflow-auto rounded-xl border border-slate-100 p-2">
          {filteredColumns.map((c) => (
            <label
              key={c.column_id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={tempHideColumns.includes(c.column_name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setTempHideColumns((prev) => [
                      ...prev,
                      c.column_name,
                    ]);
                  } else {
                    setTempHideColumns((prev) =>
                      prev.filter(
                        (x) => x !== c.column_name
                      )
                    );
                  }
                }}
              />

              <span className="text-sm text-slate-700">{c.display_name}</span>
            </label>
          ))}

          {filteredColumns.length === 0 && (
            <div className="px-2 py-3 text-sm text-slate-500">
              No columns found.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            className="px-3 py-1.5 text-slate-600 rounded-lg hover:bg-slate-100"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}