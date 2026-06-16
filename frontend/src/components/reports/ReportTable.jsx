import React,{ useEffect, useState, useRef, useLayoutEffect, act, use, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, exportColumnNames, importTable, getMasterValues, currencises, exportPdf, getProviderPlans,upsertSavedFilter, getCustomizedColumns, upsertCustomizedColumns, getMasterData, addMasterData, cancelModuleRow, undoCancelModuleRow, getVatPercentage, getLastPRFNumber, createprf, getApprovalWorkflow, getPreviewPRF, unpostPRFTransaction, postPRFTransaction, getReportData   } from "../../api/api";
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
import Loader from "../Loader";
import ConfirmModal from "../ConfirmationPopups";
import PrintableTable from "../PrintableTable";
import ValidatePopups from "../Validatepopups";
import PaymentRequestPreview from "../paymentreqform/PaymentRequestPreview"
import { DndContext, closestCenter } from "@dnd-kit/core";
import mainTableConfig from "../../utils/mainTableConfig";
import { getDateRange } from "../../utils/dateRanges";
import TableFiltersDrawer from "../filters/TableFiltersDrawer";
import ShowHideColumnsPopup from "../tables/ShowHideColumnsPopup";
import { createPortal } from "react-dom";
import EditRowPopup from "../tables/EditRowPopup";
import CustomizeDrawer from "../tables/CustomizeDrawer";
import { EyeIcon } from "@heroicons/react/24/outline";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { REPORT_VIEWS } from "../../utils/reportStructure";







export default function ReportTable() {
    const { id } = useParams();
    //console.log("ReportTable ID:", id);
    const location = useLocation();
    //console.log("ReportTable Location State:", location.state);
    const [report, setReport] = useState(location.state?.report || null);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showImportExport, setShowImportExport] = useState(false);
    const [search, setSearch] = useState("");
    const [searchColumnKey, setSearchColumnKey] = useState(null);
    const [page, setPage] = useState(1);
    const [file, setFile] = useState(null);
    const printRef = useRef();
    const pageSize = 10;
    const [columnSearch, setColumnSearch] = useState("");
    const [selectedColumns, setSelectedColumns] = useState([]);
    const [masterDataMap, setMasterDataMap] = useState({});
    const [currencies, setCurrencies] = useState([]);
    const [filters, setFilters] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState("");
    const [printLogo, setPrintLogo] = useState(null);
    const activeUser = JSON.parse(localStorage.getItem("user"));
    const activeUserEmail = activeUser?.email;
    const activeUserName = activeUser?.name;
    const userRole = activeUser?.role;
    const [groupBy, setGroupBy] = useState({
      key: null,
      direction: "asc"
    });
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const currentModule =  report?.report_id;
    const [printModuleName, setPrintModuleName] = useState("");
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const searchInputRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showFilters, setShowFilters] = useState(false);
    const [openMenu, setOpenMenu] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [company, setCompany] = useState([]);
    const [products, setProducts] = useState([]);
    const [currency, setCurrency] = useState([]);
    const [term, setTerm] = useState([]);
    const [currencyMap, setCurrencyMap] = useState({});
    const [termMap, setTermMap] = useState({});
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
   
    
  
  
const getCurrentMonth = () => {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const format = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  return {
    startDate: format(start),
    endDate: format(end),
  };
};



const [dateFilters, setDateFilters] = useState(getCurrentMonth());

const isFilterActive = search || filters?.length > 0 

 useEffect(() => {
    getMasterValues("products").then(res => {
      const result = Array.isArray(res.data) ? res.data : [];
      //console.log("Raw Service Providers:", result);
      setProducts(result);
      //console.log("Service Providers:", result);
    });
     getMasterValues("vendors").then(res => {
        const result = Array.isArray(res.data) ? res.data : [];
        setVendors(result);
        //console.log("Vendors:", result);
      });
getMasterValues("currency").then(res => {
  const result = Array.isArray(res?.data?.data)
    ? res.data.data
    : [];

  setCurrencies(result);
  console.log("Currencies:", result);
});
console.log("Initial currencies state:", currencies);
       getMasterValues("billing_cycle").then(res => {
  const result = Array.isArray(res?.data?.data)
    ? res.data.data
    : [];

  setTerm(result);
});




    getMasterValues("company").then(res => {
  const result = Array.isArray(res?.data) ? res.data : [];

  const tradeNames = result.map(item => item.trade_name);

  setCompany(tradeNames);

 // console.log("Company trade names:", tradeNames);
});
    }, []);



console.log("Currency Map:", currencyMap);
console.log("Term Map:", termMap);

const onInputChange = (e) => {
  const { name, value } = e.target;

  setDateFilters((prev) => ({
    ...prev,
    [name]: value,
  }));
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



const applyDateFilter = async () => {
  try {
    setLoading(true);

    const payload = {
      search,
      filters: JSON.stringify(filters || []),
      dateFilters: JSON.stringify({
        date: {
          startDate: dateFilters.startDate || dateFilters.start,
          endDate: dateFilters.endDate || dateFilters.end,
        },
      }),
    };

    // console.log("Applying date filter:", payload);

    const res = await getModuleData(id, activeUserEmail, payload, userRole);

    setRows(res.data || []);

  } catch (err) {
    console.error(err);
    setRows([]);
  } finally {
    setLoading(false);
  }
};



const buildDatePayload = (df) => {
  return {
    date: {
      startDate: df.startDate,
      endDate: df.endDate,
    },
  };
};


const getExcelColumns = (mode, savedCols = [], groupBy = "service") => {

  const cols = getColumnsToUse(mode, savedCols);

  const currencies = [
    ...new Set(finalRows.map(r => r.currency).filter(Boolean))
  ];

  // =========================
  // NORMAL COLUMNS
  // =========================
  const normalCols = cols.filter(c => {
    const name = c.column_name.toLowerCase();
    return name !== "amount" && name !== "currency";
  });

  // =========================
  // DYNAMIC CURRENCY COLUMNS
  // =========================
  const currencyCols = currencies.map(cur => ({
    column_name: `amount_${cur.toLowerCase()}`,
    display_name: `AMOUNT (${cur.toUpperCase()})`,
    currency: cur,
    isDynamicCurrency: true,

    // ✅ IMPORTANT: prevent grouping confusion
    isDerived: true
  }));

  // =========================
  // FINAL COLS
  // =========================
  let finalCols = [...normalCols, ...currencyCols];

  // sort totals last
  finalCols = sortColumns(finalCols);

  // =========================
  // ADD GROUP META (IMPORTANT FIX)
  // =========================
  finalCols.groupBy = groupBy;

  return finalCols;
};

const getValue = (row, col) => {
  let value = "";

  // dynamic currency
  if (col.isDynamicCurrency) {
    value =
      row.currency === col.currency
        ? row.amount
        : "";
  } else {
    const raw = row?.[col.column_name];
    value =
      typeof raw === "object"
        ? raw?.value ?? ""
        : raw ?? "";
  }

  // credit card mask
  if (col.master === "credit_card") {
    const str = String(value || "");
    value = str
      ? `**** **** **** ${str.slice(-4)}`
      : "";
  }

  // date format
  if (col.data_type?.toLowerCase().includes("date")) {
    value = value
      ? new Date(value).toLocaleDateString()
      : "";
  }

  return value;
};

const handleExcel = async () => {
  const cols = orderedVisibleColumns;

  const moduleName =
    printModuleName ||
    localStorage.getItem("print_module_name") ||
    module?.display_name;

  const groups = printableGroupedRows; // ✅ already grouped correctly

  const rows = [];
  let serialNo = 1;

  groups.forEach(group => {
    group.rows.forEach(row => {
      const newRow = {
        SNo: serialNo++,
        Group: group.group // keep group name only for data rows
      };

      cols.forEach(col => {
        newRow[col.display_name] = getValue(row, col);
      });

      rows.push(newRow);
    });
  });

  exportToExcel(
    printableGroupedRows,
    cols.map(c => c.display_name),
    moduleName,
    groupBy,
    columns
  );

  //console.log("Excel exported rows:", printableGroupedRows);
};
    

const transformColumns = (mod, dataRows = []) => {

  let cols = mod?.columns || [];



  // ================= 1. EXTRACT CURRENCIES (FIXED) =================
  const currencies = new Set();

  dataRows.forEach(row => {
    if (row.currency) {
      currencies.add(row.currency.trim().toUpperCase());
    }
  });

  const currencyList = Array.from(currencies);

  // console.log("🔥 Final Currency List:", currencyList);

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

  setColumns(orderColumnsByConfig(result));

  // console.log("🔥 Final Transformed Columns:", result);
};

  




useEffect(() => {
  loadReport(id, dateFilters);
}, [ filters, search]);






const fetchMasterDataForColumn = async (master) => {
  if (!master) return;
  if (masterDataMap[master]?.length) return; // already loaded

  setLoadingMaster(master); // start loading

  try {
    const res = await getMasterValues(master);
    setMasterDataMap(prev => ({
      ...prev,
      [master]: res.data.data || []
    }));
  } catch (err) {
    console.error("Master fetch failed:", master, err);
  } finally {
    setLoadingMaster(null); // stop loading
  }
};




const getExchangeRate = (currencyCode) => {
  const list = currencies || [];

  const searchValue = (currencyCode || "")
    .toString()
    .trim()
    .toUpperCase();

  const currency = list.find(c => {
    const code = (c.currency_code || "")
      .toString()
      .trim()
      .toUpperCase();

    const name = (c.currency || "")
      .toString()
      .trim()
      .toUpperCase();

    return code === searchValue || name === searchValue;
  });

  if (searchValue === "AED") return 1;

  if (currency?.exchange_rate) {
    return 1 / Number(currency.exchange_rate);
  }

  return 1;
};
const calculateCost = (amount, currencyCode, term) => {
  if (!amount || !currencyCode) return null;
  const rate = getExchangeRate(currencyCode);
  if (!rate || isNaN(rate)) return null;
  return Number(amount) * Number(rate);
};



    const toMasterKey = (columnName, rawVal) => {
if (rawVal === null || rawVal === undefined || rawVal === "") return rawVal;

const col = columns.find(c => c.column_name === columnName);
if (!col?.master) return rawVal;

const options = getMasterOptions(col, "");
const input = String(rawVal).trim().toLowerCase();

const hit = options.find(o => {
const key = String(o?.key ?? o?.id ?? o?.value ?? "").trim().toLowerCase();
const val = String(o?.value ?? o ?? "").trim().toLowerCase();
return input === key || input === val;
});

return hit ? (hit.key ?? hit.id ?? hit.value) : rawVal;
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

  
     
const handleClear = async () => {
  const defaults = getCurrentMonth();

  // ================= RESET SEARCH =================
  setSearch("");
  setSearchColumnKey(null);

  // ================= RESET FILTERS =================
  setFilters([]);

  // ================= RESET DATE =================
  setDateFilters(defaults);
  setActiveDateFilter("");

  // ================= RESET SORT + GROUP =================
  setSortConfig([]);
  setSortKey(null);
  setSortOrder(null);
  setGroupBy("");

  // ================= RESET CHIPS =================
  setColumnChips([]);

  // 🔥 IMPORTANT: RESET DERIVED CHIPS
  setGroupedChips({
    search: [],
    sort: [],
    group: []
  });

  // ================= RESET UI =================
  setOpenIndex(null);

  // ================= API =================
  const payload = {
    search: "",
    filters: JSON.stringify([]),
    dateFilters: JSON.stringify(buildDatePayload(defaults)),
    sort: JSON.stringify([]),
    groupBy: ""
  };

  try {
    setLoading(true);

    const res = await getModuleData(
      id,
      activeUserEmail,
      payload,
      userRole
    );

    setRows(res.data || []);
  } catch (err) {
    console.error(err);
    setRows([]);
  } finally {
    setLoading(false);
  }
};
    useEffect(() => {
        const close = () => setOpenIndex(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, []);

    useEffect(() => {
      const closeMenu = () => setOpenMenu(null);
      window.addEventListener("click", closeMenu);
      return () => window.removeEventListener("click", closeMenu);
    }, []);

    const handlePrint = () => {
  const cols = orderedVisibleColumns;

openPrintWindow({
  content: generateTableHTML(
    orderedVisibleColumns,
    printableGroupedRows
  ),
  userName: activeUser?.name || "User",
});

  setColumns(cols); // optional UI sync
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


   const getColumnsToUse = (mode, savedCols = []) => {
   // console.log("Getting columns for mode:", savedCols);
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

   const normalizeString = (str) =>
  String(str).toLowerCase().replace(/\s+/g, "");

const getSearchableColumns = () => {
  if (!searchColumnKey) return visibleColumns;

  const selectedCol = visibleColumns.find(
    (col) => col.column_name === searchColumnKey
  );

  return selectedCol ? [selectedCol] : visibleColumns;
};

const rowMatchesSearch = (row) => {
  const searchNorm = normalizeString(search);
  if (!searchNorm) return true;

  return getSearchableColumns().some((col) => {
    const val = row[col.column_name];
    const cellNorm = normalizeString(
      typeof val === "object" ? val?.value ?? "" : val ?? ""
    );
    return cellNorm.includes(searchNorm);
  });
};

const finalRows = filtered.filter((row) => rowMatchesSearch(row));

    const normalizedRows = finalRows.map(row => {
  const currency = (row.currency || "").toLowerCase();

  return {
    ...row,
    [`amount_${currency}`]: row.amount
  };
});


    // ================= PAGINATION =================
    const totalPages = Math.ceil(normalizedRows.length / pageSize);

  

  const handlePdf = async (
  mode,
  customCols = null,
  groupBy = "service",
  pdfColumns = orderedVisibleColumns,
  pdfRows = printableGroupedRows
) => {

  let cols;

  if (customCols && Array.isArray(customCols)) {
    cols = pdfColumns.filter(col =>
      customCols.includes(col.column_name)
    );
  } else {
    cols = pdfColumns;
  }

  const company =
    selectedCompany || localStorage.getItem("print_company") || "";

  const moduleTitle =
    printModuleName || module?.display_name;

  try {
    const res = await exportPdf({
      rows: pdfRows,        // ✅ PRINT DATA USED HERE
      columns: cols,        // ✅ PRINT COLUMNS USED HERE
      userName: activeUser?.name || "User",

      moduleName: moduleTitle,
      companyName: company,
      groupBy
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

const filteredRows = rows.filter((row, rowIndex) => {



  // =========================
  // 1. FILTER CHIPS
  // =========================

  const passesFilters = filters.every((filter) => {

    const selectedValues =
      (filter.values || []).map(normalize);

    if (selectedValues.length === 0) return true;

    // ✅ MASTER → COLUMN_NAME
const fieldKey =
  columns.find(
    (c) =>
      c.master === filter.master ||
      c.master1 === filter.master
  )?.column_name || filter.master;

    const rawValue = row?.[fieldKey];

    const rowValue = normalize(
      typeof rawValue === "object"
        ? rawValue?.value
        : rawValue
    );



    return selectedValues.includes(rowValue);
  });



  if (!passesFilters) {



    return false;
  }

  // =========================
  // 2. SEARCH FILTER
  // =========================

  return rowMatchesSearch(row);
});


// ======================================================
// SORT FILTERED ROWS
// ======================================================



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
   //console.log("Checking columns from raw data:", name);
  return (
    name.includes("amount") ||
    // name.includes("cost") ||
    name.includes("price") ||
    name.includes("total")
  );
};

const isTotalColumn = (col) => {
  const name = col.column_name.toLowerCase();
   //console.log("Checking columns from raw data:", name);
  return (
    name.includes("total")
  );
};

// SORT TOTAL LAST
const sortColumns = (cols) => {
   // console.log("Sorting columns:", cols.map(c => c.column_name));
  const normal = cols.filter(
    c => !c.column_name.toLowerCase().includes("total")
  );

  const total = cols.filter(
    c => c.column_name.toLowerCase().includes("total")
  );

  return [...normal, ...total];
};

const getGroupKey = (row, groupBy) => {
  if (!groupBy?.key) {
    return "All Records";
  }

  const value = row[groupBy.key];

  const finalValue =
    typeof value === "object"
      ? value?.value
      : value;

  return String(finalValue || "(Blank)").trim();
};

const grandTotals = {};

//console.log("Current groupBy:", groupBy);
//console.log("Current printableGroupedRows:", printableGroupedRows);

const generateTableHTML = (cols, groupedData) => {
  //console.log("groupedData for HTML generation:", groupedData);

  // ✅ KEEP ORDER FROM UI (DO NOT regroup)
  const rows = groupedData.flatMap(g => g.rows);

const groupedRows = Array.isArray(groupedData)
  ? groupedData
  : Object.entries(groupedData || {}).map(([group, rows]) => ({
      group,
      rows
    }));

  //console.log("rows for HTML generation:", rows);

  const company = localStorage.getItem("print-company");

  // =====================================================
  // DISTINCT CURRENCIES
  // =====================================================
  const currencies = [
    ...new Set(
      rows
        .map(r => r.currency)
        .filter(Boolean)
    )
  ];

  // =====================================================
  // REMOVE amount + currency columns
  // =====================================================
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

  // =====================================================
  // FINAL COLUMNS
  // =====================================================
  const sortedCols = sortColumns([
    ...normalCols,
    ...currencyCols
  ]);

  const firstTotalIndex = sortedCols.findIndex(isTotalColumn);

  // =====================================================
  // GRAND TOTALS
  // =====================================================
  const grandTotals = {};

  sortedCols.forEach(col => {
    if (isTotalColumn(col)) {
      grandTotals[col.column_name] = rows.reduce((sum, row) => {
        return sum + toNumber(row[col.column_name]);
      }, 0);
    }
  });

  // =====================================================
  // HELPERS
  // =====================================================
  const isDateColumn = (col) => {
    const data_type = (col.data_type || "").toLowerCase();
    return data_type.includes("date");
  };

  // =====================================================
  // HTML
  // =====================================================
  return `
    <div style="text-align:center; margin-bottom:20px;">

      ${
        company
          ? `<h1 style="font-size:24px; margin-bottom:5px;">${company}</h1>`
          : ``
      }

      <h2>${printModuleName?.trim() || module?.display_name}</h2>

    </div>

    <table border="1" cellspacing="0" cellpadding="5"
      style="width:100%; border-collapse:collapse;">

      <!-- HEADER -->
      <thead>
        <tr>
          <th>S.No</th>
          ${sortedCols.map(col => `
            <th>${col.display_name}</th>
          `).join("")}
        </tr>
      </thead>

      <!-- BODY -->
     <tbody>

${groupedRows.map(group => `

  ${groupBy?.key ? `
    <tr>
      <td
        colspan="${sortedCols.length + 1}"
        style="
          font-weight:bold;
          background:#f5f5f5;
          text-align:left;
          padding:8px;
        "
      >
        ${group.group}
      </td>
    </tr>
  ` : ""}

  ${group.rows.map((row, index) => `
    <tr>

      <td style="text-align:center">
        ${index + 1}
      </td>

      ${sortedCols.map(col => {

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
          const str = String(value);
          const last4 = str.slice(-4);

          return `
            <td style="text-align:center">
              **** **** **** ${last4}
            </td>
          `;
        }

        if (isDateColumn(col)) {
          value = value
            ? formatDate(value)
            : "";
        }

        if (
          isNumericColumn(col) ||
          col.isDynamicCurrency
        ) {
          return `
            <td style="text-align:right">
              ${
                value === ""
                  ? ""
                  : toNumber(value) === 0
                    ? "-"
                    : formatNumber(value)
              }
            </td>
          `;
        }

        return `
          <td style="text-align:center">
            ${value || "-"}
          </td>
        `;

      }).join("")}

    </tr>
  `).join("")}

`).join("")}

</tbody>

    </table>

    <!-- ================= GRAND TOTAL ================= -->
    <table border="1" cellspacing="0" cellpadding="5"
      style="width:100%; margin-top:30px; border-collapse:collapse;">

      <tbody>
        <tr style="font-weight:bold; background:#ddd;">

          <td></td>

          <td colspan="${firstTotalIndex > 0 ? firstTotalIndex : 1}" style="text-align:right;">
            GRAND TOTAL
          </td>

          ${sortedCols.slice(firstTotalIndex).map(col => {

            if (!isTotalColumn(col)) {
              return `<td></td>`;
            }

            return `
              <td style="text-align:right;">
                ${grandTotals[col.column_name] === 0
                  ? "-"
                  : formatNumber(grandTotals[col.column_name] || 0)}
              </td>
            `;
          }).join("")}

        </tr>
      </tbody>

    </table>
  `;
};





const handleQuickDateChange = (value) => {
  setActiveDateFilter(value);

  const range = getDateRange(value);

  if (range) {
    setDateFilters(range);
  }
};



useEffect(() => {
  const loadMasters = async () => {
    try {
      const currencyRes = await getMasterValues("currency");
      const termRes = await getMasterValues("billing_cycle");

      console.log("🔥 RAW currencyRes:", currencyRes);
      console.log("🔥 RAW termRes:", termRes);

      const currencyData =
        currencyRes?.data?.data ||
        currencyRes?.data ||
        [];

      const termData =
        termRes?.data?.data ||
        termRes?.data ||
        [];

      console.log("👉 currencyData:", currencyData);
      console.log("👉 termData:", termData);

      const { currencyMap, termMap } =
        buildMasterMaps(currencyData, termData);

      setCurrencies(currencyData);
      setTerm(termData);
      setCurrencyMap(currencyMap);
      setTermMap(termMap);

      console.log("🔥 currencyMap:", currencyMap);
      console.log("🔥 termMap:", termMap);

    } catch (err) {
      console.error(err);
    }
  };

  loadMasters();
}, []);

const buildMasterMaps = (currencyData, termData) => {
  const currencyMap = {};
  const termMap = {};

  (currencyData || []).forEach(c => {
    if (c?.key) {
      currencyMap[String(c.key).trim()] = c.value;
    }
  });

  (termData || []).forEach(t => {
    if (t?.key) {
      termMap[String(t.key).trim()] = t.value;
    }
  });

  return { currencyMap, termMap };
};


const buildDynamicColumns = (data, currencyMap, termMap) => {
  if (!data || data.length === 0) return [];

  const sample = data[0];
  const keys = Object.keys(sample);

  return keys.map((key) => {

    if (key === "company") {
      return {
        column_name: key,
        display_name: "Company"
      };
    }

    if (key.startsWith("CR")) {
      return {
        column_name: key,
        display_name: `Cost (${currencyMap?.[key] || key})`
      };
    }

    if (key.startsWith("BC")) {
      return {
        column_name: key,
        display_name: `Total Cost (${termMap?.[key] || key} AED)`
      };
    }

    return {
      column_name: key,
      display_name: key
    };
  });
};

const getCellValue = (row, col) => {
  const value = row[col.column_name];

  if (col.column_name.startsWith("CR")) {
    return value ?? "-";
  }

  if (col.column_name.startsWith("BC")) {
    return value ?? "-";
  }

  return value ?? "-";
};

const loadReport = async (reportId, overrideDateFilters = dateFilters) => {
  try {
    setLoading(true);

    const payload = {
      filters: JSON.stringify(filters || []),
      dateFilters: JSON.stringify({
        date: {
          startDate: overrideDateFilters.startDate,
          endDate: overrideDateFilters.endDate,
        },
      }),
    };

    const res = await getReportData(reportId, activeUserEmail, payload);

    const data = res.data || [];

    setRows(data);

    // ✅ MASTER DRIVEN COLUMNS
    const dynamicCols = buildDynamicColumns(data);
    setColumns(dynamicCols);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};















    return (
        <div className="h-full flex flex-col">
            
            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800 truncate">
                    {report?.description || "Loading..."}
                </h1>

               {/* ================= ACTIONS ================= */}

{/* DESKTOP VIEW (UNCHANGED ROW) */}
<div className="hidden md:flex items-center gap-2">
  


  <PermissionButton
  user={activeUser}
  permission="print"
  onClick={handlePrint}
  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
             hover:bg-gray-100 hover:border-gray-500 transition"
>
  Print
</PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="export"
    onClick={handleExcel}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition"
  >
    Excel
  </PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="export"
    onClick={handlePdf}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition"
  >
    PDF
  </PermissionButton>

  <button
    onClick={() => setShowCustomizeDrawer(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
  >
    Customize
  </button>

  <button
  onClick={() => window.location.reload()}
  className="
    px-3 py-1.5 text-sm rounded-md
    border border-gray-300
    bg-white
    hover:bg-blue-50
    hover:border-blue-400
    hover:text-blue-600
    transition
    flex items-center gap-2
  "
>
 
  Refresh
</button>
   <button 
   onClick={() => setShowFilters(true)}
   className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 transition">
        Filters
   </button>
 


</div>


            </div>

            {/* ================= CONTROL BAR (LEFT ALIGNED) ================= */}
           <div className="bg-white p-3 rounded-xl shadow mb-4">



  {/* ================= DESKTOP ================= */}
  <div className="hidden md:flex flex-wrap items-center gap-3">

    <input
      ref={searchInputRef}
      type="text"
      placeholder={
        searchColumnKey
          ? `Search in ${
              visibleColumns.find((c) => c.column_name === searchColumnKey)
                ?.display_name || searchColumnKey
            }...`
          : "Search records..."
      }
      className="border px-3 py-2 rounded-lg w-60"
      value={search}
      onChange={(e) => {
        const value = e.target.value;
        setSearch(value);
        if (value === "") {
          setSearchColumnKey(null);
        }
      }}
    />

    

<div className="flex flex-wrap items-center gap-3">

  {/* Start Date */}
  <input
    type="date"
    name="startDate"
    value={dateFilters.startDate}
    onChange={onInputChange}
    className="
      h-9 w-[130px]
      rounded-xl
      border border-gray-200
      bg-white
      px-4
      text-sm
      shadow-sm
      hover:border-gray-300
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
    "
  />

  {/* <span className="text-gray-400 font-medium">→</span> */}

  {/* End Date */}
  <input
    type="date"
    name="endDate"
    value={dateFilters.endDate}
    onChange={onInputChange}
    className="
      h-9 w-[130px]
      rounded-xl
      border border-gray-200
      bg-white
      px-4
      text-sm
      shadow-sm
      hover:border-gray-300
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
    "
  />

  {/* Quick Date Dropdown */}
  <select
    value={activeDateFilter || ""}
    onChange={(e) => handleQuickDateChange(e.target.value)}
    className="
      h-9
      min-w-[140px]
      rounded-xl
      border border-gray-200
      bg-white
      px-4
      text-sm
      shadow-sm
      hover:border-gray-300
      focus:outline-none
      focus:ring-2
      focus:ring-blue-500
      cursor-pointer
    "
  >
    <option value=""> Quick Range</option>
    <option value="today">Today</option>
    <option value="yesterday">Yesterday</option>
    <option value="tomorrow">Tomorrow</option>
    <option value="thisWeek">This Week</option>
    <option value="lastWeek">Last Week</option>
    <option value="thisMonth">This Month</option>
    <option value="lastMonth">Last Month</option>
    <option value="thisYear">This Year</option>
    <option value="lastYear">Last Year</option>
    {/* <option value="custom">Custom Range</option> */}
  </select>

  {/* Apply */}
  <button
    onClick={applyDateFilter}
    className="
      h-9
      px-5
      rounded-xl
      bg-blue-600
      text-white
      text-sm
      font-medium
      shadow-sm
      hover:bg-blue-700
      transition
    "
  >
    Search
  </button>

  {/* Clear */}
  <button
    onClick={handleClear}
    className="
      h-9
      px-5
      rounded-xl
      border border-gray-200
      bg-white
      text-sm
      font-medium
      shadow-sm
      hover:bg-gray-50
      transition
    "
  >
    Clear
  </button>

</div>

  {/* Right side: Pagination + Total */}
<div className="ml-auto flex items-center gap-4">
  <div className="flex items-end gap-2 text-sm">
    <button
      disabled={page === 1}
      onClick={() => setPage(1)}
      className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      title="First Page"
    >
      ⏮
    </button>

    <button
      disabled={page === 1}
      onClick={() => setPage((p) => Math.max(p - 1, 1))}
      className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      title="Previous"
    >
      ◀
    </button>

    <div className="px-3 py-1 rounded-md bg-gray-50 border text-gray-700 font-medium">
      {page} / {totalPages || 1}
    </div>

    <button
      disabled={page === totalPages}
      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
      className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      title="Next"
    >
      ▶
    </button>

    <button
      disabled={page === totalPages}
      onClick={() => setPage(totalPages)}
      className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      title="Last Page"
    >
      ⏭
    </button>
  </div>

  <span className="text-sm text-gray-500">
    Total: {finalRows.length}
  </span>
</div>
  </div>

</div>
          




    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"> 

  {/* Loader */}
  {loading ? (
    <div className="flex justify-center items-center h-80">
      <Loader type="orbit" />
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col.column_name}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 border-b"
              >
                {col.display_name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-blue-50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.column_name}
                    className="px-4 py-3 border-b text-sm text-gray-700"
                  >
                    {getCellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-gray-500"
              >
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )}
</div>

           
         <div ref={printRef} className="hidden print:block">
          
  <PrintableTable
    columns={columns}
    finalRows={finalRows}
    printModuleName={printModuleName}
   // module={module}
    groupBy={groupBy}
  />
</div>



        </div>



    );
}