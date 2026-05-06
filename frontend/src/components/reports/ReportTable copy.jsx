// table with crud operations, filters, search, pagination, column selector, export, print etc. created at 2026-05-05 by Agalya (same as CTable but with report specific features like total row, cost calculation, print options etc.)
import { useEffect, useState, useRef, act } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, exportColumnNames, importTable, getMasterValues, currencises, exportPdf, getProviderPlans,upsertSavedFilter  } from "../../api/api";
import { openPrintWindow } from "../../utils/PrintHelper";
import logo from "../../assets/headero.png";
import TableFilters from "../filters/TableFilters";
import { applyFilters } from "../../utils/applyFilters";
import { exportToExcel } from "../../utils/export";
import { getAlignClass } from "../../utils/leftAlign";
import { isNumericColumn, handleNumericInput } from "../../utils/numberValidation";
import { isAmountField, isTotalField, hasAnyAmountValue } from "../../utils/costHelpers";
import PermissionButton from "../PermissionButton";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatDate } from "../../utils/formatDate";
import { Currency } from "lucide-react";
import DateTimeRangeFilter from "../DateRangeFilter";


const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white p-5 rounded w-[400px] shadow">

            <h2 className="font-semibold mb-3">{title}</h2>

            {children}

            <div className="text-right mt-4">
                <button onClick={onClose} className="btn btn-gray">Close</button>
            </div>

        </div>
    </div>
);


export default function ReportPage() {
    const { id } = useParams();
    const location = useLocation();
    const [isCreating, setIsCreating] = useState(false);
    const [newRow, setNewRow] = useState({});
    const [editRowId, setEditRowId] = useState(null);
    const [editRow, setEditRow] = useState({});
    const [originalRow, setOriginalRow] = useState({});
    const [module, setModule] = useState(location.state?.module || null);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showImportExport, setShowImportExport] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [file, setFile] = useState(null);
    const printRef = useRef();
    const pageSize = 10;
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showPrintOptions, setShowPrintOptions] = useState(false);
    const [masterDataMap, setMasterDataMap] = useState({});
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [currencies, setCurrencies] = useState([]);
    const [filters, setFilters] = useState([]);
    const [openIndex, setOpenIndex] = useState(null);
    const dropdownRefs = useRef([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [printLogo, setPrintLogo] = useState(null);
    const activeUser = JSON.parse(localStorage.getItem("user"));
    const activeUserEmail = activeUser?.email;
  const [createAmount, setCreateAmount] = useState("");
const [createCurrency, setCreateCurrency] = useState("");
const [showCreateModal, setShowCreateModal] = useState(false);
const [providerPlansMap, setProviderPlansMap] = useState({});
const [providerPlans, setProviderPlans] = useState([]);
const [autoFilledFields, setAutoFilledFields] = useState({});
const [planManuallyChanged, setPlanManuallyChanged] = useState(false);
const [dateFilters, setDateFilters] = useState({});
const [activeDateFilter, setActiveDateFilter] = useState(null);
const [showSaveFilter, setShowSaveFilter] = useState(false);
const [saveFilterName, setSaveFilterName] = useState("");

const isFilterActive =
  search ||
  filters?.length > 0 ||
  Object.keys(dateFilters || {}).length > 0;

//const [newRow, setNewRow] = useState({});
const formatCard = (value, columnName) => {
  if (!value) return "-";

  const name = (columnName || "").toLowerCase();

  const isCard =
    name.includes("card") ||
    name.includes("credit_card") ||
    name.includes("card_number") ||
    name.includes("cardno") ||
    name.includes("card_no");

  if (!isCard) return value;

  const digits = value.toString().replace(/\D/g, ""); // remove spaces/dashes

  if (digits.length < 4) return "****";

  const last4 = digits.slice(-4);

  return `**** **** **** ${last4}`;
};

const normalize = (val) => {
  if (typeof val === "object") return val?.value ?? "";
  return val ?? "";
};

const isCreditCardColumn = (colName = "") => {
  const name = colName.toLowerCase();
  const result =  (
    name.includes("card") ||
    name.includes("credit_card") ||
    name.includes("card_number") ||
    name.includes("card_no")
  );
  //console.log(`Checking if "${colName}" is a credit card column:`, result);
  return result;
};

//console.log("Rendering CTable with columns:", columns);

const handleSaveFilter = async () => {
  if (!saveFilterName.trim()) {
    alert("Filter name is required");
    return;
  }

  const payload = {
    filter_name: saveFilterName.trim(),
    userid: activeUser?.email,
    filters: JSON.stringify({
      search,
      filters,
      dateFilters
    })
  };
  console.log("Saving filter with payload:", payload);

  await upsertSavedFilter(payload.userid, saveFilterName.trim(), payload.filters);

  setSaveFilterName("");
  setShowSaveFilter(false);

  loadSavedFilters();
};

useEffect(() => {
  if (isFilterActive) {
    setShowSaveFilter(true);
  } else {
    setShowSaveFilter(false);
    setSaveFilterName("");
  }
}, [search, filters, dateFilters]);

const applyTermMultiplier = (value, term) => {
  if (!value) return 0;

  if (term === "Yearly") return Number(value) * 12;
  return Number(value); // Monthly or default
};

useEffect(() => {
  if (!newRow.amount || !newRow.currency) return;

  const calc = calculateCost(
    newRow.amount,
    newRow.currency,
    newRow.term
  );

  if (calc === null) return;

  setNewRow(prev => ({
    ...prev,
    total_amount_aed: calc.toFixed(2)
  }));

}, [newRow.amount, newRow.currency, newRow.term]);

useEffect(() => {
  if (!editRowId) return;
  if (!editRow.amount || !editRow.currency) return;

  const calc = calculateCost(
    editRow.amount,
    editRow.currency,
    editRow.term
  );

  if (calc === null) return;

  setEditRow(prev => ({
    ...prev,
    total_amount_aed: calc.toFixed(2)
  }));

}, [editRow.amount, editRow.currency, editRow.term]);

 const formatForInput = (value) => {
  if (!value) return "";
  return value.split("T")[0]; // removes time safely
};
    const masterList = [
        ...new Set(columns.map(c => c.master).filter(Boolean))
    ];
    const [showTableColumnModal, setShowTableColumnModal] = useState(false);
    const [tableColumnMode, setTableColumnMode] = useState("default");
    // default | saved | custom
    const companyList = [
        ...new Set(rows.map(r =>
            r.trade_name || r.company_name || r.company || ""
        ).filter(Boolean))
    ];
   // console.log("Company List:", companyList);
    const [savedTableColumns, setSavedTableColumns] = useState(
        JSON.parse(localStorage.getItem(`table_columns_${id}`) || "[]")
    );

    const savePrintOptions = () => {
        localStorage.setItem("print_logo", printLogo || "");
        localStorage.setItem("print_company", selectedCompany || "");

        setShowPrintOptions(false);
    };
   

       const handleCreate = () => {
  setIsCreating(true);

  const empty = {};
  columns.forEach(col => {
    empty[col.column_name] = "";
  });

  setNewRow(empty);

  // ✅ RESET autofill tracking
  setAutoFilledFields({});
};

    const loadProviderPlans = async (providerId) => {
  if (!providerId) {
    setProviderPlans([]);
    return;
  }

  try {
    const res = await getProviderPlans(providerId);
    setProviderPlans(res.data || []);
  } catch (err) {
    console.error("Failed to load provider plans:", err);
    setProviderPlans([]);
  }
};
    

   const getVisibleColumns = () => {
  let cols = columns;

  // ✅ APPLY CURRENCY FILTER ON COLUMNS
  const currencyFilter = filters.find(f => f.master === "currency");

  if (currencyFilter && currencyFilter.values.length > 0) {
    const selectedCurrencies = currencyFilter.values.map(v =>
      v.toLowerCase()
    );

    cols = cols.filter(col => {
      const name = col.column_name.toLowerCase();

      // keep non-amount columns
      if (!name.includes("amount")) return true;

      // keep only selected currency columns
      return selectedCurrencies.some(cur =>
        name.includes(cur)
      );
    });
  }

  // ✅ existing modes (keep your logic)
  if (tableColumnMode === "saved") {
    cols = cols.filter(c =>
      savedTableColumns.includes(c.column_name)
    );
  }

  if (tableColumnMode === "custom") {
    cols = cols.filter(c =>
      selectedColumns.includes(c.column_name)
    );
  }

  return cols;
};
    const visibleColumns = getVisibleColumns();
const getCreateVisibleColumns = () => {
  return normalizeCreateColumns(columns);
};

const normalizeCreateColumns = (cols) => {
  let updated = [...cols];

  // 1. REMOVE OLD MULTI CURRENCY FIELDS
  updated = updated.filter(c => {
    const name = c.column_name.toLowerCase();

    if (name.startsWith("amount_") && name !== "amount") {
      return false;
    }

    return true;
  });

  // 2. ENSURE SINGLE AMOUNT
  if (!updated.some(c => c.column_name === "amount")) {
    updated.push({
      column_name: "amount",
      display_name: "Amount",
      data_type: "decimal"
    });
  }

  // 3. ENSURE SINGLE CURRENCY
//   if (!updated.some(c => c.column_name === "currency")) {
//     updated.push({
//       column_name: "currency",
//       display_name: "Currency",
//       data_type: "varchar"
//     });
//   }

  // 4. FIX ORDER (THIS IS THE KEY FIX)
  const order = ["currency","amount",  "total_amount_aed"];

  const ordered = [
    ...order
      .map(key => updated.find(c => c.column_name === key))
      .filter(Boolean)
  ];

  const rest = updated.filter(
    c => !order.includes(c.column_name)
  );

  return [...rest,...ordered];
};
    const generateTableHTML = (cols = columns) => {
        const logo = localStorage.getItem("print_logo");
        const company = localStorage.getItem("print_company");

        // ================= TOTAL CALCULATION =================
        const totals = {};

        cols.forEach(col => {
            const key = col.column_name.toLowerCase();

            if (
                //   key.includes("amount") ||
                //   key.includes("amt") ||
                //   key.includes("price") ||
                key.includes("total")
            ) {
                totals[col.column_name] = finalRows.reduce((sum, row) => {
                    const val = parseFloat(
                        (row[col.column_name] ?? 0).toString().replace(/,/g, "")
                    );
                    return sum + (isNaN(val) ? 0 : val);
                }, 0);
            }
        });

        //    <div style="text-align:center; margin-bottom:15px;">
        //       <img src="${logoUrl}" style="height:110px; object-fit:contain;" />
        //     </div>

        // ================= HTML =================
        return `
  <div style="text-align:center; margin-bottom:10px;">
   ${company ? `
  <h1 style="font-size:24px; margin-bottom:5px;">
    ${company}
  </h1>
` : ``}

    <h2 style="text-align:center; margin-bottom:10px;">
      ${module?.display_name}
    </h2>
    </div>

    <table>
      <thead>
        <tr>
          <th>S.No</th>
          ${cols.map(c => `<th>${c.display_name}</th>`).join("")}
        </tr>
      </thead>

      <tbody>

        ${finalRows.map((row, index) => `
          <tr>
            <td class="text-center">${index + 1}</td>

            ${cols.map((col, i) => {
            const value = formatCard(row[col.column_name], col.column_name) ?? "-";

            // 1️⃣ First column → LEFT
            if (i === 0) {
                return `<td class="text-left">${value}</td>`;
            }

            // 2️⃣ Amount columns → RIGHT
            if (
                col.column_name.toLowerCase().includes("amount") ||
                col.column_name.toLowerCase().includes("amt") ||
                col.column_name.toLowerCase().includes("price") ||
                col.column_name.toLowerCase().includes("total")
            ) {
                return `<td class="text-right">${value}</td>`;
            }

            // 3️⃣ Others → CENTER
            return `<td class="text-center">${value}</td>`;
        }).join("")}

          </tr>
        `).join("")}

        <!-- ================= TOTAL ROW ================= -->
        <tr style="font-weight:bold; background:#f5f5f5;">
          <td class="text-center"></td>

          ${cols.map((col, i) => {
            const key = col.column_name;

            // First column → "Total"
            if (i === 0) {
                return `<td class="text-left">Total</td>`;
            }

            // Numeric columns → show total
            if (totals[key] !== undefined) {
                return `<td class="text-right">
                ${totals[key].toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}
              </td>`;
            }

            // Others → empty
            return `<td></td>`;
        }).join("")}

        </tr>

      </tbody>
    </table>
  `;
    };
    
const dateColumns = visibleColumns.filter(col =>
  col.data_type?.toLowerCase().includes("date")
);
const transformColumns = (mod, dataRows = []) => {

  let cols = mod?.columns || [];

  console.log("🔥 Columns:", cols);
  console.log("🔥 Data rows:", dataRows);

  // ================= 1. EXTRACT CURRENCIES (FIXED) =================
  const currencies = new Set();

  dataRows.forEach(row => {
    if (row.currency) {
      currencies.add(row.currency.trim().toUpperCase());
    }
  });

  const currencyList = Array.from(currencies);

  console.log("🔥 Final Currency List:", currencyList);

  // ================= 2. CLEAN COLUMNS FIRST =================
  cols = cols.filter(col => {
    const name = col.column_name?.toLowerCase();

    // ❌ remove ONLY fc columns (DO NOT remove currency logic here)
    return !(
      name.includes("fc_") ||
      name.startsWith("fc_") ||
      name.includes("fcamount") ||
     // name.includes("fc_amount") ||
        name.includes("currency") 
    );
  });

  // ================= 3. BUILD COLUMNS =================
  const finalCols = [];

  cols.forEach(col => {

    const name = col.column_name.toLowerCase();

    // ================= AMOUNT DETECTION (FIXED) =================
    const isAmount =
      (
        col.data_type?.toLowerCase() === "decimal" ||
        col.data_type?.toLowerCase() === "float" ||
        col.data_type?.toLowerCase() === "numeric" ||
        name.includes("amount")
      ) &&
      !name.includes("total");

    // ================= EXPAND AMOUNT =================
    if (isAmount && currencyList.length > 0) {

      currencyList.forEach(cur => {
        finalCols.push({
          ...col,
          column_name: `${col.column_name}_${cur.toLowerCase()}`,
          display_name: `${col.display_name} (${cur})`,
        });
      });

      return;
    }

    // ================= NORMAL COLUMN =================
    finalCols.push(col);
  });

  // ================= 4. SET STATE =================
  const result = finalCols.filter(c => c.is_active !== false);

  setColumns(result);

  console.log("🔥 Final Transformed Columns:", result);
};

    // ================= LOAD MODULE =================
   const loadModule = async () => {
  try {
    const res = await fetchSections();
    const mod = res.data.find(m => m.module_id == id);

    if (mod) {
      setModule(mod);

      const dataRes = await getModuleData(id, activeUserEmail);

      const rowsData = dataRes.data || [];
      setRows(rowsData);

      setColumns(
  (mod?.columns || []).filter(c => c.is_active !== false)
);// ✅ PASS ROWS HERE
      //console.log("Module loaded:", rowsData);
    }

  } catch (err) {
    console.error(err);
  }
};

    // ================= LOAD DATA =================
    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getModuleData(id,activeUserEmail);
            setRows(res.data || []);
           // console.log("Data loaded:", res.data || []);
        } catch (err) {
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCurrencies = async () => {
        try {
            const res = await currencises();
            setCurrencies(res.data || []);
        } catch (err) {
            console.error("Failed to load currencies:", err);
        }
    };

    useEffect(() => {
        loadModule();
        loadData();
        loadCurrencies();

    }, [id]);



   useEffect(() => {
  if (!columns.length) return;

  const uniqueMasters = new Set();

  columns.forEach(c => {
    if (c.master) uniqueMasters.add(c.master);
    if (c.master1) uniqueMasters.add(c.master1);
  });

  uniqueMasters.forEach(async (master) => {
    try {
      const res = await getMasterValues(master);

      setMasterDataMap(prev => ({
        ...prev,
        [master]: res.data.data || []
      }));
    } catch (err) {
      console.error("Master fetch failed:", master, err);
    }
  });

}, [columns]);

const getMasterOptions = (col, searchText = "") => {
  let options = [];

  const master1 = col.master;
  const master2 = col.master1;

  // ================= 1️⃣ PICK CORRECT MASTER =================

  // If only one master exists
  if (master1 && !master2) {
    options = masterDataMap[master1] || [];
  } 
  else if (!master1 && master2) {
    options = masterDataMap[master2] || [];
  } 
  else if (master1 && master2) {
    // BOTH EXISTS → DO NOT MERGE blindly

    const name = (col.column_name || "").toLowerCase();

    if (name.includes("plan")) {
      options = masterDataMap["plans"] || [];
    } 
    else if (name.includes("provider")) {
      options = masterDataMap["service_providers"] || [];
    } 
    else {
      options = masterDataMap[master1] || [];
    }
  }

  // ================= 2️⃣ FILTER PLANS BY PROVIDER =================
  if (
    (col.master === "plans" || col.column_name?.includes("plan")) &&
    providerPlans?.length
  ) {
    const allowedIds = providerPlans.map(p => p.plan_id);

    options = options.filter(p => allowedIds.includes(p.id));
  }

  // ================= 3️⃣ SEARCH =================
  if (!searchText) return options;

  const search = searchText.toString().toLowerCase();

  return options.filter(v => {
    const valStr = typeof v === "object" ? v.value : v;
    return valStr?.toLowerCase().includes(search);
  });
};


   const getExchangeRate = (currencyCode) => {
  const list = currencies || [];
  const currency = list.find(
    c => c.currency_code === currencyCode
  );
  // If your rates are "1 AED = X currency", invert for non-AED
  if (currencyCode === "AED") return 1;
  if (currency?.exchange_rate) return 1 / Number(currency.exchange_rate);
  return 1;
};
const calculateCost = (amount, currencyCode, term) => {
  if (!amount || !currencyCode) return null;

  const rate = getExchangeRate(currencyCode);
  if (!rate || isNaN(rate)) return null;

  const adjustedAmount = applyTermMultiplier(amount, term);

  const monthly = Number(adjustedAmount) * Number(rate);

  return monthly;
};

const handleNewRowChange = (key, value, masterName) => {
  setNewRow(prev => {
    const updated = {
      ...prev,
      [key]: value
    };

    if (masterName === "billing_cycle") {
      sessionStorage.setItem("billing_cycle", value);
      updated.term = value;
    }

    return updated;
  });

  // ✅ provider change
 if (key === "service_providers") {

  const providerValue =
    typeof value === "object" ? value.value : value;

  const masterList = masterDataMap?.[masterName] || [];

  const matched = masterList.find(item =>
    (item.value || item).toLowerCase() === providerValue.toLowerCase()
  );

  const providerId = matched?.id;

  if (providerId) {
    // 🔥 reset manual flag when provider changes
    setPlanManuallyChanged(false);

    loadProviderPlans(providerId);
  }

  // clear existing plan
  setNewRow(prev => ({
    ...prev,
    plans: ""
  }));
}
};
useEffect(() => {
  if (!providerPlans?.length || !masterDataMap?.plans) return;

  const planMaster = masterDataMap.plans;

  const mappedPlans = providerPlans
    .map(p => planMaster.find(m => m.id === p.plan_id))
    .filter(Boolean);

  setProviderPlansMap(mappedPlans);

  // ✅ ONLY auto-select if user hasn't changed it
  if (!planManuallyChanged && mappedPlans.length > 0) {
    const firstPlan = mappedPlans[0];

    setNewRow(prev => ({
      ...prev,
      plans: firstPlan.value
    }));
  }

}, [providerPlans, masterDataMap.plans]);
  
   const handleSave = async () => {
    try {
        // Clone the newRow to avoid mutating state directly
        const payload = { ...newRow };

        // Set fcamt and currency from the form values
        if (payload.amount && payload.currency) {
           // payload.fc_amount = payload.total_amount_aed;
            payload.currency = payload.currency;
        }

        // Remove all amount_xxx fields (like amount_usd, amount_aed, etc.)
        Object.keys(payload).forEach(key => {
            if (key.startsWith("amount_")) {
                delete payload[key];
            }
        });

        // Optionally remove the original 'amount' field if not needed
        // delete payload.amount;

        await createModuleRow(id, payload, activeUserEmail);

        setIsCreating(false);
        setNewRow({});
        loadData(); // refresh table
    } catch (err) {
        console.error(err);
    }
};

    const handleCancel = () => {
        setIsCreating(false);
        setNewRow({});
    };

    const handleEdit = (row) => {
        setEditRowId(row.id);
        setEditRow({ ...row });
        setOriginalRow({ ...row });
    };

    const handleSaveEdit = async () => {
        try {
            const changedData = {};

            Object.keys(editRow).forEach((key) => {
                if (editRow[key] !== originalRow[key]) {
                    changedData[key] = editRow[key];
                }
            });

            if (Object.keys(changedData).length === 0) {
                setEditRowId(null);
                return;
            }

            await updateModuleRow(id, editRowId, changedData, activeUserEmail);

            setEditRowId(null);
            setEditRow({});
            setOriginalRow({});

            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancelEdit = () => {
        setEditRowId(null);
        setEditRow({});
    };

    const handleDelete = async (row) => {
        if (!window.confirm("Delete this record?")) return;

        try {
            await deleteModuleRow(id, row.id, activeUserEmail);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleExcel = (mode) => {
        const cols = getColumnsToUse(mode);

        exportToExcel(finalRows, cols, module?.display_name);
       // console.log("display name:", module?.display_name);
    };

    const handleExport = async () => {
        try {
            const res = await exportColumnNames(id);

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");

            link.href = url;
            link.setAttribute(
                "download",
                `${module?.display_name || "module"}_columns.xlsx`
            );

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export failed:", err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            await importTable(id, file, activeUserEmail); // your API function
            alert("Imported successfully ✅");
            setFile(null);
            loadData(); // refresh table after import
        } catch (err) {
            console.error(err);
            alert("Import failed ❌");
        }
    };

    useEffect(() => {
        const close = () => setOpenIndex(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, []);

    const handlePrint = (mode) => {
        const cols = getColumnsToUse(mode);

        openPrintWindow({
            content: generateTableHTML(cols),
            userName: activeUser?.email || "User",
        });

        setShowPrintModal(false);
    };



    useEffect(() => {
        const saved = localStorage.getItem(`print_columns_${id}`);
        if (saved) {
            setSelectedColumns(JSON.parse(saved));
        } else {
            setSelectedColumns(columns.map(c => c.column_name)); // default all
        }
    }, [columns]);

    const toggleColumn = (colName) => {
        setSelectedColumns(prev =>
            prev.includes(colName)
                ? prev.filter(c => c !== colName)
                : [...prev, colName]
        );
    };

    const saveColumnSelection = () => {
        // Save to the correct key for both saving and loading
        localStorage.setItem(
            `table_columns_${id}`,
            JSON.stringify(selectedColumns)
        );
        setSavedTableColumns(selectedColumns); // Update state so "Saved" mode works immediately
        setShowColumnSelector(false);
        setTableColumnMode("custom"); // Switch to custom mode after saving
    };

    const getColumnsToUse = (mode) => {
        if (mode === "saved") return columns.filter(c => selectedColumns.includes(c.column_name));
        if (mode === "default") return columns;
        return columns;
    };
    // ================= SEARCH FILTER =================
    const filtered = applyFilters(rows, filters, columns);

    const finalRows = filtered.filter(row =>
        columns.some(col =>
            String(row[col.column_name] || "")
                .toLowerCase()
                .includes(search.toLowerCase())
        )
    );

    const normalizedRows = finalRows.map(row => {
  const currency = (row.currency || "").toLowerCase();

  return {
    ...row,
    [`amount_${currency}`]: row.amount
  };
});

    // console.log("ROWS:", rows.length);
    // console.log("FILTERED:", filtered.length);
    // console.log("FINAL:", finalRows.length);

    // ================= PAGINATION =================
    const totalPages = Math.ceil(normalizedRows.length / pageSize);
    const paginatedRows = normalizedRows.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const handlePdf = async (mode) => {
        const cols = getColumnsToUse(mode);

        try {
            const res = await exportPdf({
                rows: normalizedRows,
                columns: cols,
                userName: localStorage.getItem("username"),
                moduleName: module?.display_name,
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));

            const link = document.createElement("a");
            link.href = url;
            link.download = `${module?.display_name || "report"}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            setShowPdfModal(false);
        } catch (err) {
            console.error("PDF export failed:", err);
        }
    };

       const disableOthers = hasAnyAmountValue(newRow, visibleColumns);
       //console.log("Disable Others check for new row:", newRow, disableOthers);
    const disableEditOthers = hasAnyAmountValue(editRow, visibleColumns);

useEffect(() => {
  if (!isCreating) return; // only during create

  visibleColumns.forEach(col => {
    if (!col.master) return;

    const key = col.column_name;

    // ✅ skip if already auto-filled once
    if (autoFilledFields[key]) return;

    const options = getMasterOptions(col, newRow[key] || "");

    if (options.length === 1) {
      const val =
        typeof options[0] === "object"
          ? options[0].value
          : options[0];

      setNewRow(prev => ({
        ...prev,
        [key]: val
      }));

      // ✅ mark as auto-filled
      setAutoFilledFields(prev => ({
        ...prev,
        [key]: true
      }));
    }
  });
}, [visibleColumns, masterDataMap, isCreating]);

useEffect(() => {
  if (!editRowId) return;

  visibleColumns.forEach(col => {
    if (!col.master) return;

    const options = getMasterOptions(col, editRow[col.column_name] || "");

    if (options.length === 1) {
      const val = typeof options[0] === "object" ? options[0].value : options[0];

      setEditRow(prev => {
        if (prev[col.column_name] === val) return prev;

        return {
          ...prev,
          [col.column_name]: val
        };
      });
    }
  });
}, [editRow, editRowId, visibleColumns, masterDataMap]);
    return (
        <div className="h-full flex flex-col">

            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800">
                    {module?.display_name || "Loading..."}
                </h1>

                <div className="flex items-center gap-2">


  


  {/* PRINT */}
  <PermissionButton
    user={activeUser}
    permission="print"
    onClick={() => setShowPrintModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-gray-100 hover:border-gray-500 transition"
  >
    Print
  </PermissionButton>

  {/* EXCEL */}
  <PermissionButton
    user={activeUser}
    permission="export"
    onClick={() => setShowExcelModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition"
  >
    Excel
  </PermissionButton>

  {/* PDF */}
  <PermissionButton
    user={activeUser}
    permission="export"
    onClick={() => setShowPdfModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition"
  >
    PDF
  </PermissionButton>

</div>

            </div>

            {/* ================= CONTROL BAR (LEFT ALIGNED) ================= */}
            <div className="bg-white p-3 rounded-xl shadow mb-4 flex flex-wrap items-center gap-3">

                {/* SEARCH */}
                <input
                    type="text"
                    placeholder="Search records..."
                    className="border px-3 py-2 rounded-lg w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />


                {/* FILTER BUTTON */}
                <TableFilters
                    masterList={masterList}
                    filters={filters}
                    setFilters={setFilters}
                    currencies={currencies}
                />
                {isFilterActive && (
  <div className="flex items-center gap-2 ml-2 bg-gray-50 px-3 py-2 rounded-lg border">

    {/* INPUT */}
    <input
      type="text"
      placeholder="Enter filter name (required)"
      value={saveFilterName}
      onChange={(e) => setSaveFilterName(e.target.value)}
      className="border px-2 py-1 rounded text-sm w-52"
    />

    {/* SAVE BUTTON */}
    <button
      onClick={handleSaveFilter}
      disabled={!saveFilterName.trim()}
      className={`px-3 py-1 rounded text-sm text-white ${
        saveFilterName.trim()
          ? "bg-blue-500 hover:bg-blue-600"
          : "bg-gray-300 cursor-not-allowed"
      }`}
    >
      Save As
    </button>

  </div>
)}
                 {/* ✅ DATE FILTER BUTTONS */}
  {dateColumns.map((col, i) => (
    <button
      key={i}
      onClick={() =>
        setActiveDateFilter(
          activeDateFilter === col.column_name ? null : col.column_name
        )
      }
      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
    >
      {col.display_name}
    </button>
  ))}
                <button
                    onClick={() => setShowTableColumnModal(true)}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
                >
                    Customize Columns
                </button>
               

                {/* PAGINATION (LEFT SIDE LIKE YOU WANTED) */}
                <div className="flex items-center gap-2 text-sm ml-4">

                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1 border rounded disabled:opacity-40"
                    >
                        Prev
                    </button>

                    <span className="text-gray-600">
                        {page} / {totalPages || 1}
                    </span>

                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1 border rounded disabled:opacity-40"
                    >
                        Next
                    </button>

                </div>

                {/* RECORD COUNT */}
                <span className="text-sm text-gray-500 ml-auto">
                    Total: {finalRows.length}
                </span>


            </div>
            {activeDateFilter && (
  <div className="mb-4">
    <DateTimeRangeFilter
      onApply={(range) => {
        setDateFilters(prev => ({
          ...prev,
          [activeDateFilter]: range
        }));

        // OPTIONAL: API CALL
        fetchLogs({
          ...filters,
          ...dateFilters,
          [activeDateFilter]: range
        });

        setActiveDateFilter(null);
      }}
    />
  </div>
)}

            {/* ACTIVE FILTER CHIPS */}
            {/* ACTIVE FILTERS (2nd ROW UI) */}
            <div className="flex flex-wrap gap-2 mt-0 mb-4">

  {filters.map((f, i) => {

    const masterName = normalize(f.master);

    const options =
      masterName === "currency"
        ? currencies.map(c => c.currency_code)
        : (masterDataMap?.[masterName] || []).map(normalize);

    const selectedValues = (f.values || []).map(normalize);

    return (
      <div
        key={i}
        className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 shadow-sm"
      >

        {/* MASTER NAME */}
        <span className="text-sm font-medium text-gray-700">
          {masterName}
        </span>

        {/* SELECTED VALUES */}
        <div className="flex gap-1 flex-wrap">
          {selectedValues.map((val, idx) => (
            <span
              key={idx}
              className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
            >
              {val}
              <button
                onClick={() => {
                  const updated = [...filters];

                  updated[i].values =
                    updated[i].values
                      .map(normalize)
                      .filter(v => v !== val);

                  setFilters(updated);
                }}
                className="text-blue-500 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        {/* ADD BUTTON */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenIndex(openIndex === i ? null : i);
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          + Add
        </button>

        {/* DROPDOWN */}
        {openIndex === i && (
          <div
            ref={el => (dropdownRefs.current[i] = el)}
            className="absolute top-8 left-0 bg-white border rounded-lg shadow-lg w-56 max-h-60 overflow-auto z-50"
            onClick={e => e.stopPropagation()}
          >

            {options.map((opt, idx) => {
              const label = normalize(opt);

              const checked = selectedValues.includes(label);

              return (
                <label
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const updated = [...filters];

                      const current =
                        (updated[i].values || []).map(normalize);

                      if (checked) {
                        updated[i].values =
                          current.filter(v => v !== label);
                      } else {
                        updated[i].values = [...current, label];
                      }

                      setFilters(updated);
                    }}
                  />

                  <span className="text-sm">{label}</span>
                </label>
              );
            })}

          </div>
        )}

        {/* REMOVE FILTER */}
        <button
          onClick={() =>
            setFilters(filters.filter((_, index) => index !== i))
          }
          className="text-gray-400 hover:text-red-500 ml-1"
        >
          ✕
        </button>

      </div>
    );
  })}

</div>


            {/* ================= TABLE WRAPPER ================= */}
            <div className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 w-full overflow-auto">
                    <table className="min-w-max w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 border-b text-left">S.No</th> {/* ✅ ADD THIS */}

                                {visibleColumns.map(col => (
                                    <th
                                        key={col.column_id}
                                        className={`${getAlignClass(col.display_name)} px-4 py-3 whitespace-nowrap border-b`}
                                    >

                                        {col.display_name}
                                    </th>
                                ))}

                                <th className="px-4 py-3 border-b text-right">Actions</th>
                            </tr>
                        </thead>

                        {/* TABLE BODY */}
                    <tbody className="divide-y">
{/* ================= DATA ROWS ================= */}
{paginatedRows.map((row, i) => (
  <tr key={row.id ?? i} className="hover:bg-gray-50">

    <td className="px-4 py-3 whitespace-nowrap">
      {(page - 1) * pageSize + i + 1}
    </td>

    {visibleColumns.map((col) => {
      const isMaster = !!col.master;
      const editKey = `edit-${row.id}-${col.column_name}`;
      const isDate = col.data_type?.toLowerCase().includes("date");

      // ✅ normalize row value (CRITICAL FIX)
      const rawValue = row?.[col.column_name];
      const value =
        typeof rawValue === "object"
          ? rawValue?.value ?? "-"
          : rawValue ?? "-";

      return (
        <td
          key={col.column_id}
          className={`px-4 py-3 whitespace-nowrap ${getAlignClass(col.display_name)}`}
        >

          {/* ================= EDIT MODE ================= */}
          {editRowId === row.id ? (
            <div className="relative">

              <input
                type={isDate ? "date" : "text"}
                className="border px-2 py-1 rounded w-full"
                value={
                  col.column_name === "total_amount_aed"
                    ? editRow.total_amount_aed || ""
                    : isDate
                    ? formatForInput(editRow[col.column_name])
                    : (
                        typeof editRow[col.column_name] === "object"
                          ? editRow[col.column_name]?.value ?? ""
                          : editRow[col.column_name] ?? ""
                      )
                }
                disabled={col.column_name === "total_amount_aed"} // ✅ readonly
                onChange={(e) => {
                  let val = e.target.value;

                  if (isNumericColumn(col.column_name)) {
                    val = handleNumericInput(val);
                  }

                  setEditRow({
                    ...editRow,
                    [col.column_name]: val,
                  });

                  setActiveDropdown(editKey);
                }}
                onFocus={() => setActiveDropdown(editKey)}
                onBlur={() =>
                  setTimeout(() => setActiveDropdown(null), 150)
                }
              />

              {/* DROPDOWN */}
              {isMaster && activeDropdown === editKey && (
                <div className="absolute z-50 bg-white border w-full max-h-48 overflow-auto shadow-lg rounded mt-1">

                  {getMasterOptions(col, editRow[col.column_name] || "", editRow)
                    .slice(0, 20)
                    .map((val, i) => {
                      const display =
                        typeof val === "object" ? val.value : val;

                      return (
                        <div
                          key={i}
                          className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                          onMouseDown={() =>
                            setEditRow({
                              ...editRow,
                              [col.column_name]: display,
                            })
                          }
                        >
                          {display}
                        </div>
                      );
                    })}

                </div>
              )}

            </div>
          ) : (
            (() => {

              if (isDate) return formatDate(value);

              if (col.column_name === "total_amount_aed") {
                return value ? Number(value).toFixed(2) : "-";
              }

              if (col.column_name.toLowerCase().includes("amount")) {
                return renderCellValue(value);
              }

              return renderCellValue(value);

            })()
          )}

        </td>
      );
    })}

    {/* ACTIONS */}
    <td className="px-4 py-3 whitespace-nowrap flex gap-2 justify-end">

      {editRowId === row.id ? (
        <>
          <button onClick={handleSaveEdit} className="btn btn-blue">Save</button>
          <button onClick={handleCancelEdit} className="btn btn-red">Cancel</button>
        </>
      ) : (
        <>
          <PermissionButton
            user={activeUser}
            permission="modify"
            onClick={() => {
              setEditRowId(row.id);
              setEditRow(row);
              setOriginalRow(row);
            }}
            className="btn btn-blue"
          >
            Edit
          </PermissionButton>

          <PermissionButton
            user={activeUser}
            permission="delete"
            onClick={() => handleDelete(row)}
            className="btn btn-red"
          >
            Delete
          </PermissionButton>
        </>
      )}

    </td>

  </tr>
))}
</tbody>

                    </table>
                    {showImportModal && (
                        <Modal title="Import Data" onClose={() => setShowImportModal(false)}>

                            <div className="flex flex-col gap-4">

                                {/* TOP ACTIONS */}
                                <div className="flex gap-3">

                                    <button
                                        onClick={handleExport}
                                        className="btn btn-outline flex-1"
                                    >
                                        ⬇️ Template
                                    </button>

                                    <label className="btn btn-green flex-1 cursor-pointer">
                                        📁 Choose File
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                    </label>

                                </div>

                                {/* FILE PREVIEW */}
                                {file && (
                                    <div className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">

                                        <span className="text-sm truncate">
                                            📄 {file.name}
                                        </span>

                                        <button
                                            onClick={() => setFile(null)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>

                                    </div>
                                )}

                                {/* UPLOAD BUTTON */}
                                {file && (
                                    <button
                                        onClick={handleUpload}
                                        className="btn btn-blue w-full"
                                    >
                                        ⬆️ Upload File
                                    </button>
                                )}

                            </div>

                        </Modal>
                    )}
                    {showPrintModal && (
                        <Modal title="Print Options" onClose={() => setShowPrintModal(false)}>

                            <div className="flex gap-3">

                                <button
                                    onClick={() => handlePrint("default")}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                <button
                                    onClick={() => handlePrint("saved")}
                                    className="btn btn-blue flex-1"
                                >
                                    Saved
                                </button>

                                <button
                                    onClick={() => setShowColumnSelector(true)}
                                    className="btn btn-green flex-1"
                                >
                                    Customize
                                </button>
                                <button
                                    onClick={() => setShowPrintOptions(true)}
                                    className="btn btn-green flex-1"
                                >
                                    Add Logo
                                </button>

                            </div>

                        </Modal>
                    )}
                    {showExcelModal && (
                        <Modal title="Excel Export" onClose={() => setShowExcelModal(false)}>
                            <div className="flex gap-3">

                                <button
                                    onClick={() => handleExcel("default")}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                <button
                                    onClick={() => handleExcel("saved")}
                                    className="btn btn-blue flex-1"
                                >
                                    Saved
                                </button>

                                <button
                                    onClick={() => setShowColumnSelector(true)}
                                    className="btn btn-green flex-1"
                                >
                                    Customize
                                </button>

                            </div>

                        </Modal>
                    )}

                    {showPdfModal && (
                        <Modal title="PDF Export" onClose={() => setShowPdfModal(false)}>
                            <div className="flex gap-3">

                                <button
                                    onClick={() => handlePdf("default")}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                <button
                                    onClick={() => handlePdf("saved")}
                                    className="btn btn-blue flex-1"
                                >
                                    Saved
                                </button>

                                <button
                                    onClick={() => setShowColumnSelector(true)}
                                    className="btn btn-green flex-1"
                                >
                                    Customize
                                </button>

                            </div>

                        </Modal>
                    )}
                    {showTableColumnModal && (
                        <Modal title="Customize Columns" onClose={() => setShowTableColumnModal(false)}>

                            <div className="flex gap-3">

                                {/* DEFAULT */}
                                <button
                                    onClick={() => {
                                        setTableColumnMode("default");
                                    }}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                {/* SAVED */}
                                <button
                                    onClick={() => {
                                        const saved = JSON.parse(localStorage.getItem(`table_columns_${id}`) || "[]");
                                        setSavedTableColumns(saved);
                                        setTableColumnMode("saved");
                                    }}
                                    className="btn btn-blue flex-1"
                                >
                                    Saved
                                </button>
                                {/* CUSTOM */}
                                <button
                                    onClick={() => {
                                        setShowColumnSelector(true);
                                        setTableColumnMode("custom"); // Optional, but keeps UI in sync
                                    }}
                                    className="btn btn-green flex-1"
                                >
                                    Customize
                                </button>

                            </div>



                        </Modal>
                    )}

                    {showColumnSelector && (
                        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

                            <div className="bg-white p-5 rounded-xl shadow-lg w-[420px]">

                                <h3 className="mb-4 text-lg font-semibold">
                                    Select Columns
                                </h3>

                                <div className="max-h-60 overflow-auto space-y-2 pr-2">

                                    {columns.map(col => (
                                        <label
                                            key={col.column_id}
                                            className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedColumns.includes(col.column_name)}
                                                onChange={() => toggleColumn(col.column_name)}
                                                className="accent-blue-600"
                                            />
                                            <span>{col.display_name}</span>
                                        </label>
                                    ))}

                                </div>

                                <div className="flex justify-end gap-2 mt-4">

                                    <button
                                        onClick={() => setShowColumnSelector(false)}
                                        className="btn btn-outline"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={saveColumnSelection}
                                        className="btn btn-blue"
                                    >
                                        💾 Save
                                    </button>

                                </div>

                            </div>

                        </div>
                    )}
                    {showPrintOptions && (
                        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

                            <div className="bg-white p-5 rounded-xl shadow-lg w-[420px]">

                                <h3 className="mb-4 text-lg font-semibold">
                                    Add Logo or Header to Print
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        Select Company (Trade Name)
                                    </label>

                                    <select
                                        className="w-full border p-2 rounded"
                                        value={selectedCompany}
                                        onChange={(e) => setSelectedCompany(e.target.value)}
                                    >
                                        <option value="">Default (Module Name)</option>

                                        {companyList.map((c, i) => (
                                            <option key={i} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">

                                    <button
                                        onClick={() => setShowPrintOptions(false)}
                                        className="btn btn-outline"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={savePrintOptions}
                                        className="btn btn-blue"
                                    >
                                        💾 Save
                                    </button>

                                </div>

                            </div>

                        </div>
                    )}
                  

                </div>
            </div>



        </div>



    );
}