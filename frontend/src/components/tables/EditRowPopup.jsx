import React, { useState } from "react";
import { isNumericColumn, handleNumericInput } from "../../utils/numberValidation";
import Loader from "../Loader";

export default function EditRowPopup({
  visibleColumns,
  editRow,
  setEditRow,
  onSave,
  onClose,
  getMasterOptions,
  columns,
  loadingMaster,
  fetchMasterDataForColumn,
  serviceProviders = [],
  vatPercent = 0,
}) {
  const [activeField, setActiveField] = useState(null);
  const [fieldSearch, setFieldSearch] = useState({});

  if (!editRow) return null;

  const formatForInput = (value) => {
    if (!value) return "";
    return String(value).split("T")[0];
  };

  const handleFieldChange = (col, value) => {
    let val = value;

    // Remove mask for credit cards
    if (col.master === "credit_card") {
      val = val.replace(/\D/g, "");
    }

    // Handle numeric columns
    if (isNumericColumn(col.column_name)) {
      val = handleNumericInput(val);
    }

    setEditRow((prev) => {
      const updatedRow = {
        ...prev,
        [col.column_name]: val,
      };

      // Keep popup behavior aligned with CTable edit calculations.
      const triggerColumns = ["amount", "vend_code", "prd_code"];

      if (triggerColumns.includes(col.column_name)) {
        let matchedProvider = null;

        if (updatedRow.vend_code) {
          matchedProvider = serviceProviders.find(
            (sp) =>
              String(sp.vend_code || "").trim().toLowerCase() ===
              String(updatedRow.vend_code || "").trim().toLowerCase()
          );
        }

        if (!matchedProvider && updatedRow.prd_code) {
          matchedProvider = serviceProviders.find(
            (sp) =>
              String(sp.prd_name || "").trim().toLowerCase() ===
              String(updatedRow.prd_code || "").trim().toLowerCase()
          );
        }

        const amount = parseFloat(updatedRow.amount || 0);

        if (!Number.isNaN(amount)) {
          if (matchedProvider?.prd_is_vat) {
            const vat = (amount * Number(vatPercent || 0)) / 100;
            updatedRow.vat_amount = vat.toFixed(2);
            updatedRow.total_amount = (amount + vat).toFixed(2);
          } else {
            updatedRow.vat_amount = "0.00";
            updatedRow.total_amount = amount.toFixed(2);
          }
        }
      }

      return updatedRow;
    });
  };

  const handleFieldFocus = (col) => {
    setActiveField(col.column_name);
    if (col.master) {
      fetchMasterDataForColumn?.(col.master);
    }
    setFieldSearch((prev) => ({
      ...prev,
      [col.column_name]: "",
    }));
  };

  const getOptionLabel = (opt) => {
    if (typeof opt !== "object" || opt == null) {
      return String(opt ?? "");
    }
    return String(
      opt.value ?? opt.name ?? opt.vend_name ?? opt.prd_name ?? opt.prdtype_code ?? opt.label ?? ""
    );
  };

  const getOptionKey = (opt) => {
    if (typeof opt !== "object" || opt == null) {
      return String(opt ?? "");
    }
    return String(
      opt.key ?? opt.code ?? opt.vend_code ?? opt.prd_code ?? opt.prdtype_code ?? opt.id ?? getOptionLabel(opt)
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Edit Record</h2>
            
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleColumns.map((col) => {
              const isMaster = !!col.master;
              const isDate = col.data_type?.toLowerCase().includes("date");
              const isDisabled =
                col.column_name === "total_amount_aed" ||
                col.column_name === "vat_amount" ||
                col.column_name === "total_amount" ||
                col.column_name === "prf_num";

              const currentValue = (() => {
                const raw = editRow[col.column_name];

                if (col.column_name === "total_amount_aed") {
                  return raw || "";
                }

                if (isDate) {
                  return formatForInput(raw);
                }

                if (col.master === "credit_card" && raw) {
                  const last4 = String(raw).slice(-4);
                  return `**** **** **** ${last4}`;
                }

                if (typeof raw === "object") {
                  return raw?.value ?? raw?.name ?? raw?.vend_name ?? raw?.label ?? "";
                }

                return raw ?? "";
              })();

              const searchText = fieldSearch[col.column_name] || "";
              const options = isMaster ? getMasterOptions(col, searchText, editRow) : [];

              const filteredOptions = options.filter((opt) => {
                const search = String(searchText || "").toLowerCase();
                const optValue = getOptionLabel(opt).toLowerCase();
                return optValue.includes(search);
              });

              const isDropdownOpen = activeField === col.column_name && isMaster;

              return (
                <div key={col.column_id} className="space-y-2 relative">
                  <label className="block text-xs font-medium text-gray-700">
                    {col.display_name}
                  </label>

                  <div className="relative">
                    <input
                      type={isNumericColumn(col.column_name) ? "number" : isDate ? "date" : "text"}
                      value={currentValue}
                      disabled={isDisabled}
                      onChange={(e) => handleFieldChange(col, e.target.value)}
                      onFocus={() => {
                        if (isMaster) {
                          handleFieldFocus(col);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          const dropdownEl = document.querySelector(
                            `[data-popup-dropdown="${col.column_name}"]`
                          );
                          const activeEl = document.activeElement;

                          if (dropdownEl && activeEl && dropdownEl.contains(activeEl)) {
                            return;
                          }

                          setActiveField(null);
                        }, 150);
                      }}
                      placeholder={col.display_name}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-500"
                    />

                    {/* LOADER */}
                    {isMaster && loadingMaster === col.master && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader type="dots" />
                      </div>
                    )}

                    {/* DROPDOWN */}
                    {isDropdownOpen && loadingMaster !== col.master && (
                      <div
                        data-popup-dropdown={col.column_name}
                        className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto"
                      >
                        {/* Search box in dropdown */}
                        <div className="sticky top-0 p-2 border-b bg-gray-50">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={searchText}
                            onChange={(e) =>
                              setFieldSearch((prev) => ({
                                ...prev,
                                [col.column_name]: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {filteredOptions.length > 0 ? (
                          filteredOptions.map((opt, idx) => {
                            const optValue = getOptionLabel(opt);
                            const optKey = getOptionKey(opt);
                            const isSelected =
                              String(currentValue).toLowerCase() ===
                              String(optValue).toLowerCase() ||
                              String(currentValue).toLowerCase() ===
                              String(optKey).toLowerCase();

                            return (
                              <div
                                key={idx}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleFieldChange(col, optValue);
                                  setActiveField(null);
                                }}
                                className={`px-3 py-2 text-sm cursor-pointer transition ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-700 font-medium"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                              >
                                {optValue}
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-400 text-center">
                            No results found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm font-medium transition"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium shadow-md transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}