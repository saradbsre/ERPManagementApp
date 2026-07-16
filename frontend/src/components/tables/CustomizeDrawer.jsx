import React, { useMemo, useState, useRef, useEffect } from "react";

export default function CustomizeDrawer({
  open,
  onClose,

  // ================= COLUMNS (optional) =================
  columns = [],
  visibleColumns = [],
  tempSelectedColumns,
  setTempSelectedColumns,

  // ================= PRINTER =================
  selectedCompany,
  setSelectedCompany,
  companyList = [],

  // ================= SUB HEADER (optional but supported) =================
  printModuleName,
  setPrintModuleName,

  customPrintHeader,
setCustomPrintHeader,

  module,
}) {
  const [openPrinter, setOpenPrinter] = useState(false);
  const initializedRef = useRef(false);
  //console.log("company list:", companyList);
  const STORAGE_KEY = "print-company";

  // ================= INIT COLUMNS SAFELY =================
  useEffect(() => {
    if (!open) return;

    if (
      Array.isArray(visibleColumns) &&
      typeof setTempSelectedColumns === "function" &&
      !initializedRef.current
    ) {
      setTempSelectedColumns(
        visibleColumns.map((c) => c.column_name)
      );
      initializedRef.current = true;
    }
  }, [open, visibleColumns, setTempSelectedColumns]);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
    }
  }, [open]);

  // ================= LOAD COMPANY =================
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && setSelectedCompany) {
        setSelectedCompany(saved);
      }
    }
  }, [open, setSelectedCompany]);

  // ================= SAVE COMPANY =================
  const handleSaveCompany = () => {
    if (!selectedCompany) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, selectedCompany);
  };

  // ================= SAFE SORT =================
  const sortedColumns = useMemo(() => {
    const visSet = new Set(
      (visibleColumns || []).map((v) => v.column_name)
    );

    const vis = (columns || []).filter((c) =>
      visSet.has(c.column_name)
    );

    const rest = (columns || []).filter(
      (c) => !visSet.has(c.column_name)
    );

    return [...vis, ...rest];
  }, [columns, visibleColumns]);

  if (!open) return null;

  return (
    <>
      {/* OVERLAY */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* DRAWER */}
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
                    value={selectedCompany || ""}
                    onChange={(e) => {
                      const value = e.target.value;

                      setSelectedCompany?.(value);

                      if (!value) {
                        localStorage.removeItem(STORAGE_KEY);
                      }
                    }}
                    className="w-full border rounded p-2 mt-1"
                  >
                    <option value="">No Header</option>

                    {companyList.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Print Header / Company Name */}
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Print Header
  </label>

  <input
    type="text"
    value={customPrintHeader}
    onChange={(e) => {
      setCustomPrintHeader(e.target.value);
      localStorage.setItem("print_custom_header", e.target.value);
    }}
    placeholder="Enter report header / company name"
    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>



                {/* SUB HEADER (OPTIONAL BUT ALWAYS SUPPORTED) */}
                {typeof setPrintModuleName === "function" && (
                  <div>
                    <label className="text-sm font-medium">
                      Sub Header
                    </label>

                    <input
                      value={printModuleName || ""}
                      onChange={(e) =>
                        setPrintModuleName?.(e.target.value)
                      }
                      className="w-full border rounded p-2 mt-1"
                      placeholder="Module Name"
                    />
                  </div>
                )}

                {/* SAVE */}
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