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
    console.log("ReportTable ID:", id);
    const location = useLocation();
    console.log("ReportTable Location State:", location.state);
    const [isCreating, setIsCreating] = useState(false);
    const [newRow, setNewRow] = useState({});
    const [editRowId, setEditRowId] = useState(null);
    const [editRow, setEditRow] = useState({});
    const [originalRow, setOriginalRow] = useState({});
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
    const activeUserName = activeUser?.name;
    const isUserHavePrfAccess = activeUser?.prf_access;
    const userRole = activeUser?.role;
    const [vatPercent, setVatPercent] = useState(0);
    const [providerPlansMap, setProviderPlansMap] = useState({});
    const [providerPlans, setProviderPlans] = useState([]);
    const [autoFilledFields, setAutoFilledFields] = useState({});
    const [planManuallyChanged, setPlanManuallyChanged] = useState(false);
    const [groupBy, setGroupBy] = useState({
      key: null,
      direction: "asc"
    });
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const [showSaveFilter, setShowSaveFilter] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState("");
    const currentModule =  report?.report_id;
    const [savedTableColumns, setSavedTableColumns] = useState([]);
    const [printModuleName, setPrintModuleName] = useState("");
    const [showPlanProviderPopup, setShowPlanProviderPopup] = useState(false);
    const [pendingColumn, setPendingColumn] = useState(null);
    const [inputValues, setInputValues] = useState({});
    const [activeField, setActiveField] = useState(null);
    const isInitialLoading = loading || columns.length === 0;
    const [loadingMaster, setLoadingMaster] = useState(null);
    const [tempSelectedColumns, setTempSelectedColumns] = useState([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmData, setConfirmData] = useState({});
    const [popupMessage, setPopupMessage] = useState("");
    const [popupType, setPopupType] = useState("");
    const [vendors, setVendors] = useState([]);
    const [company, setCompany] = useState([]);
    const [serviceProviders, setServiceProviders] = useState([]);
    const [creditCards, setCreditCards] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [modalItems, setModalItems] = useState([]);
    const [prfNumber, setPrfNumber] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewFromGenerateModal, setPreviewFromGenerateModal] = useState(false);
    const [workflow, setWorkflow] = useState({});
    const [availableProducts, setAvailableProducts] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [pinnedColumns, setPinnedColumns] = useState([]);
    const [visibleColumnsState, setVisibleColumnsState] = useState([]);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false);
    const [columnChips, setColumnChips] = useState([]);
    const [sortConfig, setSortConfig] = useState([]);
    const [groupByColumn, setGroupByColumn] = useState(null);
  
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [showActions, setShowActions] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const tableContainerRef = useRef(null);
    const searchInputRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isAdvertising, setIsAdvertising] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [openMenu, setOpenMenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [showHidePopup, setShowHidePopup] = useState(false);
    const [hidePopupColumn, setHidePopupColumn] = useState(null);
    const [tempHideColumns, setTempHideColumns] = useState([]);
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
   
    
  
    useEffect(() => {
    getMasterData("products", activeUserEmail).then(res => {
      const result = Array.isArray(res.data) ? res.data : [];
      //console.log("Raw Service Providers:", result);
      setServiceProviders(result);
      //console.log("Service Providers:", result);
    });
     getMasterData("vendors", activeUserEmail).then(res => {
        const result = Array.isArray(res?.data) ? res.data : [];
        setVendors(result);
        //console.log("Vendors:", result);
      });
        getMasterData("product_types", activeUserEmail).then(res => {
        const result = Array.isArray(res?.data) ? res.data : [];
        setServiceTypes(result);
      //  console.log("Service Types:", result);
      });
        getMasterData("credit_card", activeUserEmail).then(res => {
        const result = Array.isArray(res?.data) ? res.data : [];
        setCreditCards(result);
      //  console.log("Credit Cards:", result);
      });
    getMasterData("company", activeUserEmail).then(res => {
  const result = Array.isArray(res?.data) ? res.data : [];

  const tradeNames = result.map(item => item.trade_name);

  setCompany(tradeNames);

 // console.log("Company trade names:", tradeNames);
});
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

const handleDragEnd = (event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = columns.findIndex(
    (c) => c.column_name === active.id
  );

  const newIndex = columns.findIndex(
    (c) => c.column_name === over.id
  );

  const reordered = arrayMove(columns, oldIndex, newIndex);

  // ❌ DO NOT re-sort again
  setColumns(reordered);

  // keep selection stable
  setTempSelectedColumns((prev) =>
    reordered
      .map((c) => c.column_name)
      .filter((name) => prev.includes(name))
  );
};

const [dateFilters, setDateFilters] = useState(getCurrentMonth());

const isFilterActive = search || filters?.length > 0 






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

  
const loadReport = async (
  reportId,
  overrideDateFilters = dateFilters
) => {
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

    const dataRes = await getReportData(
      reportId,
      activeUserEmail,
      payload
    );

    setRows(dataRes.data || []);

    setColumns(
      REPORT_VIEWS[reportId] || []
    );
    console.log("columns from structure:", REPORT_VIEWS[reportId] || []);
    console.log("data from API:", dataRes.data || []);
    console.log("columns set in state:", columns);
  } catch (err) {
    console.error("Load Report Error:", err);
  } finally {
    setLoading(false);
  }
};



useEffect(() => {
  loadReport(id, dateFilters);
}, [ filters, search]);

    const loadCurrencies = async () => {
        try {
            const res = await currencises();
            setCurrencies(res.data || []);
        } catch (err) {
            console.error("Failed to load currencies:", err);
        }
    };

   useEffect(() => {
       // loadModule();
        loadCurrencies();

    }, [id]);
 




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

const groupedChips = columnChips.reduce((acc, chip) => {
  if (!acc[chip.type]) acc[chip.type] = [];
  acc[chip.type].push(chip);
  return acc;
}, {});

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

const handleSort = (key, direction) => {
  setSortConfig(prev => {
    const safe = Array.isArray(prev) ? prev : [];

    return [
      ...safe.filter(s => s.key !== key),
      { key, direction }
    ];
  });

  setColumnChips(prev => {
    const filtered = prev.filter(
      c => !(c.type === "sort" && c.column === key)
    );

    return [
      ...filtered,
      {
        type: "sort",
        column: key,
        value: direction
      }
    ];
  });

  setOpenMenu(null);
};



const handleSearch = (key) => {
  setSearchColumnKey(key);
  searchInputRef.current?.focus();
  searchInputRef.current?.select();
  setOpenMenu(null);

  setColumnChips(prev => {
    const filtered = prev.filter(
      c => !(c.type === "search" && c.column === key)
    );

    return [
      ...filtered,
      {
        type: "search",
        column: key,
        value: ""
      }
    ];
  });
};

const handleGroup = (key, direction) => {
  setGroupBy({ key, direction });

  setColumnChips(prev => {
    const filtered = prev.filter(
      c => !(c.type === "group" && c.column === key)
    );

    return [
      ...filtered,
      {
        type: "group",
        column: key,
        value: direction
      }
    ];
  });

  setOpenMenu(null);
};

const removeChip = (chip) => {
  setColumnChips(prev =>
    prev.filter(c =>
      !(c.type === chip.type && c.column === chip.column)
    )
  );

  if (chip.type === "search") {
    setSearchColumnKey("");
    setSearch("");
  }

  if (chip.type === "sort") {
    setSortConfig(prev =>
      prev.filter(s => s.key !== chip.column)
    );
  }

  if (chip.type === "group") {
    setGroupBy("");
  }
};

const toggleChipDirection = (chip) => {
  const newDirection = chip.value === "asc" ? "desc" : "asc";

  if (chip.type === "sort") {
    handleSort(chip.column, newDirection);
  }

  if (chip.type === "group") {
    handleGroup(chip.column, newDirection);
  }
};

const hideColumn = (key) => {
  setVisibleColumns(prev =>
    prev.filter(col => col.column_name !== key)
  );
  setOpenMenu(null);
};

const togglePinColumn = (columnName) => {
  setPinnedColumns((prev) =>
    prev.includes(columnName)
      ? prev.filter((c) => c !== columnName)
      : [...prev, columnName]
  );
};

//  const paginatedRows = filteredRows.slice(
//         (page - 1) * pageSize,
//         page * pageSize
//     );

const sortedAllRows = React.useMemo(() => {
  return [...filteredRows].sort((a, b) => {
    for (const sort of sortConfig) {
      let aValue = a?.[sort.key];
      let bValue = b?.[sort.key];

      aValue = typeof aValue === "object" ? aValue?.value ?? "" : aValue ?? "";
      bValue = typeof bValue === "object" ? bValue?.value ?? "" : bValue ?? "";

      const isNumeric = !isNaN(aValue) && !isNaN(bValue);

      let result = 0;

      if (isNumeric) {
        result = Number(aValue) - Number(bValue);
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }

      if (result !== 0) {
        return sort.direction === "asc" ? result : -result;
      }
    }
    return 0;
  });
}, [filteredRows, sortConfig]);

const processedRows = React.useMemo(() => {
  let data = [...filteredRows];

  // 1. SORT
  data = [...data].sort((a, b) => {
    for (const sort of sortConfig) {
      let aValue = a?.[sort.key];
      let bValue = b?.[sort.key];

      aValue = typeof aValue === "object" ? aValue?.value ?? "" : aValue ?? "";
      bValue = typeof bValue === "object" ? bValue?.value ?? "" : bValue ?? "";

      const isNumeric = !isNaN(aValue) && !isNaN(bValue);

      let result = 0;

      if (isNumeric) {
        result = Number(aValue) - Number(bValue);
      } else {
        result = String(aValue).localeCompare(String(bValue));
      }

      if (result !== 0) {
        return sort.direction === "asc" ? result : -result;
      }
    }
    return 0;
  });

  return data;
}, [filteredRows, sortConfig]);

const groupedAllRows = React.useMemo(() => {
  if (!groupBy?.key) {
    return [
      {
        group: "All Records",
        rows: sortedAllRows
      }
    ];
  }

  const groups = {};

  sortedAllRows.forEach((row) => {
    const key = row[groupBy.key] || "(Blank)";

    if (!groups[key]) groups[key] = [];

    groups[key].push(row);
  });

  let entries = Object.entries(groups);

  entries.sort((a, b) => {
    return groupBy.direction === "desc"
      ? String(b[0]).localeCompare(String(a[0]))
      : String(a[0]).localeCompare(String(b[0]));
  });

  return entries.map(([group, rows]) => ({
    group,
    rows
  }));
}, [sortedAllRows, groupBy]);

const flatGroupedRows = React.useMemo(() => {
  const flat = [];

  groupedAllRows.forEach((g) => {
    g.rows.forEach((row) => {
      flat.push({
        ...row,
        __group: g.group
      });
    });
  });

  return flat;
}, [groupedAllRows]);

const paginatedRows = React.useMemo(() => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return flatGroupedRows.slice(start, end);
}, [flatGroupedRows, page, pageSize]);

const groupedByRows = React.useMemo(() => {
  const groups = {};

  paginatedRows.forEach((row) => {
    const key = row.__group || "All Records";

    if (!groups[key]) groups[key] = [];

    groups[key].push(row);
  });

  let entries = Object.entries(groups);

  entries.sort((a, b) => {
    return groupBy?.direction === "desc"
      ? String(b[0]).localeCompare(String(a[0]))
      : String(a[0]).localeCompare(String(b[0]));
  });

  return entries.map(([group, rows]) => ({
    group,
    rows
  }));
}, [paginatedRows, groupBy]);


const rowIndexMap = React.useMemo(() => {
  const map = new Map();

  flatGroupedRows.forEach((row, index) => {
    map.set(row.id, index);
  });

  return map;
}, [flatGroupedRows]);




const printableGroupedRows = React.useMemo(() => {
  const rows = sortedAllRows; // 🔥 IMPORTANT: NOT flatGroupedRows

  if (!groupBy?.key) {
    return [
      {
        group: "All Records",
        rows
      }
    ];
  }

  const groups = {};

  rows.forEach((row) => {
    //console.log("groupby", groupBy);
    const key = getGroupKey(row, groupBy); // 🔥 IMPORTANT
    
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });

  let entries = Object.entries(groups);

  // optional group sort
  entries.sort((a, b) => {
    return groupBy?.direction === "desc"
      ? String(b[0]).localeCompare(String(a[0]))
      : String(a[0]).localeCompare(String(b[0]));
  });

  return entries.map(([group, rows]) => ({
    group,
    rows
  }));
}, [sortedAllRows, groupBy]);



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
<CustomizeDrawer
  open={showCustomizeDrawer}
  onClose={() => setShowCustomizeDrawer(false)}

  // Columns (ONLY what is actually used)
  columns={columns}
 // visibleColumns={visibleColumns}

  tempSelectedColumns={tempSelectedColumns}
  setTempSelectedColumns={setTempSelectedColumns}

  // Header (Printer Custom)
  selectedCompany={selectedCompany}
  setSelectedCompany={setSelectedCompany}
  companyList={company}

  // Sub Header
  printModuleName={printModuleName}
  setPrintModuleName={setPrintModuleName}

/>
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
 
 <TableFiltersDrawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
  //masterList={masterList}
  filters={filters}
  setFilters={setFilters}
  currencies={currencies}
  masterDataMap={masterDataMap}
  setMasterDataMap={setMasterDataMap}
  saveFilterName={saveFilterName}
  setSaveFilterName={setSaveFilterName}
 // handleSaveFilter={handleSaveFilter}
/>

</div>
<div className="flex md:hidden">
  <button
    onClick={() => setShowActions(!showActions)}
    className="px-4 py-2 text-sm rounded-md bg-gray-900 text-white w-full"
  >
    Actions ▾
  </button>

  {showActions && (
    <div className="absolute right-3 mt-12 w-52 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">

      <button onClick={handleCreate} className="w-full text-left px-4 py-2 text-sm hover:bg-green-50">
        + New
      </button>

      <button onClick={() => setShowPrintModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
        Print
      </button>

      <button onClick={() => setShowExcelModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-green-50">
        Excel
      </button>

      <button onClick={() => setShowPdfModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50">
        PDF
      </button>

      <button onClick={() => setShowTableColumnModal(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50">
        Customize
      </button>

      <button  className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50">
        Filters
      </button>

      <button
        disabled={selectedRowIds.length === 0}
        onClick={handleGenerateSelected}
        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 disabled:opacity-40"
      >
        Generate
      </button>
      

    </div>
  )}
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
          


            {/* ACTIVE FILTER CHIPS */}
            <div className="flex items-start justify-between flex-wrap gap-3">
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
               setFilters(prev =>
                  prev.map((item, index) => {
                    if (index !== i) return item;

                    return {
                      ...item,
                      values: (item.values || [])
                        .map(normalize)
                        .filter(v => v !== val),
                    };
                  })
                );
                }}
                className="text-blue-500 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
        </div>

       

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

<div className="flex flex-col gap-3 mb-3">

  {/* SEARCH */}
  {groupedChips.search?.length > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-gray-600 mr-2">
        SEARCHING:
      </span>

      {groupedChips.search.map((chip, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-xs"
        >
          <span>{chip.column}</span>

          <button
            onClick={() => removeChip(chip)}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )}

  {/* SORT */}
  {groupedChips.sort?.length > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-gray-600 mr-2">
        SORTING:
      </span>

      {groupedChips.sort.map((chip, i) => (
        <div
  key={i}
  onClick={() => toggleChipDirection(chip)}
  className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-blue-100"
>
  <span>
    {chip.column} {chip.value === "asc" ? "↑" : "↓"}
  </span>

  <button
    onClick={(e) => {
      e.stopPropagation();
      removeChip(chip);
    }}
    className="text-red-500 hover:text-red-700"
  >
    ✕
  </button>
</div>
      ))}
    </div>
  )}

  {/* GROUP */}
  {groupedChips.group?.length > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-gray-600 mr-2">
        GROUPING:
      </span>

      {groupedChips.group.map((chip, i) => (
       <div
  key={i}
  onClick={() => toggleChipDirection(chip)}
  className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-purple-100"
>
  <span>
    {chip.column} {chip.value === "asc" ? "↑" : "↓"}
  </span>

  <button
    onClick={(e) => {
      e.stopPropagation();
      removeChip(chip);
    }}
    className="text-red-500 hover:text-red-700"
  >
    ✕
  </button>
</div>
      ))}
    </div>
  )}

</div>

</div>
          
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