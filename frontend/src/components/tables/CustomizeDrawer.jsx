import React, { useMemo, useState, useRef, useEffect } from "react";

export default function CustomizeDrawer({
  open,
  onClose,
  columns,
  visibleColumns,
  tempSelectedColumns,
  setTempSelectedColumns,
  selectedCompany,
  setSelectedCompany,
  companyList,
  printModuleName,
  setPrintModuleName,
  module,
}) {
  const [openPrinter, setOpenPrinter] = useState(false);
  const initializedRef = useRef(false);

  const STORAGE_KEY = "print-company";

  // ================= INIT TEMP COLUMNS =================
  useEffect(() => {
    if (open && !initializedRef.current) {
      setTempSelectedColumns(
        visibleColumns.map((c) => c.column_name)
      );
      initializedRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
    }
  }, [open]);

  // ================= LOAD SAVED COMPANY =================
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSelectedCompany(saved);
      }
    }
  }, [open]);

  // ================= SAVE COMPANY =================
  const handleSaveCompany = () => {
    localStorage.setItem(STORAGE_KEY, selectedCompany || "");
  };

  // ================= SORT COLUMNS =================
  const sortedColumns = useMemo(() => {
    const visSet = new Set(
      visibleColumns?.map((v) => v.column_name)
    );

    const vis = columns.filter((c) =>
      visSet.has(c.column_name)
    );

    const rest = columns.filter(
      (c) => !visSet.has(c.column_name)
    );

    return [...vis, ...rest];
  }, [columns, visibleColumns]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-[520px] bg-white z-50 shadow-2xl flex flex-col">

        {/* HEADER */}
        <div className="p-4 border-b flex justify-between">
          <h2 className="font-semibold text-lg">
            Customize Export
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-auto p-4 space-y-4">

          {/* ================= PRINTER CUSTOM ================= */}
          <div>

            <button
              onClick={() => setOpenPrinter(!openPrinter)}
              className="w-full flex justify-between p-3 bg-gray-50 font-medium"
            >
              Printer Custom
              <span>{openPrinter ? "▲" : "▼"}</span>
            </button>

            {openPrinter && (
              <div className="p-4 space-y-4">

                {/* COMPANY HEADER */}
                <div>
                  <label className="text-sm font-medium">
                    Company Header
                  </label>

                  <select
                    value={selectedCompany}
                    onChange={(e) =>
                      setSelectedCompany(e.target.value)
                    }
                    className="w-full border rounded p-2 mt-1"
                  >
                    <option value="">
                      Default Company
                    </option>

                    {companyList.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUB HEADER */}
                <div>
                  <label className="text-sm font-medium">
                    Sub Header
                  </label>

                  <input
                    value={printModuleName}
                    onChange={(e) =>
                      setPrintModuleName(e.target.value)
                    }
                    className="w-full border rounded p-2 mt-1"
                    placeholder="Module Name"
                  />
                </div>

                {/* PREVIEW */}
                <div className="p-3 bg-gray-50 border rounded">
                  <div className="font-semibold">
                    {selectedCompany || "Company"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {printModuleName || module?.display_name}
                  </div>
                </div>

                {/* SAVE BUTTON */}
                <button
                  onClick={handleSaveCompany}
                  disabled={!selectedCompany}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Company
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}