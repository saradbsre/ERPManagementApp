import { useEffect, useState, useRef, act } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, exportColumnNames, importTable, getMasterValues, currencises, exportPdf, getProviderPlans,upsertSavedFilter, getCustomizedColumns, upsertCustomizedColumns, getMasterData, addMasterData  } from "../../api/api";
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
import DateOnlyFilter from "../DateOnlyFilter";


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


export default function DynamicTablePage() {
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
    const [providerPlansMap, setProviderPlansMap] = useState({});
    const [providerPlans, setProviderPlans] = useState([]);
    const [autoFilledFields, setAutoFilledFields] = useState({});
    const [planManuallyChanged, setPlanManuallyChanged] = useState(false);
    const [dateFilters, setDateFilters] = useState({});
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const [showSaveFilter, setShowSaveFilter] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState("");
    const currentModule =  module;
    const [savedTableColumns, setSavedTableColumns] = useState([]);
    const [printModuleName, setPrintModuleName] = useState("");
    const [showPlanProviderPopup, setShowPlanProviderPopup] = useState(false);
    const [pendingColumn, setPendingColumn] = useState(null);


const isFilterActive =
  search ||
  filters?.length > 0 
 // Object.keys(dateFilters || {}).length > 0;

//console.log("is filter active?", isFilterActive, { search, filters, dateFilters });

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

const getCurrentMonthRange = () => {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};



useEffect(() => {
  if (!dateColumns.length) return;

  const defaultRange = getCurrentMonthRange();

  const initialFilters = {};

  dateColumns.forEach(col => {
    initialFilters[col.column_name] = defaultRange;
  });

  setDateFilters(initialFilters);
}, [columns]);

const buildDatePayload = (df = dateFilters) => {
  const payload = {};

  Object.entries(df || {}).forEach(([key, range]) => {
    if (range?.start && range?.end) {
      payload[key] = {
        start: range.start,
        end: range.end
      };
    }
  });

  return payload;
};

const fetchCustomizedColumns = async () => {
  try {
    const res = await getCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail
    );

    return res?.data?.data?.columns || [];

  } catch (err) {
    console.error("Failed to load customized columns:", err);
    return [];
  }
};

const addMasterValue = async (masterName, value) => { 
    try { 
        await addMasterData(masterName, { value }); 
    } catch (err) { 
        console.error("Master add failed:", err); } 
    };


const handleSaveFilter = async () => {
  if (!saveFilterName.trim()) {
    alert("Filter name is required");
    return;
  }

  const payload = {
    filterName: saveFilterName.trim(),
    userId: activeUser?.email,     // ✅ string only
    module_id: currentModule?.module_id,    // ✅ IMPORTANT
    filterData: {
      search,
      filters,
      dateFilters
    }
  };

  //console.log("Saving filter:", payload);

  await upsertSavedFilter(payload);

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
   const toNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;

  const n = Number(String(val).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const formatNumber = (val) => {
  const num = toNumber(val);

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const isNumericColumn = (col) => {
  const name = (col.column_name || "").toLowerCase();
   console.log("Checking columns from raw data:", name);
  return (
    name.includes("amount") ||
    name.includes("cost") ||
    name.includes("price") ||
    name.includes("total")
  );
};

const isTotalColumn = (col) => {
  const name = col.column_name.toLowerCase();
   console.log("Checking columns from raw data:", name);
  return (
    name.includes("total")
  );
};

// SORT TOTAL LAST
const sortColumns = (cols) => {
    console.log("Sorting columns:", cols.map(c => c.column_name));
  const normal = cols.filter(
    c => !c.column_name.toLowerCase().includes("total")
  );

  const total = cols.filter(
    c => c.column_name.toLowerCase().includes("total")
  );

  return [...normal, ...total];
};


const generateTableHTML = (cols = columns) => {

  const company = localStorage.getItem("print_company");

  // =====================================================
  // DISTINCT CURRENCIES
  // =====================================================
  const currencies = [
    ...new Set(
      finalRows
        .map(r => r.currency)
        .filter(Boolean)
    )
  ];

  // =====================================================
  // REMOVE:
  // 1. amount column
  // 2. currency column
  // =====================================================
const normalCols = cols.filter(c => {

  const name = c.column_name.toLowerCase();

  // REMOVE ONLY PURE amount COLUMN
  // KEEP total_amount_aed
  return (
    name !== "amount" &&
    name !== "currency"
  );

});

  
  const currencyCols = currencies.map(cur => ({
    column_name: `amount_${cur.toLowerCase()}`,
    display_name: `AMOUNT (${cur.toUpperCase()})`,
    currency: cur,
    isDynamicCurrency: true
  }));

  // =====================================================
  // FINAL COLUMNS
  // =====================================================
  const sortedCols = sortColumns([
    ...normalCols,
    ...currencyCols
  ]);

  const firstTotalIndex = sortedCols.findIndex(col =>
  isTotalColumn(col)
);

  // =====================================================
  // TOTALS
  // =====================================================
  const totals = {};

  sortedCols.forEach(col => {

  // ONLY TOTAL COLUMNS
  if (isTotalColumn(col)) {

    totals[col.column_name] = finalRows.reduce((sum, row) => {
      return sum + toNumber(row[col.column_name]);
    }, 0);

  }

});

  // =====================================================
  // HTML
  // =====================================================
  return `

    <div style="text-align:center; margin-bottom:10px;">

      ${
        company
          ? `
            <h1 style="font-size:24px; margin-bottom:5px;">
              ${company}
            </h1>
          `
          : ``
      }

      <h2 style="margin-bottom:10px;">
        ${printModuleName?.trim() || module?.display_name}
      </h2>

    </div>

    <table
      border="1"
      cellspacing="0"
      cellpadding="5"
      style="width:100%; border-collapse:collapse;"
    >

      <!-- ================= HEADER ================= -->

      <thead>

        <tr>

          <th>S.No</th>

          ${sortedCols.map(col => `
            <th>${col.display_name}</th>
          `).join("")}

        </tr>

      </thead>

      <!-- ================= BODY ================= -->

      <tbody>

        ${finalRows.map((row, index) => `

          <tr>

            <td style="text-align:center">
              ${index + 1}
            </td>

            ${sortedCols.map(col => {

              let value = "";

              // =========================================
              // DYNAMIC CURRENCY COLUMN
              // =========================================
              if (col.isDynamicCurrency) {

                if (row.currency === col.currency) {
                  value = row.amount;
                } else {
                  value = "";
                }

              }

              // =========================================
              // NORMAL COLUMN
              // =========================================
              else {

                const raw = row[col.column_name];

                value =
                  typeof raw === "object"
                    ? raw?.value ?? ""
                    : raw ?? "";

              }

              // =========================================
              // DATE
              // =========================================
              if (
                col.data_type?.toLowerCase().includes("date")
              ) {

                return `
                  <td style="text-align:center">
                    ${formatDate(value)}
                  </td>
                `;
              }

              // =========================================
              // CREDIT CARD
              // =========================================
              if (col.master === "credit_card") {

                const str = String(value);
                const last4 = str.slice(-4);

                return `
                  <td style="text-align:center">
                    **** **** **** ${last4}
                  </td>
                `;
              }

              // =========================================
              // NUMBER / AMOUNT
              // =========================================
              if (
                isNumericColumn(col) ||
                col.isDynamicCurrency
              ) {

                return `
                  <td style="text-align:right">
                    ${
                      value !== ""
                        ? formatNumber(value)
                        : ""
                    }
                  </td>
                `;
              }

              // =========================================
              // DEFAULT
              // =========================================
              return `
                <td style="text-align:center">
                  ${value || "-"}
                </td>
              `;

            }).join("")}

          </tr>

        `).join("")}

      <!-- ================= TOTAL ROW ================= -->

<tr style="font-weight:bold; background:#f5f5f5;">

  <!-- S.No column -->
  <td></td>

  <!-- TOTAL LABEL (spans all non-total columns) -->
  <td
    colspan="${firstTotalIndex > 0 ? firstTotalIndex : 1}"
    style="text-align:right"
  >
    TOTAL
  </td>

  <!-- TOTAL VALUES -->
  ${sortedCols.slice(firstTotalIndex).map(col => {

    if (!isTotalColumn(col)) {
      return `<td></td>`;
    }

    return `
      <td style="text-align:right">
        ${formatNumber(totals[col.column_name] || 0)}
      </td>
    `;
  }).join("")}

</tr>

      </tbody>

    </table>

  `;
};

const getExcelColumns = (mode) => {
  const cols = getColumnsToUse(mode);

  const currencies = [
    ...new Set(finalRows.map(r => r.currency).filter(Boolean))
  ];

  // remove base amount + currency columns
  const normalCols = cols.filter(c => {
    const name = c.column_name.toLowerCase();
    return name !== "amount" && name !== "currency";
  });

  const currencyCols = currencies.map(cur => ({
    column_name: `amount_${cur.toLowerCase()}`,
    display_name: `AMOUNT (${cur.toUpperCase()})`,
    currency: cur,
    isDynamicCurrency: true
  }));

  let finalCols = [...normalCols, ...currencyCols];

  // sort total last
  finalCols = sortColumns(finalCols);

  return finalCols;
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
    // console.log("Matched module:", mod);
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
const loadData = async (overrideDateFilters) => {
  setLoading(true);

  const df = dateFilters;

  const payload = {
    search,
    filters: JSON.stringify(filters || []),
    dateFilters: JSON.stringify(buildDatePayload(df))
  };

  try {
    const res = await getModuleData(id, activeUserEmail, payload);
    setRows(res.data || []);
  } catch (err) {
    setRows([]);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadData();
}, [dateFilters, filters, search]);

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
  //console.log("Unique masters to fetch:", uniqueMasters);
  uniqueMasters.forEach(async (master) => {
    try {
      const res = await getMasterValues(master);

      setMasterDataMap(prev => ({
        ...prev,
        [master]: res.data.data || []
      }));
     // console.log(`Master data for ${master}:`, res.data.data || []);
    } catch (err) {
      console.error("Master fetch failed:", master, err);
    }
  });

}, [columns]);

const getMasterOptions = (col, searchText = "") => {

  let options = [];

  const master1 = col.master;
  const master2 = col.master1;

  // ================= 1️⃣ LOAD MASTER 1 =================
  if (master1 && masterDataMap?.[master1]) {
    options = [
      ...options,
      ...masterDataMap[master1]
    ];
  }

  // ================= 2️⃣ LOAD MASTER 2 =================
  if (master2 && masterDataMap?.[master2]) {
    options = [
      ...options,
      ...masterDataMap[master2]
    ];
  }

 // ================= 3️⃣ REMOVE DUPLICATES =================
 options = options.filter(
   (item, index, self) =>
     index === self.findIndex(
       t =>
         t.id === item.id &&
         JSON.stringify(t) === JSON.stringify(item)
     )
 );



  // ================= 4️⃣ FILTER PLANS BY PROVIDER =================
  if (
    (
      col.master === "plans" ||
      col.master1 === "plans" ||
      col.column_name?.toLowerCase().includes("plan")
    ) &&
    providerPlans?.length
  ) {

    const allowedIds = providerPlans.map(p => p.plan_id);

    options = options.filter(p => {

      // keep providers always
      if (!allowedIds.includes(p.id)) {

        // allow providers
        if (
          masterDataMap?.service_providers?.some(
            sp => sp.id === p.id
          )
        ) {
          return true;
        }
      }

      return allowedIds.includes(p.id);
    });
  }

  // ================= 5️⃣ SEARCH FILTER =================
  if (!searchText) return options;

  const search = searchText.toString().toLowerCase();

  return options.filter(v => {

    const valStr =
      typeof v === "object"
        ? (v.value || v.provider_name || "")
        : v;

    return valStr
      ?.toLowerCase()
      .includes(search);
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



const handleNewRowChange = async (key, value, masterName) => {

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

  // =========================
  // PROVIDER HANDLING
  // =========================
  if (key === "service_providers") {

    const providerValue =
      typeof value === "object" ? value.value : value;

    let masterList = [];

    try {
      const res = await getMasterData(
        "service_providers",
        activeUserEmail
      );

      masterList = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data || [];

    } catch (err) {
      masterList = masterDataMap?.[masterName] || [];
    }

    if (!masterList.length) {
      masterList = masterDataMap?.[masterName] || [];
    }

    // =========================
    // 1️⃣ GET PROVIDER ID
    // =========================
    const matched = masterList.find(item =>
      (item.provider_name || item.value || "")
        .toLowerCase()
        .trim() === providerValue.toLowerCase().trim()
    );

    const providerId = matched?.providers || matched?.id;

    console.log("✅ Provider ID:", providerId);

    if (!providerId) return;

    // =========================
    // 2️⃣ IF: RESOLVE MASTER VALUE FIRST
    // =========================
    let providerLabel = '';

    try {
      const providerRes = await getMasterValues("providers");

      const providerMaster =
        providerRes?.data?.data ||
        providerRes?.data ||
        providerRes ||
        [];

      const selectedProvider = providerMaster.find(
        item => String(item.id) === String(providerId)
      );

      providerLabel = selectedProvider?.value || '';

      console.log("🔥 Resolved Provider:", selectedProvider);

    } catch (err) {
      console.error("Provider master fetch failed:", err);
    }

    // =========================
    // 3️⃣ UPDATE UI (AFTER IF)
    // =========================
    setNewRow(prev => ({
      ...prev,
      plan_provider: providerLabel
    }));

    // =========================
    // 4️⃣ FINAL STEP (ELSE LOGIC)
    // =========================
    setPlanManuallyChanged(false);
    loadProviderPlans(providerId);
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
    console.log("Auto-selecting plan:", firstPlan);
    setNewRow(prev => ({
      ...prev,
      plan_provider: firstPlan.value
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
  const cols = getExcelColumns(mode);

  const company = localStorage.getItem("print_company") || "";
  const moduleName =
    printModuleName ||
    localStorage.getItem("print_module_name") ||
    module?.display_name;

  const formattedRows = finalRows.map((row, index) => {
    const newRow = {
      SNo: index + 1
    };

    cols.forEach(col => {

      let value = "";

      if (col.isDynamicCurrency) {
        value =
          row.currency === col.currency
            ? row.amount
            : "";
      } else {
        const raw = row[col.column_name];

        value =
          typeof raw === "object"
            ? raw?.value ?? ""
            : raw ?? "";
      }

      if (col.master === "credit_card") {
        const str = String(value || "");
        value = str ? `**** **** **** ${str.slice(-4)}` : "";
      }

      if (col.data_type?.toLowerCase().includes("date")) {
        value = value ? new Date(value).toLocaleDateString() : "";
      }

      newRow[col.display_name] = value;
    });

    return newRow;
  });

  exportToExcel(
    formattedRows,
    cols.map(c => c.display_name),
    `${moduleName}` // 👈 IMPORTANT
  );
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

    const handlePrint = (mode, savedCols = []) => {
    const cols = getColumnsToUse(mode, savedCols);

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

   const saveColumnSelection = async () => {
  try {
    // 1️⃣ Save locally (optional but fast UX)
    // localStorage.setItem(
    //   `table_columns_${id}`,
    //   JSON.stringify(selectedColumns)
    // );

    // 2️⃣ Save to DB
    await upsertCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail,
      selectedColumns
    );

    // 3️⃣ Update state
    setSavedTableColumns(selectedColumns);
    setShowColumnSelector(false);
    setTableColumnMode("custom");

  } catch (err) {
    console.error("Failed to save customized columns:", err);
  }
};

   const getColumnsToUse = (mode, savedCols = []) => {
  if (mode === "saved") {
    return columns.filter(c =>
      savedCols.includes(c.column_name)
    );
  }

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

    const handlePdf = async (mode, customCols = null) => {
        let cols;

        if (customCols && Array.isArray(customCols)) {
            cols = columns.filter(col =>
                customCols.includes(col.column_name)
            );
        } else {
            cols = getColumnsToUse(mode);
        }

        // ✅ GET PRINT SETTINGS
        const company = selectedCompany || localStorage.getItem("print_company") || "";
        const moduleTitle = printModuleName || module?.display_name;

        try {
            const res = await exportPdf({
                rows: normalizedRows,
                columns: cols,
                userName: activeUser?.email || "User",

                // ✅ SEND BOTH TO BACKEND
                moduleName: moduleTitle,
                companyName: company,
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));

            const link = document.createElement("a");
            link.href = url;
            link.download = `${moduleTitle || "report"}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            setShowPdfModal(false);
        } catch (err) {
            console.error("PDF export failed:", err);
        }
    };


    useEffect(() => {
    if (!isCreating) return;

    visibleColumns.forEach((col) => {
        if (!col.master) return;

        const key = col.column_name;

        if (autoFilledFields[key]) return;

        const options = getMasterOptions(col, newRow[key] || "");

        if (options.length === 1) {
        const val =
            typeof options[0] === "object"
            ? options[0].value
            : options[0];

        setNewRow((prev) => ({
            ...prev,
            [key]: val
        }));

        setAutoFilledFields((prev) => ({
            ...prev,
            [key]: true
        }));
        }
    });
    }, [isCreating, visibleColumns, masterDataMap]);
    useEffect(() => {
    if (!editRowId) return;

    visibleColumns.forEach((col) => {
        if (!col.master) return;

        const key = col.column_name;

        const options = getMasterOptions(
        col,
        editRow?.[key] || ""
        );

        if (options.length === 1) {
        const val =
            typeof options[0] === "object"
            ? options[0].value
            : options[0];

        setEditRow((prev) => {
            if (prev[key] === val) return prev;

            return {
            ...prev,
            [key]: val
            };
        });
        }
    });
    }, [editRowId, visibleColumns, masterDataMap]);
    return (
        <div className="h-full flex flex-col">

            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800">
                    {module?.display_name || "Loading..."}
                </h1>

                <div className="flex items-center gap-2">

  {/* NEW */}
  
  <PermissionButton
    user={activeUser}
    permission="add"
//      onClick={() => {
//     const empty = {};
//     visibleColumns.forEach(col => {
//       empty[col.column_name] = "";
//     });

//     setNewRow(empty);
//     setShowCreateModal(true);
//   }}
onClick={handleCreate}
    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white 
               hover:bg-green-700 hover:shadow-md transition"
  >
    + New
  </PermissionButton>

  {/* IMPORT */}
  {/* <PermissionButton
    user={activeUser}
    permission="add"
    onClick={() => setShowImportModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
  >
    Import
  </PermissionButton> */}

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
 {dateColumns.map((col, i) => {
  const filter = dateFilters?.[col.column_name];

  const format = (date) =>
    date ? new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) : "";

  return (
    <button
      key={i}
      onClick={() =>
        setActiveDateFilter(
          activeDateFilter === col.column_name ? null : col.column_name
        )
      }
      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
    >
      <div className="flex flex-col items-start">
        

        {filter?.start && filter?.end && (
          <span className="text-sm text-gray-600">
            {col.display_name} Range: {format(filter.start)} - {format(filter.end)}
          </span>
        )}
      </div>
    </button>
  );
})}
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
<DateOnlyFilter
  onApply={(range) => {
    if (!range?.start || !range?.end) return;

    const updatedFilters = {
      ...dateFilters,
      [activeDateFilter]: {
        start: range.start,
        end: range.end,
        source: "picker"
      }
    };

    setDateFilters(updatedFilters);
    setActiveDateFilter(null);

    // ✅ FORCE API CALL
    loadData(updatedFilters);
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

{/* ================= CREATE ROW ================= */}
{isCreating && (
  <tr className="bg-blue-50">
    <td className="px-4 py-3 whitespace-nowrap"></td>

    {visibleColumns.map((col) => {
      const isMaster = !!col.master;
      const isDate = col.data_type?.toLowerCase().includes("date");
      const isAmount = col.data_type?.toLowerCase().includes("decimal")

      // ✅ normalize value (IMPORTANT FIX)
      const rawValue = newRow[col.column_name];
     let value =
  typeof rawValue === "object"
    ? rawValue?.value ?? ""
    : rawValue ?? "";

// 🔐 CREDIT CARD MASKING (CREATE MODE)
if (col.master === "credit_card" && value) {
  const raw = String(value);
  const last4 = raw.slice(-4);
  value = `**** **** **** ${last4}`;
}

      return (
        <td
          key={col.column_id}
          className={`px-4 py-2 ${getAlignClass(col.display_name)} whitespace-nowrap`}
        >
          <div className="relative">

            <input
              type={isDate ? "date" : "text"}
              className="border px-2 py-1 rounded w-full"
              value={
                col.column_name === "total_amount_aed"
                  ? newRow.total_amount_aed || ""
                  : isDate
                  ? formatForInput(value)
                  : value
              }
              disabled={col.column_name === "total_amount_aed"} // ✅ readonly
              onChange={(e) => {
                let val = e.target.value;

                if (isNumericColumn(col.column_name)) {
                  val = handleNumericInput(val);
                }

                handleNewRowChange(col.column_name, val, col.master);

                setAutoFilledFields(prev => ({
                  ...prev,
                  [col.column_name]: true
                }));

                if (col.column_name === "plans") {
                  setPlanManuallyChanged(true);
                }

                setActiveDropdown(`create-${col.column_name}`);
              }}
              onFocus={() => {
                if (!isMaster) return;

                if (col.column_name === "plan_provider") {
                    setPendingColumn(col);
                    setShowPlanProviderPopup(true);
                    return;
                }

                setActiveDropdown(`create-${col.column_name}`);
                }}
              onBlur={(e) => {

                if (isAmount && e.target.value !== "") {
                    handleNewRowChange(
                    col.column_name,
                    Number(e.target.value).toFixed(2),
                    col.master
                    );
                }

                setTimeout(() => setActiveDropdown(null), 150);
                }}
            />

            {/* MASTER DROPDOWN */}
           {isMaster &&
  activeDropdown === `create-${col.column_name}` && (() => {

    const rawOptions = getMasterOptions(col, value, newRow).slice(0, 20);

    const filteredOptions = rawOptions.filter((val) => {
      const display = typeof val === "object" ? val.value : val;

      return display
        ?.toLowerCase()
        .includes((value || "").toLowerCase());
    });

    const showAdd =
      value &&
      filteredOptions.length === 0;

    return (
      <div className="absolute z-50 bg-white border w-full max-h-48 overflow-auto shadow-lg rounded mt-1">

        {/* EXISTING OPTIONS */}
        {filteredOptions.map((val, i) => {
          const display = typeof val === "object" ? val.value : val;

          return (
            <div
              key={i}
              className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
              onMouseDown={() => {
                handleNewRowChange(
                  col.column_name,
                  display,
                  col.master
                );

                setAutoFilledFields((prev) => ({
                  ...prev,
                  [col.column_name]: true
                }));

                if (col.column_name === "plans") {
                  setPlanManuallyChanged(true);
                }

                setActiveDropdown(null);
              }}
            >
              {display}
            </div>
          );
        })}

        {/* ➕ ADD NEW VALUE */}
        {showAdd && (
          <div
            className="px-3 py-2 text-green-600 hover:bg-green-50 cursor-pointer border-t font-medium"
            onMouseDown={async () => {
              const newValue = value;

              // 🔥 CALL API TO ADD MASTER
              await addMasterValue(col.master, newValue);

              handleNewRowChange(
                col.column_name,
                newValue,
                col.master
              );

              setAutoFilledFields((prev) => ({
                ...prev,
                [col.column_name]: true
              }));

              setActiveDropdown(null);
            }}
          >
            ➕ Add
          </div>
        )}

      </div>
    );
  })()}

          </div>
        </td>
      );
    })}

    {/* ACTIONS */}
    <td className="px-4 py-3 whitespace-nowrap flex gap-2 justify-end">
      <button onClick={handleSave} className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition">Save</button>
      <button onClick={handleCancel} className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
              hover:bg-red-100 hover:border-red-500 transition">Cancel</button>
    </td>
  </tr>
)}

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
      const isAmount = col.data_type?.toLowerCase().includes("decimal");

      // ✅ normalize row value (CRITICAL FIX)
      const rawValue = row?.[col.column_name];
      let value =
  typeof rawValue === "object"
    ? rawValue?.value ?? ""
    : rawValue ?? "";

// 🔐 CREDIT CARD MASKING (CREATE MODE)
if (col.master === "credit_card" && value) {
  const raw = String(value);
  const last4 = raw.slice(-4);
  value = `**** **** **** ${last4}`;
}

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
                onBlur={(e) => {

                if (isAmount && e.target.value !== "") {

                    setEditRow(prev => ({
                    ...prev,
                    [col.column_name]: Number(e.target.value).toFixed(2)
                    }));
                }

                setTimeout(() => setActiveDropdown(null), 150);
                }}
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

  // ✅ DECIMAL FORMAT
  if (
    col.data_type?.toLowerCase().includes("decimal") &&
    value !== ""
  ) {
    return Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  if (col.column_name.toLowerCase().includes("amount")) {
    return value ? Number(value).toLocaleString() : "-";
  }

  if (col.master === "credit_card") {
    const raw = String(value ?? "");
    const last4 = raw.slice(-4);
    return raw ? `**** **** **** ${last4}` : "-";
  }

  return typeof value === "object" ? value.value : value;

})()
          )}

        </td>
      );
    })}

    {/* ACTIONS */}
    <td className="px-4 py-3 whitespace-nowrap flex gap-2 justify-end">

      {editRowId === row.id ? (
        <>
          <button onClick={handleSaveEdit} className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition">Save</button>
          <button onClick={handleCancelEdit} className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
              hover:bg-red-100 hover:border-red-500 transition">Cancel</button>
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
            className="px-3 py-1.5 text-sm rounded-md border border-blue-300 bg-white 
              hover:bg-blue-100 hover:border-blue-500 transition"
          >
            Edit
          </PermissionButton>

          <PermissionButton
            user={activeUser}
            permission="delete"
            onClick={() => handleDelete(row)}
           className="px-3 py-1.5 text-sm rounded-md border border-red-300 bg-white 
              hover:bg-red-100 hover:border-red-500 transition"
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
                                    onClick={async () => {
                                    const savedCols = await fetchCustomizedColumns();

                                    handlePrint("saved", savedCols); // ✅ pass directly
                                    }}
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
                                     Header
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
                                     onClick={async () => {
                                    const savedCols = await fetchCustomizedColumns();

                                    handleExcel("saved", savedCols); // ✅ pass directly
                                    }}
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
                                     Header
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
                                   onClick={async () => {
                                        const savedCols = await fetchCustomizedColumns();
                                        handlePdf("saved", savedCols);
                                    }}
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
                                     Header
                                </button>

                            </div>

                        </Modal>
                    )}
                   {showTableColumnModal && (
  <Modal
    title="Customize Columns"
    onClose={() => setShowTableColumnModal(false)}
  >
    <div className="flex gap-3">

      {/* DEFAULT */}
      <button
        onClick={() => {
          setTableColumnMode("default");
          setSelectedColumns([]); // reset
        }}
        className="btn btn-gray flex-1"
      >
        Default
      </button>

      {/* SAVED (DB or localStorage fallback) */}
      <button
        onClick={async () => {
          try {
            // preferred: API saved columns
            const res = await getCustomizedColumns(currentModule?.module_id,
      activeUserEmail);

            if (res?.data?.data?.columns) {
              setSavedTableColumns(res.data.data.columns);
            } else {
              setSavedTableColumns(saved);
            }

            setTableColumnMode("saved");
          } catch (err) {
            console.error(err);
          }
        }}
        className="btn btn-blue flex-1"
      >
        Saved
      </button>

      {/* CUSTOM */}
      <button
        onClick={() => {
          setShowColumnSelector(true);
          setTableColumnMode("custom");

          // optional: preload existing config into selector
          setSelectedColumns(savedTableColumns || []);
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
                                    <div className="mt-3">
                                    <label className="block text-sm font-medium mb-1">
                                        Module Name
                                    </label>

                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded"
                                        placeholder="Enter module name (optional)"
                                        value={printModuleName}
                                        onChange={(e) => setPrintModuleName(e.target.value)}
                                    />
                                    </div>
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