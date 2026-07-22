import React,{ useEffect, useState, useRef, useLayoutEffect, act, use, useMemo } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import {
  Pin,
  Copy,
  Share2,
  ChevronsUpDown,
  ChevronRight,
  Funnel, PinOff
} from "lucide-react";
import { fetchSections,fetchMasters, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, exportColumnNames, importTable, getMasterValues, currencises, exportPdf, getProviderPlans,upsertSavedFilter, getCustomizedColumns, upsertCustomizedColumns, getMasterData, addMasterData, cancelModuleRow, undoCancelModuleRow, getVatPercentage, getLastPRFNumber, createprf, getApprovalWorkflow, getPreviewPRF, unpostPRFTransaction, postPRFTransaction,getModuleViews,
createModuleView,
updateModuleView,
deleteModuleView,
setDefaultModuleView, updateRequiresPrf  } from "../../api/api";
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
import { Currency, Save } from "lucide-react";
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
import ShowHideColumnsPopup from "./ShowHideColumnsPopup";
import { createPortal } from "react-dom";
import EditRowPopup from "./EditRowPopup";
import CustomizeDrawer from "./CustomizeDrawer";
import { EyeIcon } from "@heroicons/react/24/outline";
import BoardViewsBar from "./BoardViewsBar";
import CreateViewModal from "./CreateViewModal";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CircleX, SavePlus, SquarePen, Trash2, BookX , 
  RotateCcw, ScanEye, Send, Undo2, FileSearch, Pencil, X } from "lucide-react";

import { CSS } from "@dnd-kit/utilities";


const Modal = ({ title, children, onClose }) => (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white p-5 rounded w-[500px] shadow">

            <h2 className="font-semibold mb-3">{title}</h2>

            {children}

            <div className="text-right mt-4">
                <button onClick={onClose} className="btn btn-gray">Close</button>
            </div>

        </div>
    </div>
);

function SortableColumnItem({ col, checked, toggleTempColumn}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.column_name });
  const style = { transform: CSS.Transform.toString(transform), transition };


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center justify-between px-4 py-3 rounded-2xl border transition
        ${checked
          ? "bg-blue-50 border-blue-300 shadow-sm"
          : "hover:bg-gray-50 border-gray-100"
        }
      `}
    >

      {/* LEFT */}
      <div
        className="flex items-center gap-3 flex-1 cursor-pointer"
        onClick={() => toggleTempColumn(col.column_name)}
      >

        {/* checkbox */}
        <div
          className={`
            w-5 h-5 flex items-center justify-center rounded-md border transition
            ${checked
              ? "bg-blue-600 border-blue-600 text-white"
              : "border-gray-300"
            }
          `}
        >
          {checked && "✓"}
        </div>

        <span className="text-sm text-gray-700">
          {col.display_name}
        </span>

      </div>

      {/* DRAG HANDLE */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing px-2"
      >
        ☰
      </button>

    </div>
  );
}


const getPdfUrl = (pdfPath) => {
  if (!pdfPath) return "";

  if (String(pdfPath).startsWith("http")) {
    return pdfPath;
  }

  const baseUrl = import.meta.env.VITE_API_URL || "";

  return `${baseUrl}${pdfPath}`;
};




export default function DynamicTablePage() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
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
    const [showReportHeaderModal, setShowReportHeaderModal] = useState(false);
const [reportActionType, setReportActionType] = useState(null);

const [customPrintHeader] = useState("ABDULWAHED BIN SHABIB GROUP");
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
    const [masters, setMasters] = useState([]);
    const [showTotals, setShowTotals] = useState(false);
    const [groupBy, setGroupBy] = useState([]);
    // const [groupBy, setGroupBy] = useState({
    //   key: null,
    //   direction: "asc"
    // });
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const [showSaveFilter, setShowSaveFilter] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState("");
    const currentModule =  module;
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
    const [previewPdfUrl, setPreviewPdfUrl] = useState("");
    const [previewFromGenerateModal, setPreviewFromGenerateModal] = useState(false);
    const [workflow, setWorkflow] = useState({});
    const [availableProducts, setAvailableProducts] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    //const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc", });
    const configOrder = mainTableConfig[module?.module_name] || [];
    const [pinnedColumns, setPinnedColumns] = useState([]);
    const [visibleColumnsState, setVisibleColumnsState] = useState([]);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false);
    const [columnChips, setColumnChips] = useState([]);
    const [sortConfig, setSortConfig] = useState([]);
    const [groupByColumn, setGroupByColumn] = useState(null);
   // const [columnOrder, setColumnOrder] = useState(visibleColumns.map(c => c.column_name));

   
    const orderColumnsByConfig = (cols = []) => {
      if (!Array.isArray(cols)) return [];
      if (!configOrder.length) return cols;

      const orderMap = new Map(
        configOrder.map((name, index) => [name, index])
      );

      return [...cols].sort((a, b) => {
        const aIndex = orderMap.has(a.column_name)
          ? orderMap.get(a.column_name)
          : Number.MAX_SAFE_INTEGER;
        const bIndex = orderMap.has(b.column_name)
          ? orderMap.get(b.column_name)
          : Number.MAX_SAFE_INTEGER;

        return aIndex - bIndex;
      });
    };
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
    const [appliedFilters, setAppliedFilters] = useState([]);

const [dateFilters, setDateFilters] = useState(() => getCurrentMonth());
// ================= BOARD VIEW STATES =================
const [views, setViews] = useState([]);
const [activeViewId, setActiveViewId] = useState("main");

const [showViewDropdown, setShowViewDropdown] = useState(false);
const [showCreateViewModal, setShowCreateViewModal] = useState(false);

const [newViewName, setNewViewName] = useState("");
const [newViewType, setNewViewType] = useState("table");
const [newViewVisibility, setNewViewVisibility] = useState("USER");

const [hasViewChanges, setHasViewChanges] = useState(false);
const [editingView, setEditingView] = useState(null);


useEffect(() => {
  loadViews();
}, [id, activeUserEmail]);

useEffect(() => {
  if (activeViewId !== "main" && activeViewId !== "table") {
    setHasViewChanges(true);
  }
}, [
  search,
  dateFilters,
  appliedFilters,
  filters,
  selectedColumns,
  pinnedColumns,
  sortConfig,
  groupByColumn,
]);

    const snoRef = useRef(null);
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
    const [form, setForm] = useState({
      paid_by: "",
      prepared_by: "",
      checked_by: "",
      verified_by: "",
      signed_by: "",
      approved_by: ""
    });
    const removeRow = (index) => {
      setModalItems((prev) => prev.filter((_, i) => i !== index));
    };
    
    const orderedColumns = orderColumnsByConfig(columns);
    useEffect(() => {
      if (!columns.length) return;

      setSelectedColumns(prev => {
        if (prev && prev.length > 0) return prev;

        return columns.map(c => c.column_name);
      });
    }, [columns]);

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

  const tradeNames = result.map(item => item.com_name);

  setCompany(tradeNames);

 // console.log("Company trade names:", tradeNames);
});
    }, []);

function getCurrentMonth() {
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
}

const handleDragEnd = async (event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = columns.findIndex(
    (c) => c.column_name === active.id
  );

  const newIndex = columns.findIndex(
    (c) => c.column_name === over.id
  );

  const reordered = arrayMove(columns, oldIndex, newIndex);

  // Update UI immediately
  setColumns(reordered);

  // Save reordered visible columns
  const reorderedVisible = reordered
    .filter((col) => selectedColumns.includes(col.column_name))
    .map((col) => col.column_name);

  setVisibleColumnsState(reorderedVisible);
  setSelectedColumns(reorderedVisible);
  setSavedTableColumns(reorderedVisible);

  // Keep selection stable
  setTempSelectedColumns((prev) =>
    reorderedVisible.filter((name) => prev.includes(name))
  );

  // Save to DB
  try {
    await upsertCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail,
      {
        visibleColumns: reorderedVisible,
        pinnedColumns,
      }
    );
  } catch (err) {
    console.error("Failed to save column order:", err);
  }
};



const isFilterActive = search || appliedFilters?.length > 0 

const openColumnSelector = () => {
  const defaultCols = columns.map(c => c.column_name);

  setTempSelectedColumns(
    selectedColumns?.length ? selectedColumns : defaultCols
  );

  setShowColumnSelector(true);
};

const toggleTempColumn = (colName) => {
  setTempSelectedColumns(prev =>
    prev.includes(colName)
      ? prev.filter(c => c !== colName)
      : [...prev, colName]
  );
};

const saveColumnSelection = async (selectedCols = []) => {
  try {
    const columnSettings = {
      visibleColumns: selectedCols,
      pinnedColumns: pinnedColumns || [],
    };

    await upsertCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail,
      columnSettings
    );

    // ✅ UPDATE UI IMMEDIATELY (NO REFRESH NEEDED)
    setVisibleColumnsState(selectedCols);

    setSelectedColumns(selectedCols);
    setSavedTableColumns(selectedCols);
    setTableColumnMode("custom");

  } catch (err) {
    console.error("Failed to save customized columns:", err);
  }
};

const handlePinColumn = async (columnName) => {
  try {
    const newPinnedColumns = pinnedColumns.includes(columnName)
      ? pinnedColumns.filter((col) => col !== columnName)
      : [...pinnedColumns, columnName];

    setPinnedColumns(newPinnedColumns);

    const columnSettingsPin = {
      pinnedColumns: newPinnedColumns,
    };

    await upsertCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail,
      columnSettingsPin
    );

    setOpenMenu(null);

  } catch (err) {
    console.error(err);
  }
};

const handleHeaderMenuToggle = (columnName, e) => {
  e.stopPropagation();

  if (openMenu === columnName) {
    setOpenMenu(null);
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  const menuWidth = 224; // Tailwind w-56
  const gutter = 8;
  const maxLeft = window.innerWidth - menuWidth - gutter;
  const nextLeft = Math.min(Math.max(rect.left, gutter), maxLeft);

  setMenuPosition({
    top: rect.bottom + 4,
    left: nextLeft,
  });
  setOpenMenu(columnName);
};

const onInputChange = (e) => {
  const { name, value } = e.target;

  setDateFilters((prev) => ({
    ...prev,
    [name]: value,
  }));
};

useEffect(() => {
  if (!columns.length) return;

  setSelectedColumns(prev => {
    // only set default ONCE (when empty)
    if (prev.length) return prev;

    return columns.map(col => col.column_name);
  });
}, [columns]);
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

// const handleSort = (columnName) => {
//   let direction = "asc";

//   if (
//     sortConfig.key === columnName &&
//     sortConfig.direction === "asc"
//   ) {
//     direction = "desc";
//   }

//   setSortConfig({
//     key: columnName,
//     direction,
//   });
// };

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

// useEffect(() => {
//   if (!dateColumns.length) return;

//   const defaultRange = getCurrentMonthRange();

//   const initialFilters = {};

//   dateColumns.forEach(col => {
//     initialFilters[col.column_name] = defaultRange;
//   });

//   setDateFilters(initialFilters);
// }, [columns]);

const buildDatePayload = (df) => {
  return {
    date: {
      startDate: df.startDate,
      endDate: df.endDate,
    },
  };
};

const fetchCustomizedColumns = async () => {
  try {
    const res = await getCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail
    );

    const savedColumns = res?.data?.data?.columns;
    //console.log("Fetched customized columns:", savedColumns);
    if (Array.isArray(savedColumns)) {
      return { visibleColumns: savedColumns, pinnedColumns: [] };
    }
    if (savedColumns && typeof savedColumns === "object") {
      return {
        visibleColumns: Array.isArray(savedColumns.visibleColumns) ? savedColumns.visibleColumns : [],
        pinnedColumns: Array.isArray(savedColumns.pinnedColumns) ? savedColumns.pinnedColumns : [],
      };
    }
    return { visibleColumns: [], pinnedColumns: [] };

  } catch (err) {
    console.error("Failed to load customized columns:", err);
    return { visibleColumns: [], pinnedColumns: [] };
  }
};

useEffect(() => {
let active = true;

const initSavedColumns = async () => {
  const settings = await fetchCustomizedColumns();
  if (!active) return;

  setPinnedColumns(settings.pinnedColumns || []);

  if ((settings.visibleColumns || []).length > 0) {
    setSavedTableColumns(settings.visibleColumns);
    setSelectedColumns(settings.visibleColumns);
    setTableColumnMode("saved");
  } else {
    setTableColumnMode("default");
  }
};

initSavedColumns();

return () => {
active = false;
};
}, [id, activeUserEmail]);

const addMasterValue = async (masterName, value) => { 
    try { 
        await addMasterData(masterName, { value }); 
    } catch (err) { 
        console.error("Master add failed:", err); } 
    };

  const generateNextPrfNumber = async () => {
  // Option 1: If you have an API endpoint to get the latest PRF number:
  const res = await getLastPRFNumber(); // implement this API if needed
  const latest = res.data?.lastPRFNumber || "IT/000336";
  //console.log("Latest PRF from API:", latest);
  // Extract the numeric part and increment
  const match = latest.match(/IT\/(\d{6})/);
  let nextNum = 1;
  if (match) {
    nextNum = parseInt(match[1], 10) + 1;
  }
  return `IT/${String(nextNum).padStart(6, "0")}`;
};

useEffect(() => {
  const fetchPrf = async () => {
    const num = await generateNextPrfNumber();
    setPrfNumber(num);
  };
  fetchPrf();
}, []);

const ApprovalWorkflow = async () => {
  try {
    const res = await getApprovalWorkflow();
    return res.data || {};
  } catch (err) {
    console.error("Failed to fetch approval workflow:", err);
    return {};
  }
};

useEffect(() => {
  const workflowAuth = async () => {
    try {
      const result = await ApprovalWorkflow();

      const raw = result?.approvalWorkflow;

      let parsed = {};

      if (raw) {
        try {
          parsed =
            typeof raw === "string"
              ? JSON.parse(raw)
              : raw;
        } catch (err) {
          console.error("Invalid JSON in approvalWorkflow:", err);
          parsed = {};
        }
      }

      setWorkflow(parsed);

    } catch (err) {
      console.error("Failed to load workflow:", err);
      setWorkflow({});
    }
  };

  workflowAuth();
}, []);



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
  const amount = Number(newRow.total_amount);
  //console.log("starting currency calculation with amount:", amount);
  const currency =
    typeof newRow.curr_code === "object"
      ? newRow.curr_code?.value
      : newRow.curr_code;
  
  if (isNaN(amount) || !currency) return;


  const calc = calculateCost(
    amount,
    currency,
    newRow.billcycle_code
  );

  if (calc == null || isNaN(calc)) return;

  setNewRow(prev => ({
    ...prev,
    total_amount_aed: calc.toFixed(2)
  }));

}, [newRow.amount, newRow.curr_code, newRow.billcycle_code]);

useEffect(() => {
  if (!editRowId) return;
  if (!editRow.total_amount || !editRow.curr_code) return;
  const calc = calculateCost(
    editRow.total_amount,
    editRow.curr_code,
    editRow.billcycle_code
  );

  if (calc === null) return;

  setEditRow(prev => ({
    ...prev,
    total_amount_aed: calc.toFixed(2)
  }));

}, [editRow.total_amount, editRow.curr_code, editRow.billcycle_code]);

 const formatForInput = (value) => {
  if (!value) return "";
  return value.split("T")[0]; // removes time safely
};
    // const masterList = [
    //     ...new Set(columns.map(c => c.master).filter(Boolean))
    // ];
   // console.log("Columns for master list:", columns);
    const masterMap = {};

columns.forEach((c) => {
  if (c.master) {
    masterMap[c.master] = {
      master: c.master,
      display_name: c.display_name || c.label || c.column_name
    };
  }
});

  const Masters = async () => {
    try {
      const res = await fetchMasters();
      setMasters(res.data || []);
    
    } catch (err) {
      console.error(err);
    }
  };

    useEffect(() => {
    Masters();
  }, []);


const masterList = (masters || []).map(item => ({
  master: item.master_name,
  display_name: item.display_name
}));

//console.log("Master List for Filters:", masterList);
    const [showTableColumnModal, setShowTableColumnModal] = useState(false);
    const [tableColumnMode, setTableColumnMode] = useState("saved");
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

    if (tableContainerRef.current) {
    tableContainerRef.current.scrollTo({
  left: 0,
  behavior: "smooth"
});
  }

  // ✅ RESET autofill tracking
 // setAutoFilledFields({});
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

useEffect(() => {

  const fetchVat = async () => {

    try {

      const res = await getVatPercentage();

      const vat =
        parseFloat(res.data?.vatPercentage) || 0;

      setVatPercent(vat);

    } catch (err) {

      console.error(
        "Failed to fetch VAT percentage:",
        err
      );

      setVatPercent(0);
    }
  };

  fetchVat();

}, []);

useEffect(() => {
  const init = async () => {
    const res = await fetchCustomizedColumns();

    setVisibleColumnsState(res?.visibleColumns || []);
    setPinnedColumns(res?.pinnedColumns || []);
  };

  init();
}, [id, activeUserEmail]);

const getVisibleColumns = () => {
  let cols = [...orderedColumns];
  const currencyFilter = filters.find(f => f.master === "currency");

 if (currencyFilter?.values?.length) {
  const selectedCurrencies = currencyFilter.values.map((v) => {
    if (v === null || v === undefined) return "";

    if (typeof v === "object") {
      return String(
        v.key ??
        v.id ??
        v.value ??
        ""
      ).toLowerCase();
    }

    return String(v).toLowerCase();
  });

  cols = cols.filter((col) => {
    const name = String(col.column_name || "").toLowerCase();

    if (!name.includes("amount")) return true;

    return selectedCurrencies.some((cur) =>
      cur && name.includes(cur)
    );
  });
}

  const visibleOrder = (visibleColumnsState || []).map(v =>
    typeof v === "string" ? v : v.column_name
  );

  if (visibleOrder.length > 0) {
    const orderMap = new Map(
      visibleOrder.map((name, i) => [name, i])
    );

    cols = [...cols]
      .filter(c => visibleOrder.includes(c.column_name))
      .sort((a, b) =>
        orderMap.get(a.column_name) - orderMap.get(b.column_name)
      );
  } else {
    cols = orderColumnsByConfig(cols);
  }
  if (pinnedColumns.length) {
    const pinnedSet = new Set(pinnedColumns);

    const pinnedFirst = cols.filter(c =>
      pinnedSet.has(c.column_name)
    );

    const others = cols.filter(c =>
      !pinnedSet.has(c.column_name)
    );

    cols = [...pinnedFirst, ...others];
  }

  return cols;
};
const visibleColumns = getVisibleColumns();
const [columnOrder, setColumnOrder] = useState(visibleColumns.map(c => c.column_name));

const SNO_STICKY_LEFT = 64; 
const DEFAULT_PINNED_COL_WIDTH = 180;
const pinnedHeaderRefs = useRef({});
const getPinnedLeft = (columnName) => {
  if (!pinnedColumns.includes(columnName)) return undefined;

  let left = SNO_STICKY_LEFT;

  for (const col of visibleColumns) {
    if (!pinnedColumns.includes(col.column_name)) continue;
    if (col.column_name === columnName) break;

    const width =
      pinnedHeaderRefs.current[col.column_name]?.offsetWidth ||
      DEFAULT_PINNED_COL_WIDTH;

    left += width;
  }

  return { left: `${left}px` };
};

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

const handleItemChange = (index, field, value) => {
  setModalItems(prev =>
    prev.map((item, i) =>
      i === index
        ? { ...item, [field]: value }
        : item
    )
  );
};

useEffect(() => {
  if (workflow) {
    setForm(prev => ({
      ...prev,
      checked_by: workflow.checked_by || prev.checked_by,
      verified_by: workflow.verified_by || prev.verified_by,
      verified_by_it: workflow.verified_by_it || prev.verified_by_it,
      signed_by: workflow.signed_by || prev.signed_by,
      approved_by: workflow.approved_by || prev.approved_by,
    }));
  }
}, [workflow]);

useEffect(() => {
  if (modalItems && modalItems.length > 0) {
    setForm(prev => ({
      ...prev,
      period_start: modalItems[0]?.period_start || prev.period_start,
      period_end: modalItems[0]?.period_end || prev.period_end,
    }));
  }
}, [modalItems]);
// console.log("selectedRow:", selectedRow);
// console.log("currencies:", currencies);

const rowCurrency = (
  Array.isArray(selectedRow)
    ? selectedRow[0]?.curr_code
    : selectedRow?.curr_code
)
  ?.toString()
  .trim()
  .toUpperCase();

//console.log("Row Currency:", rowCurrency);

const selectedCurrency = currencies.find((c) => {
  const currencyCode = (c.curr_code || "")
    .toString()
    .trim()
    .toUpperCase();
 
  const currencyName = (c.curr_name || "")
    .toString()
    .trim()
    .toUpperCase();
    
    return (
    currencyCode === rowCurrency ||
    currencyName === rowCurrency
  );
});

const exchange_rate = selectedCurrency?.curr_exchange_rate || 1;

const loadPreviewData = async (prfNum) => {
  const res = await getPreviewPRF(prfNum);
  const previewObj = Array.isArray(res.data)
    ? res.data[0]
    : res.data;

  setPreviewData({
    header: previewObj?.headers || [],
    details: previewObj?.details || {},
    paid_by: previewObj?.paid_by || ""
  });
};

const handleGenerate = async () => {
  const totalAmount = modalItems.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalVat = modalItems.reduce(
    (sum, item) => sum + Number(item.vat || 0),
    0
  );

  const grandTotal = modalItems.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const covertedExchangeRate = 1 / exchange_rate;

  const payload = {
    prf_num: prfNumber,

    receipt_number: form.receipt_number || null,

    amount: totalAmount,
    vat_amount: totalVat,
    total_amount: grandTotal,

    prepared_by: activeUserName,
    checked_by: form.checked_by,
    verified_by_it: form.verified_by_it,
    verified_by: form.verified_by,
    signed_by: form.signed_by,
    approved_by: form.approved_by,
    exchange_rate: covertedExchangeRate,
    userid: activeUserEmail,
    is_advertising: isAdvertising ? 1 : 0,
    remarks: form.remarks,
    period_start : form.period_start,
    period_end : form.period_end,
  };

  setPreviewFromGenerateModal(false);

  await createprf(
    payload,
    activeUserEmail,
    selectedRow
  );

  // Preview can still use original rows
  // setPreviewData({
  //   header: selectedRow,
  //   details: modalItems,
  //   paidBy: "SABAH"
  // });
  const newPrfNum = encodeURIComponent(prfNumber);
  await loadPreviewData(newPrfNum);

  setShowPreview(true);

  // Reset
  setShowGenerateModal(false);

  setModalItems([]);

  setSelectedRow({});

  setSelectedRowIds([]);

  setForm(prev => ({
  ...prev,
  receipt_number: "",
  remarks: "",
  period_start: "",
  period_end: "",
}));
  loadModule();
};

const handleDraftPreviewFromModal = () => {
  if (!modalItems?.length) {
    setPopupMessage("No details found to preview");
    setPopupType("error");
    return;
  }

  const sourceRows = Array.isArray(selectedRow)
    ? selectedRow
    : selectedRow
      ? [selectedRow]
      : [];

  const headers = modalItems.map((item, idx) => {
    const row = sourceRows[idx] || sourceRows[0] || {};

    return {
      ...row,
      date: item.doc_date || row.date || "",
      invoice_number: item.doc_no || row.invoice_number || "",
      products: item.product || row.products || "",
      amount: Number(item.amount || 0),
      vat_amount: Number(item.vat || 0),
      total_amount: Number(item.total_amount || 0),
    };
  });

  const totalAmount = modalItems.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalVat = modalItems.reduce(
    (sum, item) => sum + Number(item.vat || 0),
    0
  );

  const grandTotal = modalItems.reduce(
    (sum, item) => sum + Number(item.total_amount || 0),
    0
  );

  const covertedExchangeRate = 1 / exchange_rate;
  console.log("Exchange Rate:", exchange_rate, "Converted:", covertedExchangeRate);
  const previewDetails = {
    prf_num: prfNumber,
    receipt_number: form.receipt_number || "",
    amount: totalAmount,
    vat_amount: totalVat,
    total_amount: grandTotal,
    prepared_by: activeUserName || "",
    checked_by: form.checked_by || "",
    verified_by_it: form.verified_by_it || "",
    verified_by: form.verified_by || "",
    signed_by: form.signed_by || "",
    approved_by: form.approved_by || "",
    exchange_rate: covertedExchangeRate,
    prf_date: new Date().toISOString(),
    sysdate: new Date().toISOString(),
    is_advertising: isAdvertising ? 1 : 0,
    remarks: form.remarks || "",
    period_start: form.period_start || "",
    period_end: form.period_end || "",
  };
 
  const paidByName =
  creditCards.find(
    c =>
      String(c.crcd_last4num || "").trim() ===
      String(headers?.[0]?.crcd_code || "").trim()
  )?.crcd_holder_name || "";

setPreviewData({
  header: headers,
  details: previewDetails,
  paid_by:
    form.paid_by ||
    paidByName ||
    "",
});

  setPreviewFromGenerateModal(true);
  setShowGenerateModal(false);
  setShowPreview(true);
};

const handlePreview = async (prfNum) => {
  try {
    setPreviewFromGenerateModal(false);
    const res = await getPreviewPRF(prfNum);
    // The API returns: { data: [ { header, details } ] }
    const previewObj = Array.isArray(res.data) ? res.data[0] : res.data;
    //console.log("API Response for preview:", res.data);
    // console.log("header:", previewObj?.header);
    // console.log("details:", previewObj?.details);
    setPreviewData({
      header: previewObj?.headers,
      details: previewObj?.details,
      paid_by: previewObj?.paid_by || "",
    });
    setShowPreview(true);
  } catch (err) {
    setPopupMessage("Failed to load preview data");
    setPopupType("error");
  }
};

const handleUnpost = (prfNum) => {
  const prfnum = decodeURIComponent(prfNum);
  setConfirmData({
    title: "Unpost PRF",
    message: `Are you sure you want to unpost this PRF ${prfnum}?`,
    confirmText: "Unpost",
    type: "warning",
    onConfirm: async () => {
      try {
        setLoading(true);

        await unpostPRFTransaction(prfNum, activeUserEmail);

        setPopupMessage("PRF unposted successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        console.error("Failed to unpost PRF:", err);
        setPopupMessage("Failed to unpost PRF");
        setPopupType("error");
      } finally {
        setLoading(false);
        setConfirmOpen(false);
      }
    }
  });

  setConfirmOpen(true);
};

const handlePost = (prfNum) => {
  const prfnum = decodeURIComponent(prfNum);
  setConfirmData({
    title: "Post PRF",
    message: `Are you sure you want to post this PRF ${prfnum}?`,
    confirmText: "Post",
    cancelText: "Cancel",
    type: "info", // or "success" if you want to style it differently
    onConfirm: async () => {
      try {
        setLoading(true);

        await postPRFTransaction(prfNum, activeUserEmail);

        setPopupMessage("PRF posted successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        console.error("Failed to post PRF:", err);
        setPopupMessage("Failed to post PRF");
        setPopupType("error");
      } finally {
        setLoading(false);
        setConfirmOpen(false);
      }
    }
  });

  setConfirmOpen(true);
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
 const reportRowCount = getReportRowCount(printableGroupedRows);

if (reportRowCount === 0) {
  showNoRecordsPopup();
  setShowReportHeaderModal(false);
  setReportActionType(null);
  return;
}

const cols = orderedVisibleColumns.map((col) => ({
  ...col,
  display_name: getColumnDisplayName(col),
}));

 const moduleName =
  printModuleName ||
  localStorage.getItem("print_module_name") ||
  module?.display_name;

const reportHeader = "ABDULWAHED BIN SHABIB GROUP";

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
    columns,
    reportHeader
  );

  //console.log("Excel exported rows:", printableGroupedRows);
};
    
const dateColumns = visibleColumns.filter(col =>
  col.data_type?.toLowerCase().includes("date")
);
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

    // ================= LOAD MODULE =================
const loadModule = async (
  overrideDateFilters = dateFilters,
  appliedFilters = filters
) => {
  setLoading(true);

  const res = await fetchSections();
  const mod = res.data.find(m => m.module_id == id);

  if (mod) {
    setModule(mod);

    const payload = {
      filters: JSON.stringify(appliedFilters || []),
      dateFilters: JSON.stringify({
        date: {
          startDate: overrideDateFilters.startDate,
          endDate: overrideDateFilters.endDate,
        },
      }),
    };

    const dataRes = await getModuleData(
      id,
      activeUserEmail,
      payload,
      userRole
    );

    setRows(dataRes.data || []);
    const cols = (mod?.columns || []).filter(c => c.is_active !== false);

const settings = await fetchCustomizedColumns();
const savedOrder = settings?.visibleColumns || [];

if (savedOrder.length > 0) {
  const map = new Map(cols.map(c => [c.column_name, c]));

  const ordered = savedOrder
    .map(name => map.get(name))
    .filter(Boolean);

  const remaining = cols.filter(
    c => !savedOrder.includes(c.column_name)
  );

  setColumns([...ordered, ...remaining]);

  setVisibleColumnsState(savedOrder);
  setSelectedColumns(savedOrder);
  setSavedTableColumns(savedOrder);
} else {
  setColumns(orderColumnsByConfig(cols));
}
  }

  setLoading(false);
};

const isGenerated = rows.some(r => !!r.prf_num);
//console.log("Is Generated row:", isGenerated);

useEffect(() => {
  loadModule();
}, [id]);

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

const getMasterOptions = (col, searchText = "") => {
  const selectedVendor = newRow?.vend_code || editRow?.vend_code || null;
  if (col.column_name === "prd_code") {
  const selectedVendorValue = String(selectedVendor || "").trim().toLowerCase();
  const currentProductValue = String( newRow?.prd_code || editRow?.prd_code || "").trim().toLowerCase();
  let products = [];
  if (selectedVendorValue && serviceProviders?.length) {
      products = serviceProviders.filter((sp) => {
      const vendorCode = String(sp.vend_code || "").trim().toLowerCase();
      const vendorNameFromMaster =vendors.find( (v) =>
            String(v.vend_code || "").trim().toLowerCase() === vendorCode)?.vend_name || "";
      const vendorName = String( sp.vend_name || vendorNameFromMaster || "" ).trim().toLowerCase();
      return ( selectedVendorValue === vendorCode || selectedVendorValue === vendorName );
    });
    // Fallback: if selected vendor has no mapped products, show all products
    if (products.length === 0) { products = [...serviceProviders];}
  } else if (serviceProviders?.length) { products = [...serviceProviders]; }
  const unique = products.filter((item, index, self) => index === self.findIndex((p) => p.prd_code === item.prd_code) );
  let mapped = unique.map((sp) => ({
    key: sp.prd_code,
    value: sp.prd_name,
  }));
  // Keep current value visible in edit/create even if not in mapped list
  if (
    currentProductValue &&
    !mapped.some( (o) =>
        String(o.value || "").toLowerCase() === currentProductValue.toLowerCase() ||
        String(o.key || "").toLowerCase() === currentProductValue.toLowerCase() )
  ) {
    mapped = [ { key: currentProductValue, value: currentProductValue },
      ...mapped, ];
  }
  return mapped;
}

if (col.column_name === "prdtype_code") {
  const selectedProduct = newRow?.prd_code ||  editRow?.prd_code ||  null;
    //console.log("Selected product for service filtering:", selectedProduct);
  if (selectedProduct && serviceProviders?.length) {
const matchedProviders = serviceProviders.filter((sp) => {
  const selected = String(selectedProduct || "").trim().toLowerCase();
  const code = String(sp.prd_code || "").trim().toLowerCase();
  const name = String(sp.prd_name || "").trim().toLowerCase();
  return selected === code || selected === name;
});
  const serviceIds = matchedProviders.map( sp => String(sp.prdtype_code));
   //console.log("Service type codes from matched providers:", serviceIds);
    const matchedServices = serviceTypes.filter( st => serviceIds.includes(
          String(st.prdtype_code)
        )
    );
 //console.log("Matched service types for product:", matchedServices);
  

    // Remove duplicates by prdtype_code
    const uniqueServices = matchedServices.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          s =>
            s.prdtype_code ===
            item.prdtype_code
        )
    );

    return uniqueServices.map(st => ({
      key: st.prdtype_code,   // S01
      value: st.prdtype_name // Subscriptions
    }));
  }

  // =========================
  // FALLBACK ALL SERVICES
  // =========================
  return serviceTypes.map(st => ({
    key: st.prdtype_code,    // S01
    value: st.prdtype_name   // Subscriptions
  }));
}

  // ================= BASE OPTIONS =================
  let options = [];

  if (col.master && masterDataMap?.[col.master]) {
    options = [...masterDataMap[col.master]];
  }
  //console.log("masterdatamap ", masterDataMap);
  if (col.master1 && masterDataMap?.[col.master1]) {
    options = [...options, ...masterDataMap[col.master1]];
  }

  // ================= REMOVE DUPLICATES =================
  options = options.filter(
    (item, index, self) =>
      index === self.findIndex(
        t => t.key === item.key
      )
  );

  // ================= PLANS FILTER =================
  if (
    (
      col.master === "plans" ||
      col.master1 === "plans" ||
      col.column_name?.toLowerCase().includes("plan")
    ) &&
    providerPlans?.length
  ) {

    const allowedIds = providerPlans.map(p =>
      Number(p.plan_id)
    );

    options = options.filter(p =>
      allowedIds.includes(Number(p.id))
    );
  }

// ================= SEARCH =================
if (searchText) {

  const search =
    typeof searchText === "object"
      ? String(searchText?.value || "").toLowerCase()
      : String(searchText || "").toLowerCase();

  options = options.filter(v => {

    const val =
      typeof v === "object"
        ? v.value
        : v;

    return String(val || "")
      .toLowerCase()
      .includes(search);

  });
}
  //console.log(`Options for column ${col.column_name} :`, options);
  return options;
};


const getExchangeRate = (currencyCode) => {
  const list = currencies || [];

  const searchValue = (currencyCode || "")
    .toString()
    .trim()
    .toUpperCase();

  const currency = list.find(c => {
    const code = (c.curr_code || "")
      .toString()
      .trim()
      .toUpperCase();

    const name = (c.curr_name || "")
      .toString()
      .trim()
      .toUpperCase();

    return code === searchValue || name === searchValue;
  });

  if (searchValue === "AED") return 1;

  if (currency?.curr_exchange_rate) {
    return 1 / Number(currency.curr_exchange_rate);
  }

  return 1;
};
const calculateCost = (amount, currencyCode, term) => {
  if (!amount || !currencyCode) return null;
  const rate = getExchangeRate(currencyCode);
 // console.log(`Calculating cost: amount=${amount}, currency=${currencyCode}, term=${term}, rate=${rate}`);
  if (!rate || isNaN(rate)) return null;
  return Number(amount) * Number(rate);
};

const groupedChips = (Array.isArray(columnChips) ? columnChips : []).reduce(
  (acc, chip) => {
    if (!acc[chip.type]) acc[chip.type] = [];
    acc[chip.type].push(chip);
    return acc;
  },
  {}
);



const handleNewRowChange = async (key, value, masterName) => {

  // normalize object values
  let normalized =
    typeof value === "object"
      ? value?.value ?? ""
      : value;

  // ONLY parse numeric columns
  if (isNumericColumn(key)) {

    const parsed = parseFloat(normalized);

    normalized = isNaN(parsed)
      ? ""
      : parsed;
  }

  if (key === "product_types") {
 // console.log("SETTING PRODUCT TYPE:", normalized);
}
  // console.log("NEW ROW UPDATE", {
  //   key,
  //   original: value,
  //   normalized
  // });

  setNewRow(prev => {
    const updated = {
      ...prev,
      [key]: normalized
    };

    if (masterName === "billing_cycle") {
      sessionStorage.setItem("billing_cycle", normalized);
      updated.billcycle_code = normalized;
    }

 

    return updated;
  });

  // use normalized below too
  if (key === "products") {

    const providerValue = normalized;

    // rest of your code...
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
    //console.log("Auto-selecting plan:", firstPlan);
    setNewRow(prev => ({
      ...prev,
     // plan_provider: firstPlan.value
    }));
  }

}, [providerPlans, masterDataMap.plans]);
  
   const handleSave = async () => {
    try {
       setLoading(true);
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
        //console.log("Creating row with payload:", payload);
        await createModuleRow(id, payload, activeUserEmail);
           setLoading(false);
           setPopupMessage("Record created successfully");
      setPopupType("success");
        setIsCreating(false);

      setNewRow({});
      setInputValues({});
      setActiveDropdown(null);
      setAutoFilledFields({});
   
      loadModule();
    } catch (err) {
        setLoading(false);
        setPopupMessage("Error creating record");
        setPopupType("error");
        console.error(err);
    }
};

 const handleCancel = () => {
    setIsCreating(false);

    setNewRow({});
    setInputValues({});
    setActiveDropdown(null);
    setAutoFilledFields({});

    setEditRow({});
    setEditRowId(null);
};

    const handleEdit = (row) => {
        setEditRowId(row.id);
        setEditRow({ ...row });
        setOriginalRow({ ...row });
      setShowEditPopup(true);
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



    const handleSaveEdit = async () => {
        setLoading(true);
        try {
            const changedData = {};

            Object.keys(editRow).forEach((key) => {
                if (editRow[key] !== originalRow[key]) {
                    changedData[key] = toMasterKey(key, editRow[key]);
                }
            });

            if (Object.keys(changedData).length === 0) {
                setEditRowId(null);
                return;
            }

            await updateModuleRow(id, editRowId, changedData, activeUserEmail);
              setLoading(false);
            setEditRowId(null);
            setEditRow({});
            setOriginalRow({});
            setPopupMessage("Record updated successfully");
            setPopupType("success");

            loadModule();
        } catch (err) {
              setLoading(false);
            setPopupMessage("Error updating record");
            setPopupType("error");
            console.error(err);
        }
    };

    const handleCancelEdit = () => {
        setEditRowId(null);
        setEditRow({});
    };

const handleDelete = (row) => {
  setLoading(false);
  setConfirmData({
    title: "Delete Record",
    message: `Are you sure you want to delete this record?`,
    confirmText: "Delete",
    type: "danger",
    onConfirm: async () => {
      try {
        await deleteModuleRow(id, row.id, activeUserEmail);
        setLoading(false);
        setPopupMessage("Record deleted successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        setLoading(false);
        console.error(err);
        setPopupMessage("Error deleting record");
        setPopupType("error");
      }
      setConfirmOpen(false); // <-- add this line
    }
  });
  setConfirmOpen(true);
};

const handleCancelRow = (row) => {
  setConfirmData({
    title: "Cancel Record",
    message: "Are you sure you want to cancel this record?",
    confirmText: "Yes, Cancel",
    type: "warning",
    onConfirm: async () => {
      setLoading(true);

      try {
        await cancelModuleRow(id, row.id, activeUserEmail);

        setPopupMessage("Record cancelled successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        console.error(err);
        setPopupMessage("Error cancelling record");
        setPopupType("error");
      } finally {
        setLoading(false);
        setConfirmOpen(false);
      }
    }
  });

  setConfirmOpen(true);
};

const handleUndoCancelRow = (row) => {
  setConfirmData({
    title: "Undo Cancellation",
    message: "Do you want to restore this cancelled record?",
    confirmText: "Restore",
    type: "info",
    onConfirm: async () => {
      try {
        await undoCancelModuleRow(id, row.id, activeUserEmail);
    
        setPopupMessage("Record restored successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        console.error(err);
        setPopupMessage("Error restoring record");
        setPopupType("error");
      }
      finally {
        setLoading(false);
        setConfirmOpen(false);
      }
    }
  });
  setConfirmOpen(true);
};

const isRowUnposted = (row) => {
  const postedValue = row?.is_posted;
  return (
    postedValue === false ||
    postedValue === 0 ||
    postedValue === "0" ||
    postedValue === "false"
  );
};

const handlePostRow = (row) => {
  setConfirmData({
    title: "Post Record",
    message: "Do you want to post this record?",
    confirmText: "Post",
    type: "info",
    onConfirm: async () => {
      try {
        setLoading(true);
        await updateModuleRow(id, row.id, { is_posted: true }, activeUserEmail);
        setPopupMessage("Record posted successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        console.error(err);
        setPopupMessage("Error posting record");
        setPopupType("error");
      } finally {
        setLoading(false);
        setConfirmOpen(false);
      }
    }
  });
  setConfirmOpen(true);
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
            loadModule(); // refresh table after import
        } catch (err) {
            console.error(err);
            alert("Import failed ❌");
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
  // setSortKey(null);
  // setSortOrder(null);
  setGroupBy([]);

  // ================= RESET CHIPS =================
  setColumnChips([]);

  // 🔥 IMPORTANT: RESET DERIVED CHIPS
  // setGroupedChips({
  //   search: [],
  //   sort: [],
  //   group: []
  // });

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

    const isUpcomingRenewalsSelected = activeDateFilter === "upcomingRenewals";

const getColumnDisplayName = (col) => {
  if (
    isUpcomingRenewalsSelected &&
    String(col.column_name || "").toLowerCase() === "expiry_date"
  ) {
    return "Renewal Date";
  }

  return col.display_name;
};

const getReportRowCount = (groups = []) => {
  return (groups || []).reduce(
    (count, group) => count + (group.rows?.length || 0),
    0
  );
};

const showNoRecordsPopup = () => {
  setPopupMessage("No records found");
  setPopupType("error");
};







const handlePrint = () => {
  const reportRowCount = getReportRowCount(printableGroupedRows);

  if (reportRowCount === 0) {
    showNoRecordsPopup();
    setShowReportHeaderModal(false);
    setReportActionType(null);
    return;
  }

  const cols = orderedVisibleColumns.map((col) => ({
    ...col,
    display_name: getColumnDisplayName(col),
  }));
  //console.log("Printing with columns:", cols);
  openPrintWindow({
    content: generateTableHTML(
      cols,
      printableGroupedRows
    ),
    userName: activeUser?.name || "User",
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
    // const finalRows = filteredRows;

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

// const finalRows = filteredRows;

 



    // ================= PAGINATION =================

  

  const handlePdf = async (
  mode,
  customCols = null,
  groupBy = "service",
  pdfColumns = orderedVisibleColumns,
  pdfRows = printableGroupedRows
) => {

  let cols;

  const reportRowCount = getReportRowCount(pdfRows);

if (reportRowCount === 0) {
  showNoRecordsPopup();
  setShowReportHeaderModal(false);
  setReportActionType(null);
  return;
}

  if (customCols && Array.isArray(customCols)) {
  cols = pdfColumns
  .filter(col => customCols.includes(col.column_name))
  .map((col) => ({
    ...col,
    display_name: getColumnDisplayName(col),
  }));
  } else {
   cols = pdfColumns.map((col) => ({
  ...col,
  display_name: getColumnDisplayName(col),
}));
  }

  const company =
  customPrintHeader ||
  localStorage.getItem("print_custom_header") ||
  selectedCompany ||
  localStorage.getItem("print_company") ||
  "";

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


    useEffect(() => {
    if (!isCreating) return;

    visibleColumns.forEach((col) => {
        if (!col.master) return;

        const key = col.column_name;

        if (autoFilledFields[key]) return;

        const options = getMasterOptions(col, newRow[key] || "");

        // if (options.length === 1) {
        // const val =
        //     typeof options[0] === "object"
        //     ? options[0].value
        //     : options[0];

        // setNewRow((prev) => ({
        //     ...prev,
        //     [key]: val
        // }));

        // setAutoFilledFields((prev) => ({
        //     ...prev,
        //     [key]: true
        // }));
        // }
    });
    }, [isCreating, visibleColumns, masterDataMap]);
useEffect(() => {
  if (!editRowId) return;

  visibleColumns.forEach((col) => {
    if (!col.master) return;

    if (col.column_name === "product_types") return;

    const key = col.column_name;
    const options = getMasterOptions(col, editRow?.[key] || "");

    if (options.length === 1 && !editRow?.[key]) {
      const val = typeof options[0] === "object" ? options[0].value : options[0];

      setEditRow((prev) => (
        prev[key] ? prev : { ...prev, [key]: val }
      ));
    }
  });
}, [editRowId, visibleColumns, masterDataMap]);

const isPrfBlockedProductType = (productTypeValue) => {
  const raw =
    typeof productTypeValue === "object"
      ? productTypeValue?.key ?? productTypeValue?.value ?? ""
      : productTypeValue ?? "";

  const normalized = String(raw).toLowerCase();

  // Block when product type contains any of these words/codes
  const blockedTerms = ["purchase",  "repairs", "s45", "s46"];

  return blockedTerms.some((term) => normalized.includes(term));
};



const filteredRows = rows.filter((row) => {
  return rowMatchesSearch(row);
});

const finalRows = filteredRows;


   const normalizedRows = finalRows.map(row => {
  const currency = (row.currency || "").toLowerCase();

  return {
    ...row,
    [`amount_${currency}`]: row.amount
  };
});
    const totalPages = Math.ceil(normalizedRows.length / pageSize);


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
    name.includes("total_amount_aed")
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
const generateBarcodeSvg = (value) => {
  if (!value) return "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  JsBarcode(svg, value, {
    format: "CODE128",
    width: 1.6,
    height: 45,
    displayValue: false,
    margin: 0,
  });

  return new XMLSerializer().serializeToString(svg);
};

const getLatestReportPrfInfo = (groupedData = []) => {
  const reportRows = (groupedData || []).flatMap((group) => group.rows || []);

  const rowsWithPrf = reportRows.filter(
    (row) => row?.prf_num && String(row.prf_num).trim() !== ""
  );

  if (rowsWithPrf.length === 0) {
    return {
      prfNo: "",
      invoiceDate: "",
      barcodeValue: "",
    };
  }

  const getPrfNumberValue = (prf) => {
    const match = String(prf || "").match(/IT\/(\d+)/i);
    return match ? Number(match[1]) : 0;
  };

  const latestRow = rowsWithPrf.reduce((latest, current) => {
    const latestNo = getPrfNumberValue(latest.prf_num);
    const currentNo = getPrfNumberValue(current.prf_num);

    return currentNo > latestNo ? current : latest;
  }, rowsWithPrf[0]);

  const prfNo = latestRow.prf_num || "";
  const invoiceDate = latestRow.date ? formatDate(latestRow.date) : "";

  return {
    prfNo,
    invoiceDate,
    barcodeValue: prfNo,
  };
};
const generateTableHTML = (cols, groupedData) => {
  const rows = groupedData.flatMap((g) => g.rows);
const barcodeInfo = getLatestReportPrfInfo(groupedData);
const barcodeSvg = generateBarcodeSvg(barcodeInfo.barcodeValue);
  const groupedRows = Array.isArray(groupedData)
    ? groupedData
    : Object.entries(groupedData || {}).map(([group, rows]) => ({
        group,
        rows,
      }));

  const company =
 "ABDULWAHED BIN SHABIB GROUP";

const reportTitle =
  printModuleName?.trim() ||
  localStorage.getItem("print_module_name") ||
  module?.display_name ||
  "Report";

  const printedBy = activeUser?.name || activeUserEmail || "User";

  const printedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const approvalData = {
  prepared_by: activeUserName || "",
  checked_by: form?.checked_by || workflow?.checked_by || "",
  verified_by_it: form?.verified_by_it || workflow?.verified_by_it || "",
  verified_by: form?.verified_by || workflow?.verified_by || "",
  signed_by: form?.signed_by || workflow?.signed_by || "",
  approved_by: form?.approved_by || workflow?.approved_by || "",
};

  const toDisplayValue = (row, col) => {
    let value = "";

    if (col.isDynamicCurrency) {
      value = row.currency === col.currency ? row.amount : "";
    } else {
      const raw = row[col.column_name];
      value =
        typeof raw === "object"
          ? raw?.value ?? ""
          : raw ?? "";
    }

    if (col.master === "credit_card") {
      const last4 = String(value || "").slice(-4);
      return last4 || "-";
    }

    if ((col.data_type || "").toLowerCase().includes("date")) {
      return value ? formatDate(value) : "-";
    }

    if (isNumericColumn(col) || col.isDynamicCurrency) {
      if (value === "" || value === null || value === undefined) return "-";

      const numberValue = toNumber(value);

      return numberValue === 0
        ? "-"
        : formatNumber(numberValue);
    }

    return value || "-";
  };

  const currencies = [
    ...new Set(
      rows
        .map((r) => r.currency)
        .filter(Boolean)
    ),
  ];

  const normalCols = cols.filter((c) => {
    const name = String(c.column_name || "").toLowerCase();
    return name !== "currency";
  });

  const currencyCols = currencies.map((cur) => ({
    column_name: `amount_${cur.toLowerCase()}`,
    display_name: `AMOUNT (${cur.toUpperCase()})`,
    currency: cur,
    isDynamicCurrency: true,
  }));

  const sortedCols = sortColumns([
    ...normalCols,
    ...currencyCols,
  ]);

  const productCols = [
  "prd_code",
  "prdtype_code",
  "plan_code",
];

const printableCols = sortedCols
  .filter(
    (col) => !productCols.includes(col.column_name)
  )
  .map((col) => ({
    ...col,
    display_name:
      col.master === "credit_card"
        ? "Payment Method"
        : col.display_name,
  }));

// Insert Product Description where Product was
const productIndex = sortedCols.findIndex(
  (c) => c.column_name === "prd_code"
);

printableCols.splice(
  productIndex >= 0 ? productIndex : 0,
  0,
  {
    column_name: "product_description",
    display_name: "Product Description",
    isProductDescription: true,
  }
);

  const firstTotalIndex = printableCols.findIndex(isTotalColumn);
  const totalColSpan = firstTotalIndex >= 0 ? firstTotalIndex + 1 : 1;

  const grandTotals = {};

  printableCols.forEach((col) => {
    if (isTotalColumn(col) || col.isDynamicCurrency) {
      grandTotals[col.column_name] = rows.reduce((sum, row) => {
        let value = "";

        if (col.isDynamicCurrency) {
          value = row.currency === col.currency ? row.amount : "";
        } else {
          value = row[col.column_name];
        }

        return sum + toNumber(value);
      }, 0);
    }
  });

  const getColumnWidth = (col) => {
  const name = (col.column_name || "").toLowerCase();

  if ( name.includes("com_code") ) return "160px";
  

  if (col.isProductDescription) return "80px";

  if (
    name.includes("date") ||
    name.includes("podate") ||
    name.includes("expiry") ||
    name.includes("start") ||
    name.includes("end") ||
    name.includes("trntype") ||
    name.includes("number") ||
    name.includes("dep_code")
  ) {
    return "45px";
  }
  if ( name.includes("billcycle_code") || name.includes("curr_code") ) {
    return "31px";
  }
  if (name.includes("prf")) {
    return "35px";
  }

  if (
    name.includes("amount") ||
    name.includes("price") ||
    name.includes("total")
  ) {
    return "30px";
  }

  if (
    name.includes("vend_code") ||
    // name.includes("description") ||
    name.includes("narr")
  ) {
    return "100px";
  }

  

  return "70px";
};

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>

  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 7mm 10mm 7mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: "Times New Roman", serif;
      color: #1f2933;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 9px;
    }


.report-header {
  border: 1px solid #1f2937;
  border-radius: 5px;
  padding: 6px 10px;
  margin-bottom: 7px;
  background: #ffffff;
  position: relative;
  min-height: 64px;
}

.report-header-text {
  text-align: left;
  padding-left: 160px;
  padding-right: 210px;
}

.report-barcode {
  position: absolute;
  right: 14px;
  top: 7px;
  width: 190px;
  height: 50px;
  text-align: center;
}

.report-barcode svg {
  width: 185px !important;
  height: 50px !important;
}


   

    .summary-box {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .summary-card {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      padding: 5px 8px;
      background: #f9fafb;
    }

    .summary-label {
      font-size: 7px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .summary-value {
      font-size: 10px;
      font-weight: bold;
      color: #111827;
      margin-top: 2px;
    }

    .group-title {
      margin: 8px 0 4px 0;
      padding: 5px 8px;
      border-left: 4px solid #102347;
      background: #eef2ff;
      font-size: 10px;
      font-weight: bold;
      color: #102347;
      text-transform: uppercase;
    }

   table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-bottom: 4px;
  page-break-inside: auto;
}

    thead {
      display: table-header-group;
       background: #e5e7eb;
      color: #111827;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    th {
      background: #e5e7eb !important;
      color: #111827 !important;
      border: 1px solid #111827;
      padding: 4px 3px;
      font-size: 8px;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      line-height: 1.15;
      word-break: break-word;
    }

    td {
      border: 1px solid #9ca3af;
      padding: 12px 2px !important;
      font-size: 8px;
      text-align: center;
      vertical-align: middle;
      line-height: 1;
      word-break: break-word;
    }

    tbody  {
      background: #f8fafc;
    } 

    .sno-col {
      width: 20px !important;
      font-weight: bold;
    }

    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .text-left {
      text-align: left;
    }

    .total-row td {
      background: #e5e7eb;
      font-weight: bold;
      color: #111827;
      
    }





.company-name {
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 0.3px;
  color: #111827;
  margin: 0;
  text-transform: uppercase;
}

.report-title {
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  color: #374151;
  margin: 3px 0 0 0;
  text-transform: uppercase;
}

.report-meta {
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid #d1d5db;
  font-size: 7px;
  color: #374151;
  text-align: right;
}

.footer {
  margin-top: 6px;
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 8px;
  align-items: center;
  font-size: 7px;
  color: #374151;
  border-top: 1px solid #9ca3af;
  padding-top: 4px;
  background: #ffffff;
  page-break-inside: avoid;
}

.footer-item {
  white-space: nowrap;
}

.footer-item strong {
  color: #111827;
}.print-footer-area {
 
  left: 8px;
  right: 8px;
  
}

.designed-by {
  margin-top: 3px;
  font-size: 7px;
  color: #374151;
  font-weight: bold;
}

.report-page {
  width: 100%;
  min-height: auto;
  position: relative;
  padding: 4px 8px 10px 8px !important;
  page-break-after: avoid;
  break-after: avoid;
}

.blank-space {
  margin-bottom: 6px;
  padding: 6px;
  text-align: center;
  font-size: 6px;
  font-weight: bold;
  color: #6b7280;
  letter-spacing: 0.4px;
 
 
}

.approval-section {
  page-break-inside: avoid;
  break-inside: avoid;
}

.approval-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.approval-title {
  background: #e5e7eb;
  color: #111827;
  text-align: left !important;
  font-size: 8px;
  font-weight: bold;
  padding: 3px !important;
  padding-left: 4px !important;
  border: 1px solid #111827;
}

.approval-table th {
  background: #e5e7eb;
  color: #111827;
  border: 1px solid #111827;
  padding: 3px 2px;
  font-size: 8px;
  font-weight: bold;
  text-align: center;
}

.approval-table td {
  height: 100px !important;
  border: 1px solid #111827;
  padding: 3px 2px;
  font-size: 8px !important;
  font-weight: bold;
  text-align: center;
  vertical-align: bottom;
  background: #f8fafc;
}

.approval-dept {
  margin-top: 3px;
  font-size: 8px;
  color: #4b5563;
  font-weight: bold;
}

.print-shell {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.print-shell > thead {
  display: table-header-group;
}

.print-shell > tbody {
  display: table-row-group;
}

.print-shell > thead > tr > td,
.print-shell > tbody > tr > td {
  border: none !important;
  padding: 0 !important;
  background: #ffffff !important;
}

.print-shell-header {
  padding-bottom: 6px !important;
}

.print-shell-content {
  padding: 0 !important;
}

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>

<body>
  <div class="report-page">

    <table class="print-shell">
      <thead>
        <tr>
          <td class="print-shell-header">

           <div class="report-header">

  <div class="report-header-text">
    ${company ? `<h1 class="company-name">${company}</h1>` : ""}
    <h2 class="report-title">${reportTitle}</h2>
  </div>

  ${
    barcodeSvg
      ? `
        <div class="report-barcode">
  ${barcodeSvg}
</div>
      `
      : ""
  }

</div>

          </td>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td class="print-shell-content">

${groupedRows
  .map(
    (group) => `
      ${
        groupBy?.key
          ? `<div class="group-title">${group.group} (${group.rows.length})</div>`
          : ""
      }

      <table>
        <thead>
          <tr>
            <th class="sno-col">S/N</th>
            ${printableCols
              .map(
                (col) => `
                  <th style="width:${getColumnWidth(col)}">
                    ${col.display_name}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${group.rows
            .map(
              (row, index) => `
                <tr>
                  <td class="sno-col">${index + 1}</td>

                  ${printableCols
                    .map((col) => {
                      let value;

if (col.isProductDescription) {
 // console.log("Generating product description for row:", row);
  const product = row.prd_code;

  const productType = row.prdtype_code;

  const plan = row.plan_code;

  value = [product, productType, plan]
    .filter(Boolean)
    .join(" - ");
} else {
  value = toDisplayValue(row, col);
}

                      const isNumber =
                        isNumericColumn(col) ||
                        col.isDynamicCurrency;

                      return `
                        <td class="${isNumber ? "num" : ""}"
                         style="width:${getColumnWidth(col)}">
                          ${value}
                        </td>
                      `;
                    })
                    .join("")}
                </tr>
              `
            )
            .join("")}

          ${
            firstTotalIndex >= 0
              ? `
                <tr class="total-row">
                  <td colspan="${totalColSpan}" style="text-align:right;">
                    Total Amount AED
                  </td>

                  ${printableCols
                    .slice(firstTotalIndex)
                    .map((col) => {
                      if (!isTotalColumn(col) && !col.isDynamicCurrency) {
                        return `<td></td>`;
                      }

                      const total = group.rows.reduce((sum, row) => {
                        let value = "";

                        if (col.isDynamicCurrency) {
                          value =
                            row.currency === col.currency
                              ? row.amount
                              : "";
                        } else {
                          value = row[col.column_name];
                        }

                        return sum + toNumber(value);
                      }, 0);

                      return `
                        <td class="num">
                          ${
                            total
                              ? formatNumber(total)
                              : "-"
                          }
                        </td>
                      `;
                    })
                    .join("")}
                </tr>
              `
              : ""
          }
        </tbody>
      </table>
    `
  )
  .join("")}

<div class="print-footer-area" style="padding-top: 10px !important;">


  <div class="approval-section">
    <table class="approval-table">
      <thead>
        <tr>
          <th colspan="5" class="approval-title">
            APPROVALS
          </th>
        </tr>

        <tr>
          <th>PREPARED BY</th>
        
          <th>VERIFIED BY</th>
          <th>VERIFIED BY</th>
          <th>SIGNED BY</th>
          <th>APPROVED BY</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>
            <div>${approvalData.prepared_by || "-"}</div>
            <div class="approval-dept">IT DEPARTMENT</div>
          </td>

        

          <td>
            <div>${approvalData.verified_by_it || "-"}</div>
            <div class="approval-dept">IT DEPARTMENT</div>
          </td>

          <td>
            <div>${approvalData.verified_by || "-"}</div>
            <div class="approval-dept">ACCOUNTS</div>
          </td>

          <td>
            <div>${approvalData.signed_by || "-"}</div>
            <div class="approval-dept">FINANCE MANAGER</div>
          </td>

          <td>
            <div>${approvalData.approved_by || "-"}</div>
            <div class="approval-dept">FOUNDER & CEO</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>




 
</body>
</html>
  `;
};

 

const handleGenerateSelected = async () => {
  // Get the selected rows' data
  const selectedRows = sortedAllRows.filter(
    (row) =>
      selectedRowIds.includes(row.id) &&
      !isPrfBlockedProductType(row.product_types)
  );

  if (selectedRows.length === 0) return;

  // Generate next PRF number
  const nextPrfNumber = await generateNextPrfNumber();
  setPrfNumber(nextPrfNumber);

  setSelectedRow(selectedRows);

  setModalItems(
    selectedRows.map((row) => ({
      doc_date: row.date || "",
      doc_no: row.invoice_number || "",
      product: row.prd_code || "",
      amount: row.amount || "",
      vat: row.vat_amount || "",
      total_amount: row.total_amount || "",
      isSelected: true,
      period_start: row.date || "",
      period_end: row.expiry_date || "",
    }))
  );

  setShowGenerateModal(true);
};

function calculateRowTotals({ amount, currency, service_provider_id }) {
 
  const provider = serviceProviders.find(p => p.id === service_provider_id);
 // console.log("Calculating totals for amount:", amount, "currency:", currency, "provider ID:", service_provider_id, "provider:", provider);
  const isVat = provider?.prd_is_vat;
  const amt = Number(amount) || 0;
  const vat = isVat ? (amt * vatPercent) / 100 : 0;
  const total = amt + vat;

  // Find currency value (exchange rate)
  const currencyObj = currencies.find(c => c.curr_code === currency);

  const currencyValue = currencyObj ? Number(currencyObj.curr_exchange_rate) : 1;

  const totalAed = total * currencyValue;
 // console.log("VAT:", vat, "Total:", total, "Total in AED:", totalAed, "Currency value:", currencyValue);

  return {
    vat_amount: vat.toFixed(2),
    total_amount: total.toFixed(2),
    total_amount_aed: totalAed.toFixed(2),
  };
}








const getRowValue = (row, possibleKeys = []) => {
  for (const key of possibleKeys) {
    if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== "") {
      return row[key];
    }
  }

  return "";
};

const isMonthlyTerm = (row) => {
  const termValue = normalizeValue(
    getRowValue(row, [
      "billcycle_code",
      "term",
      "terms",
      "billing_cycle",
      "billing_cycle_name",
    ])
  );

  return (
    termValue === "monthly" ||
    termValue.includes("monthly") ||
    termValue.includes("month")
  );
};

const isCancellationTransaction = (row) => {
  const transactionValue = normalizeValue(
    getRowValue(row, [
      "trntype_code",
      "transaction_type",
      "transactionType",
      "transaction_type_name",
    ])
  );

  return (
    transactionValue.includes("cancel") ||
    transactionValue.includes("cancellation") ||
    transactionValue.includes("cancelation")
  );
};

const isExpiryDateInRange = (row, range) => {
  const expiryRaw = getRowValue(row, [
    "expiry_date",
    "expiryDate",
    "expiry",
  ]);

  if (!expiryRaw) return false;

  const expiryDate = String(expiryRaw).split("T")[0];

  return (
    expiryDate >= range.startDate &&
    expiryDate <= range.endDate
  );
};

const handleQuickDateChange = async (value) => {
  setActiveDateFilter(value);

  if (value === "upcomingRenewals") {
    await applyUpcomingRenewalFilter();
    return;
  }

  const range = getDateRange(value);

  if (range) {
    setDateFilters(range);
  }
};

const handleSort = (key, direction, displayName) => {
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
        value: direction,
        displayName: displayName
      }
    ];
  });

  setOpenMenu(null);
};



const handleSearch = (key, displayName) => {
  setSearchColumnKey(key);
  searchInputRef.current?.focus();
  searchInputRef.current?.select();
  setOpenMenu(null);
  setPage(1);
  setColumnChips(prev => {
    const filtered = prev.filter(
      c => !(c.type === "search" && c.column === key)
    );

    return [
      ...filtered,
      {
        type: "search",
        column: key,
        value: "",
        displayName: displayName
      }
    ];
  });
};



const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
};

const getUpcomingRenewalRange = () => {
  const now = new Date();

  // Start = same current date of last month
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate()
  );

  // End = last date of current month
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  );

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
};
const normalizeValue = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    return String(value.value ?? value.key ?? value.id ?? "")
      .trim()
      .toLowerCase();
  }

  return String(value).trim().toLowerCase();
};

const isUpcomingRenewalRow = (row, range) => {
  const term = normalizeValue(row.billcycle_code);
  const transactionType = normalizeValue(row.trntype_code);

  const invoiceDate = row.date
    ? String(row.date).split("T")[0]
    : "";

  const isMonthly = term === "monthly";

  const isInvoiceDateInRange =
    invoiceDate >= range.startDate &&
    invoiceDate <= range.endDate;

  const isNotCancellation =
    !transactionType.includes("cancel") &&
    !transactionType.includes("cancellation") &&
    !transactionType.includes("cancelation");

  return isMonthly && isInvoiceDateInRange && isNotCancellation;
};



const isNextMonthRenewalRow = (row, range) => {
  const term = normalizeValue(row.billcycle_code);
  const transactionType = normalizeValue(row.trntype_code);

  const expiryDate = row.expiry_date
    ? String(row.expiry_date).split("T")[0]
    : "";

  const isMonthly = term === "monthly";

  // const isNextMonthExpiry =
  //   expiryDate >= range.startDate &&
  //   expiryDate <= range.endDate;

  const isNotCancellation =
    !transactionType.includes("cancel") &&
    !transactionType.includes("cancellation") &&
    !transactionType.includes("cancelation");

  return isMonthly && isNotCancellation;
};

const applyUpcomingRenewalFilter = async () => {
  try {
    setLoading(true);

    const upcomingRange = getUpcomingRenewalRange();

    setDateFilters(upcomingRange);
    setActiveDateFilter("upcomingRenewals");

    const payload = {
      search,
      filters: JSON.stringify([]),

      // Filter by invoice date field
      dateFilters: JSON.stringify({
        date: {
          startDate: upcomingRange.startDate,
          endDate: upcomingRange.endDate,
        },
      }),
    };

    const res = await getModuleData(
      id,
      activeUserEmail,
      payload,
      userRole
    );

    const apiRows = res.data || [];

    const upcomingRenewalRows = apiRows.filter((row) =>
      isUpcomingRenewalRow(row, upcomingRange)
    );

    setRows(upcomingRenewalRows);
    setPage(1);
  } catch (err) {
    console.error("Upcoming renewal filter failed:", err);
    setRows([]);
  } finally {
    setLoading(false);
  }
};

const handleGroup = (key, direction, displayName) => {
  setGroupBy(prev => {
    const groups = Array.isArray(prev) ? prev : [];

    const filtered = groups.filter(g => g.key !== key);

    return [
      ...filtered,
      {
        key,
        direction,
        displayName
      }
    ];
  });

  setColumnChips(prev => {
    const chips = Array.isArray(prev) ? prev : [];

    const filtered = chips.filter(
      c => !(c.type === "group" && c.column === key)
    );

    return [
      ...filtered,
      {
        type: "group",
        column: key,
        value: direction,
        displayName
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
    setGroupBy(prev =>
      Array.isArray(prev)
        ? prev.filter(g => g.key !== chip.column)
        : []
    );
  }
};


const toggleChipDirection = (chip) => {
  const newDirection = chip.value === "asc" ? "desc" : "asc";

  if (chip.type === "sort") {
    handleSort(chip.column, newDirection, chip.displayName);
  }

  if (chip.type === "group") {
    handleGroup(chip.column, newDirection, chip.displayName);
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

  const data = [...filteredRows];

  const sorting = [
    ...sortConfig,
    ...(Array.isArray(groupBy)
      ? groupBy.map(g => ({
          key: g.key,
          direction: g.direction
        }))
      : [])
  ];


  return data.sort((a, b) => {

    for (const sort of sorting) {

      let aValue = a?.[sort.key];
      let bValue = b?.[sort.key];


      aValue =
        typeof aValue === "object"
          ? aValue?.value ?? ""
          : aValue ?? "";

      bValue =
        typeof bValue === "object"
          ? bValue?.value ?? ""
          : bValue ?? "";


      const result = String(aValue).localeCompare(
        String(bValue),
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      );


      if (result !== 0) {
        return sort.direction === "desc"
          ? -result
          : result;
      }
    }

    return 0;
  });


}, [filteredRows, sortConfig, groupBy]);

//console.log("Sorted all rows:", sortedAllRows);
const groupedByRows = React.useMemo(() => {
   const groups = {};

   sortedAllRows.forEach(row => {

      const key =
        Array.isArray(groupBy) && groupBy.length > 0
          ? groupBy.map(g => row[g.key] ?? "(Blank)").join(" - ")
          : "All Records";


      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(row);
   });

  // console.log("Grouped rows:", groups);
   return Object.entries(groups).map(([group, rows]) => ({
      group,
      rows
   }));

}, [sortedAllRows, groupBy]);


// 3. PAGINATE INSIDE GROUPS
const paginatedGroupedRows = React.useMemo(() => {

  const result = [];

  let count = 0;

  groupedByRows.forEach(group => {

    const rows = group.rows.filter(() => {

      const show =
        count >= (page - 1) * pageSize &&
        count < page * pageSize;

      count++;

      return show;
    });


    if(rows.length){
      result.push({
        group: group.group,
        rows
      });
    }

  });


  return result;

}, [groupedByRows, page, pageSize]);
//console.log("Paginated grouped rows:", paginatedGroupedRows);



const totalColumns = visibleColumns.length + 2;

const rowIndexMap = React.useMemo(() => {
  const map = new Map();

  let serialNo = 0;

  groupedByRows.forEach((group) => {
    group.rows.forEach((row) => {
      map.set(row.id, serialNo);
      serialNo++;
    });
  });

  return map;
}, [groupedByRows]);

const orderedVisibleColumns = useMemo(() => {
  // Main View -> use the default visible columns order
  if (activeViewId === "main") {
    const pinned = [];
    const unpinned = [];

    visibleColumns.forEach((col) => {
      if (pinnedColumns.includes(col.column_name)) {
        pinned.push(col);
      } else {
        unpinned.push(col);
      }
    });

    return [...pinned, ...unpinned];
  }

  // Saved View -> use the saved/reordered column order
  const reordered = tempHideColumns
    .map((columnName) =>
      visibleColumns.find((c) => c.column_name === columnName)
    )
    .filter(Boolean);

  const remaining = visibleColumns.filter(
    (c) => !tempHideColumns.includes(c.column_name)
  );

  const ordered = [...reordered, ...remaining];

  const pinned = [];
  const unpinned = [];

  ordered.forEach((col) => {
    if (pinnedColumns.includes(col.column_name)) {
      pinned.push(col);
    } else {
      unpinned.push(col);
    }
  });

  return [...pinned, ...unpinned];
}, [activeViewId, visibleColumns, tempHideColumns, pinnedColumns]);
//console.log("Ordered visible columns:", orderedVisibleColumns.map(c => c.column_name));


const printableGroupedRows = React.useMemo(() => {
  const rows = sortedAllRows.filter(
  (row) => row.requires_prf_form === true && row.prf_num
);
 // console.log("Printable grouped rows (filtered):", rows);
  if (!groupBy?.key) {
    return [
      {
        group: "All Records",
        rows,
      },
    ];
  }

  const groups = {};

  rows.forEach((row) => {
    const key = getGroupKey(row, groupBy);

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
    rows,
  }));
}, [sortedAllRows, groupBy]);



//console.log("Printable grouped rows:", printableGroupedRows);

const dragIndexRef = useRef(null);

const handleDragStart = (colName) => {
  dragIndexRef.current = colName;
};

const handleDrop = (dropColName) => {
  const dragColName = dragIndexRef.current;

  if (!dragColName || dragColName === dropColName) return;

  setColumnOrder((prev) => {
    const updated = [...prev];

    const dragIndex = updated.indexOf(dragColName);
    const dropIndex = updated.indexOf(dropColName);

    if (dragIndex === -1 || dropIndex === -1) return prev;

    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, removed);

    return updated;
  });

  dragIndexRef.current = null;
};

useEffect(() => {
  if (!columnOrder?.length) return;

  const timeout = setTimeout(() => {
    saveColumnSelection(columnOrder);
  }, 300); // debounce to avoid spam

  return () => clearTimeout(timeout);
}, [columnOrder]);
useEffect(() => {
  if (!visibleColumns?.length) return;

  setColumnOrder(visibleColumns.map(c => c.column_name));
  // run only once when columns first arrive
}, [visibleColumns?.length]);

const toggleTotal = (columnName) => {
  setShowTotals((prev) =>
    prev.includes(columnName)
      ? prev.filter((c) => c !== columnName)
      : [...prev, columnName]
  );
};



const grandTotal = useMemo(() => {
  const totals = {};

  orderedVisibleColumns.forEach((col) => {
    if (
      col.data_type?.toLowerCase().includes("decimal") ||
      col.column_name.toLowerCase().includes("amount")
    ) {
      totals[col.column_name] = (rows || []).reduce((sum, row) => {
        return sum + Number(row[col.column_name] || 0);
      }, 0);
    }
  });

  return totals;
}, [rows, orderedVisibleColumns]);

const handleHeaderSortToggle = (key, displayName) => {
  const existing = sortConfig.find(s => s.key === key);

  if (!existing) {
    handleSort(key, "asc", displayName);
  } else if (existing.direction === "asc") {
    handleSort(key, "desc", displayName);
  } else {
    setSortConfig(prev => prev.filter(s => s.key !== key));
  }
};

const openMenuEye = () => {
  const rect = snoRef.current?.getBoundingClientRect();

  if (!rect) return;

  setMenuPosition({
    top: rect.bottom + 5,
    left: rect.left,
  });

  setHidePopupColumn("__sno__");

  setTempHideColumns(
    activeViewId === "main"
      ? visibleColumns.map((c) => c.column_name)
      : [...tempHideColumns]
  );

  setShowHidePopup(true);
};

const buildCurrentViewPayload = () => {
  const activeFilters = Array.isArray(filters) ? filters : [];

  return {
    filters: {
      search: search || "",
      dateFilters: dateFilters || getCurrentMonth(),
      appliedFilters: activeFilters,
    },

    columns: {
      visibleColumns: tempHideColumns || [],
      pinnedColumns: pinnedColumns || [],
    },

    sort_config: sortConfig || [],

    group_config: groupBy || {
      key: null,
      direction: "asc",
    },
  };
};

const loadViews = async () => {
  try {
    if (!id || !activeUserEmail) return;

    const res = await getModuleViews(id, activeUserEmail);

    const savedViews = res.data || [];
    setViews(savedViews);

    const defaultView = savedViews.find((v) => v.is_default);

    if (defaultView) {
      setActiveViewId(defaultView.id);
      applySavedView(defaultView);
    }
  } catch (err) {
    console.error("Failed to load module views:", err);
  }
};

const safeJsonParse = (value, fallback) => {
  try {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const applySavedView = async (view) => {
  // console.log("Applying saved view:", view);  
  const savedFilters = safeJsonParse(view.filters, {});
  const savedColumns = safeJsonParse(view.columns, {});
  const savedSort = safeJsonParse(view.sort_config, []);
  const savedGroup = safeJsonParse(view.group_config, {});

  setSearch(savedFilters.search || "");

  if (savedFilters.dateFilters) {
    setDateFilters(savedFilters.dateFilters);
  }

  if (Array.isArray(savedFilters.appliedFilters)) {
    // setAppliedFilters(savedFilters.appliedFilters);
    setFilters(savedFilters.appliedFilters);
    setAppliedFilters([]);
  }

  if (Array.isArray(savedColumns.visibleColumns)) {
    setSelectedColumns(savedColumns.visibleColumns);
    setTempHideColumns?.(savedColumns.visibleColumns);
    setSavedTableColumns(savedColumns.visibleColumns);
    setTableColumnMode("custom");
  }

  if (Array.isArray(savedColumns.pinnedColumns)) {
    setPinnedColumns(savedColumns.pinnedColumns);
  }

  if (savedSort) {
    setSortConfig(savedSort);
  }

 if (savedGroup?.key) {
  setGroupBy([savedGroup]);
} else {
  setGroupBy([]);
}
  //console.log("saved filters:", savedFilters);
  setHasViewChanges(false);

  await refreshRowsByView(savedFilters);
};

const refreshRowsByView = async (savedFilters = null) => {
  try {
    setLoading(true);

    const filterSource = savedFilters || {
      search,
      dateFilters,
      appliedFilters: appliedFilters || filters || [],
    };
   
    const payload = {
      search: filterSource.search || "",
      filters: JSON.stringify(filterSource.appliedFilters || []),
      dateFilters: JSON.stringify({
        date: {
          startDate: filterSource.dateFilters?.startDate || dateFilters.startDate,
          endDate: filterSource.dateFilters?.endDate || dateFilters.endDate,
        },
      }),
    };

    const res = await getModuleData(
      id,
      activeUserEmail,
      payload,
      userRole
    );

    setRows(res.data || []);
    setPage(1);
  } catch (err) {
    console.error("Failed to refresh rows by view:", err);
    setRows([]);
  } finally {
    setLoading(false);
  }
};
const handleDeleteView = (view) => {
  if (!view?.id) return;

  setConfirmData({
    title: "Delete View",
    message: `Are you sure you want to delete "${view.view_name}" view?`,
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger",
    onConfirm: async () => {
      try {
        setLoading(true);

        await deleteModuleView(view.id);

        if (String(activeViewId) === String(view.id)) {
          setActiveViewId("main");

          const defaults = getCurrentMonth();

          await refreshRowsByView({
            search: "",
            dateFilters: defaults,
            appliedFilters: [],
          });
        }

        await loadViews();

        setPopupMessage("View deleted successfully.");
        setPopupType("success");
      } catch (err) {
        console.error("Delete view failed:", err);
        setPopupMessage(err.response?.data?.error || "Failed to delete view.");
        setPopupType("error");
      } finally {
        setLoading(false);
        setConfirmOpen(false);
      }
    },
  });

  setConfirmOpen(true);
};
const handleRenameView = (view) => {
  setEditingView(view);
  setNewViewName(view.view_name || "");
  setNewViewType(view.view_type || "table");
  setNewViewVisibility(view.visibility || "USER");
  setShowCreateViewModal(true);
};

const handleDuplicateView = async (view) => {
  try {
    if (!view?.id) return;

    const duplicatedPayload = {
      module_id: Number(id),
      view_name: `${view.view_name} Copy`,
      view_type: view.view_type || "table",
      visibility: view.visibility || "USER",
      activeUserEmail,
      filters: safeJsonParse(view.filters, {}),
      columns: safeJsonParse(view.columns, {}),
      sort_config: safeJsonParse(view.sort_config, []),
      group_config: safeJsonParse(view.group_config, {
        key: null,
        direction: "asc",
      }),
      is_default: false,
    };

    const res = await createModuleView(duplicatedPayload);

    const duplicatedView = res.data?.data;

    await loadViews();

    if (duplicatedView?.id) {
      setActiveViewId(duplicatedView.id);
      applySavedView(duplicatedView);
    }

    setPopupMessage("View duplicated successfully.");
    setPopupType("success");
  } catch (err) {
    console.error("Duplicate view failed:", err);
    setPopupMessage(err.response?.data?.error || "Failed to duplicate view.");
    setPopupType("error");
  }
};


const handleCreateView = async () => {
  try {
    if (!newViewName.trim()) {
      setPopupMessage("Please enter view name.");
      setPopupType("error");
      return;
    }

    // ================= RENAME EXISTING VIEW =================
    if (editingView) {
      await updateModuleView(editingView.id, {
        view_name: newViewName.trim(),
        view_type: newViewType || "table",
        visibility: newViewVisibility || "USER",
      });

      setShowCreateViewModal(false);
      setEditingView(null);
      setNewViewName("");
      setNewViewType("table");
      setNewViewVisibility("USER");

      await loadViews();

      setPopupMessage("View renamed successfully.");
      setPopupType("success");
      return;
    }

    // ================= CREATE NEW VIEW =================
    const currentView = buildCurrentViewPayload();

    const payload = {
      module_id: Number(id),
      view_name: newViewName.trim(),
      view_type: newViewType || "table",
      visibility: newViewVisibility || "USER",
      activeUserEmail,
      filters: currentView.filters,
      columns: currentView.columns,
      sort_config: currentView.sort_config,
      group_config: currentView.group_config,
      is_default: false,
    };

    const res = await createModuleView(payload);

    setShowCreateViewModal(false);
    setEditingView(null);
    setNewViewName("");
    setNewViewType("table");
    setNewViewVisibility("USER");

    const createdView = res.data?.data;

    await loadViews();

    if (createdView?.id) {
      setActiveViewId(createdView.id);
      applySavedView(createdView);
    }

    setPopupMessage("View created successfully.");
    setPopupType("success");
  } catch (err) {
    console.error("Create / Rename view failed:", err);
    setPopupMessage(err.response?.data?.error || "Failed to save view.");
    setPopupType("error");
  }
};

const handleSaveViewChanges = async () => {
  try {
    const activeView = views.find(
      (v) => String(v.id) === String(activeViewId)
    );

    if (!activeView) {
      setShowCreateViewModal(true);
      return;
    }

    const currentView = buildCurrentViewPayload();

    await updateModuleView(activeView.id, {
      view_name: activeView.view_name,
      filters: currentView.filters,
      columns: currentView.columns,
      sort_config: currentView.sort_config,
      group_config: currentView.group_config,
    });

    setHasViewChanges(false);
    await loadViews();

    setPopupMessage("View saved successfully.");
    setPopupType("success");
  } catch (err) {
    console.error("Save view failed:", err);
    setPopupMessage(err.response?.data?.error || "Failed to save view.");
    setPopupType("error");
  }
};

const handleRequiresPrfChange = async (row, checked) => {
  try {
    // Update UI immediately
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, requires_prf_form: checked }
          : r
      )
    );

    // Save immediately to database
    await updateRequiresPrf(
      row.id,
      checked,
      activeUserEmail
    );

  } catch (err) {
    console.error(err);

    // Revert if API fails
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, requires_prf_form: !checked }
          : r
      )
    );
  }
};

    return (
        <div className="h-full flex flex-col">
             <ValidatePopups
                            type={popupType}
                            message={popupMessage}
                            onClose={() => {
                              setPopupMessage("");
                              setPopupType("success");
                            }}
                          />
            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800 truncate">
                    {module?.display_name || "Loading..."}
                </h1>

               {/* ================= ACTIONS ================= */}

{/* DESKTOP VIEW (UNCHANGED ROW) */}
<div className="hidden md:flex items-center gap-2">
  
  {/* <PermissionButton
    user={activeUser}
    permission="add"
    onClick={handleCreate}
    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white 
               hover:bg-green-700 hover:shadow-md transition"
  >
    + New
  </PermissionButton> */}

  {/* <PermissionButton
  user={activeUser}
  permission="print"
  onClick={handlePrint}
  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
             hover:bg-gray-100 hover:border-gray-500 transition"
>
  Print
</PermissionButton> */}
 <button
    onClick={() => navigate(`/upload/${id}`)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-green-500 text-white
               hover:bg-green-50 hover:border-green-400 hover:text-green-600 transition"
  >
    Add New
  </button>
    {activeViewId !== "main" && activeViewId !== "table" && (
  <button
    onClick={handleSaveViewChanges}
    disabled={!hasViewChanges}
    className={` ${
      hasViewChanges
        ? "px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-blue-500 text-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
        : "px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white  transition bg-gray-200 text-gray-500 cursor-not-allowed"
    }`}
  >
    Save View
  </button>
)}
<PermissionButton
  user={activeUser}
  permission="print"
 onClick={() => {
  if (getReportRowCount(printableGroupedRows) === 0) {
    showNoRecordsPopup();
    return;
  }

  setReportActionType("print");
  setShowReportHeaderModal(true);
}}
  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
             hover:bg-gray-100 hover:border-gray-500 transition"
>
  Print
</PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="export"
    // onClick={handleExcel}
   onClick={() => {
  if (getReportRowCount(printableGroupedRows) === 0) {
    showNoRecordsPopup();
    return;
  }

  setReportActionType("excel");
  setShowReportHeaderModal(true);
}}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition"
  >
    Excel
  </PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="export"
    // onClick={handlePdf}
 onClick={() => {
  if (getReportRowCount(printableGroupedRows) === 0) {
    showNoRecordsPopup();
    return;
  }

  setReportActionType("pdf");
  setShowReportHeaderModal(true);
}}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition"
  >
    PDF
  </PermissionButton>

 

  {/* <button
    onClick={() => setShowCustomizeDrawer(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white
               hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
  >
    Customize
  </button> */}


{/* <button
  onClick={() => setShowCreateViewModal(true)}
  className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
>
  Save as New View
</button> */}
<CreateViewModal
  open={showCreateViewModal}
  onClose={() => {
    setShowCreateViewModal(false);
    setEditingView(null);
    setNewViewName("");
    setNewViewType("table");
    setNewViewVisibility("USER");
  }}
  newViewName={newViewName}
  setNewViewName={setNewViewName}
  newViewType={newViewType}
  setNewViewType={setNewViewType}
  newViewVisibility={newViewVisibility}
  setNewViewVisibility={setNewViewVisibility}
  onCreate={handleCreateView}
  activeUser={activeUser}
  editingView={editingView}
/>
<CustomizeDrawer
  open={showCustomizeDrawer}
  onClose={() => setShowCustomizeDrawer(false)}

  // Columns (ONLY what is actually used)
  columns={columns}
  visibleColumns={visibleColumns}

  tempSelectedColumns={tempSelectedColumns}
  setTempSelectedColumns={setTempSelectedColumns}

  // Header (Printer Custom)
  selectedCompany={selectedCompany}
  setSelectedCompany={setSelectedCompany}
  companyList={company}

    customPrintHeader={customPrintHeader}
  // setCustomPrintHeader={setCustomPrintHeader}

  // Sub Header
  printModuleName={printModuleName}
  setPrintModuleName={setPrintModuleName}

  // Module
  module={module}
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
   {/* <button 
   onClick={() => setShowFilters(true)}
   className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 transition">
        Filters
   </button> */}

{/* <TableFiltersDrawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
//   onSearch={(cleanedFilters) => {
//   setAppliedFilters(cleanedFilters || []);
//   setFilters(cleanedFilters || []);
//   loadModule(dateFilters, cleanedFilters);
//   setHasViewChanges(true);
//   setPage(1);
// }}
  onSearch={(cleanedFilters) => {
    console.log("Filters applied:", cleanedFilters);
    setFilters(cleanedFilters);   // IMPORTANT
    loadModule(dateFilters, cleanedFilters);
    setAppliedFilters(cleanedFilters);

  }}
  masterList={masterList}
  filters={filters}
  setFilters={setFilters}
  currencies={currencies}
  masterDataMap={masterDataMap}
  setMasterDataMap={setMasterDataMap}
  // saveFilterName={saveFilterName}
  // setSaveFilterName={setSaveFilterName}
  // handleSaveFilter={handleSaveFilter}
/> */}

<TableFiltersDrawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
  onSearch={(cleanedFilters) => {
    const nextFilters = cleanedFilters || [];
const normalizedFilters = nextFilters.map((filter) => ({
    ...filter,
    values: (filter.values || []).map((value) =>
      value === null || value === undefined ? "" : String(value)
    ),
  }));

  console.log("Filters applied:", normalizedFilters);


    setFilters(nextFilters);

    // keep this empty to avoid double frontend filtering
    setAppliedFilters([]);

    setHasViewChanges(true);
    setPage(1);

    loadModule(dateFilters, normalizedFilters);
  }}
  masterList={masterList}
  filters={filters}
  setFilters={setFilters}
  currencies={currencies}
  masterDataMap={masterDataMap}
  setMasterDataMap={setMasterDataMap}
/>

 <button
  className="
    px-3 py-1.5 text-sm rounded-md
    bg-blue-600 text-white
    transition
    enabled:hover:bg-blue-700
    disabled:bg-gray-400
    disabled:cursor-not-allowed
  "
  disabled={selectedRowIds.length === 0}
  onClick={handleGenerateSelected}
>
  Generate
</button>
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
<BoardViewsBar
  views={views}
  activeViewId={activeViewId}
  setActiveViewId={setActiveViewId}
  onMainViewClick={async () => {
  const defaults = getCurrentMonth();

  setSearch("");
  setSearchColumnKey(null);

  setFilters([]);
  setAppliedFilters([]);

  setDateFilters(defaults);
  setActiveDateFilter("");

  setSortConfig([]);
  setGroupBy([]);
  setColumnChips([]);

  // 🔽 ADD THIS
  const settings = await fetchCustomizedColumns();

  const savedColumns = settings?.visibleColumns || [];

  setVisibleColumnsState(savedColumns);
  setSelectedColumns(savedColumns);
  setSavedTableColumns(savedColumns);

  setTableColumnMode("custom");

  setHasViewChanges(false);

  refreshRowsByView({
    search: "",
    dateFilters: defaults,
    appliedFilters: [],
  });
}}
  onTableViewClick={() => {
    setActiveViewId("table");
    setHasViewChanges(false);
  }}
  onApplyView={applySavedView}
 onCreateView={() => {
    setEditingView(null);
    setNewViewName("");
    setNewViewType("table");
    setNewViewVisibility("USER");
    setShowCreateViewModal(true);
  }}
  onRenameView={handleRenameView}
  onDeleteView={handleDeleteView}
  onDuplicateView={handleDuplicateView}
/>
            {/* ================= CONTROL BAR (LEFT ALIGNED) ================= */}
           <div className="bg-white p-3 shadow mb-4">



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
      className="border border-gray-200 px-3 py-2 rounded-lg w-50"
      value={search}
      onChange={(e) => {
        const value = e.target.value;
        setSearch(value);
        setPage(1);
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
      rounded-md
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
      rounded-md
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
      rounded-md
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
    <option value="">Quick Range</option>
    <option value="today">Today</option>
    <option value="yesterday">Yesterday</option>
    <option value="tomorrow">Tomorrow</option>
    <option value="thisWeek">This Week</option>
    <option value="lastWeek">Last Week</option>
    <option value="thisMonth">This Month</option>
    <option value="lastMonth">Last Month</option>
    <option value="thisYear">This Year</option>
    <option value="lastYear">Last Year</option>
    <option value="upcomingRenewals">Upcoming Renewals</option>
    
    {/* <option value="custom">Custom Range</option> */}
  </select>

  {/* Apply */}
  <button
    onClick={applyDateFilter}
    className="
      h-9
      px-5
      rounded-md
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
      rounded-md
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
<button 
   onClick={() => setShowFilters(true)}
   className="px-2 py-2 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-orange-50 hover:border-orange-400 hover:text-orange-600 transition">
        <Funnel size={15} />
   </button>
</div>

  {/* Right side: Pagination + Total */}
<div className="ml-auto flex items-center gap-4">
  <div className="flex items-end gap-1 text-sm">
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
<div className="flex flex-wrap items-center gap-2 mb-3">

  {/* SEARCH */}
  {groupedChips.search?.length > 0 && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-gray-600 mr-2">
        SEARCHING:
      </span>
      {console.log("Rendering search chips:", groupedChips)}
      {groupedChips.search.map((chip, i) => (
        <div
          key={i}
          className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-full text-xs"
        >
          <span>{chip.displayName}</span>

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
    {chip.displayName} {chip.value === "asc" ? "↑" : "↓"}
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
    {Array.isArray(groupedChips.group) &&
 groupedChips.group.length > 0 && (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-xs font-bold text-gray-600 mr-2">
      GROUPING:
    </span>

    {groupedChips.group.map((chip, i) => (
      <div
        key={`${chip.column}-${i}`}
        onClick={() => toggleChipDirection(chip)}
        className="flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-purple-100"
      >
        <span>
          {chip.displayName} {chip.value === "asc" ? "↑" : "↓"}
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
  )}

</div>

</div>
          
    </div>

            {/* ================= TABLE WRAPPER ================= */}
            <div className="bg-white rounded-xl shadow flex-1 flex flex-col overflow-hidden">
                <div   ref={tableContainerRef} className="flex-1 w-full overflow-auto">
                  {isInitialLoading ? (
                    <div className="flex justify-center items-center h-80">
                      <Loader type="orbit" />
                    </div>
                  ) : (
                    <>
                    <div className="hidden md:block ">
                    <table className="min-w-max w-full text-sm border-separate border-spacing-0">
                        <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
                            <tr>
                               <th
                                  ref={snoRef}
                                  className="group relative px-4 py-3 border-b text-left sticky left-0 z-40 bg-gray-100 w-16 min-w-16 border-r border-gray-200 cursor-pointer"
                                  onClick={openMenuEye}
                                >
                                  {/* TEXT (hide on hover) */}
                                  <span className="group-hover:opacity-0 transition" >
                                    S.No
                                  </span>

                                  {/* ICON (show only on hover) */}
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-gray-500" title="Show / Hide Columns">
                                  <EyeIcon className="w-6 h-6" />
                                </span>
                                </th>
                                <th className="px-4 py-3 border-b text-right">Actions</th>

                               {orderedVisibleColumns.map((col, index) => (
  <th
    key={col.column_id}
        draggable
  onDragStart={() => handleDragStart(col.column_name)}
onDragOver={(e) => e.preventDefault()}
onDrop={() => handleDrop(col.column_name)}
   
    ref={(el) => {
      if (el) {
        pinnedHeaderRefs.current[col.column_name] = el;
      } else {
        delete pinnedHeaderRefs.current[col.column_name];
      }
    }}
   className={`px-4 py-3 border-b text-left relative overflow-visible select-none cursor-move ${
  pinnedColumns.includes(col.column_name) ? "sticky z-30 bg-gray-100 border-r border-gray-200" : ""
}`}
    style={getPinnedLeft(col.column_name)}
  >
    {/* HEADER */}
   <div className="flex items-center justify-between gap-1 px-2 py-1 rounded">
  
  {/* COLUMN NAME → SORT TOGGLE */}
  <span
    className="cursor-pointer flex-1 hover:bg-gray-200 px-1 py-1 rounded"
    onClick={() => handleHeaderSortToggle(col.column_name, col.display_name)}
  >
     {getColumnDisplayName(col)}
  </span>
  

  {/* SMALL BUTTON → MENU */}
  <button
    className=" absolute right-0
                h-5 w-5
                flex items-center justify-center
                rounded-md
               
                text-gray-400
                hover:bg-blue-100
                transition"
    onClick={(e) => {
      e.stopPropagation();

      handleHeaderMenuToggle(col.column_name, e);
    }}
  >
    ▾
  </button>
</div>

    {/* DROPDOWN MENU */}
    {openMenu === col.column_name && createPortal(
      <div
        className="fixed mt-1 absolute top-9 right-0
        w-[275px]
        bg-white
        rounded-xl
        shadow-[0_15px_45px_rgba(0,0,0,0.16)]
        border border-gray-100
        z-[99999]
        overflow-hidden"
        style={{ top: menuPosition.top, left: menuPosition.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => handleSearch(col.column_name, col.display_name)}
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
        >
           Search
        </button>
        <div className="border-t border-gray-100" />
       <button
          onClick={() => handlePinColumn(col.column_name)}
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
        >
          {pinnedColumns.includes(col.column_name) ? (
            <>
              <PinOff className="w-4 h-4" />
              <span>Unpin Column</span>
            </>
          ) : (
            <>
              <Pin className="w-4 h-4" />
              <span>Pin Column</span>
            </>
          )}
        </button>
        <div className="border-t border-gray-100" />
        <button
          onClick={() =>
            handleSort(col.column_name, "asc", col.display_name)
          }
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
        >
          Sort by Ascending
        </button>
        <div className="border-t border-gray-100" />
        <button
          onClick={() => {
            console.log("Sorting by column:", col, "with direction: desc");
            handleSort(col.column_name, "desc", col.display_name);
          }}
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
        >
          Sort by Descending
        </button>
        <div className="border-t border-gray-100" />
        <button
          onClick={() => {
            handleGroup(col.column_name, "asc", col.display_name);
          }}
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
        >
          Group by Ascending
        </button>
        <div className="border-t border-gray-100" />
        <button
          onClick={() =>
            handleGroup(col.column_name, "desc", col.display_name)
          }
          className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
        >
          Group by Descending
        </button>
      </div>,
      document.body
    )}

  </th>
))}

                                
                            </tr>
                        </thead>

                        {/* TABLE BODY */}
                    <tbody className="divide-y">
                     
                      {!isCreating && paginatedGroupedRows.length === 0 && (
  <tr>
    <td
      colSpan={totalColumns}
      className="px-6 py-12 text-center text-gray-500 font-medium"
    >
      No records found
    </td>
  </tr>
)}
                    {(paginatedGroupedRows || []).map((groupObj) => (
  <React.Fragment key={groupObj.group || "default"}>

    {groupBy?.length > 0 && (
<tr className="sticky top-0 z-30">
  <td colSpan={totalColumns} className="p-0">
    <div
      className="
        flex items-center justify-between
        px-5 py-2.5
        bg-white
        border-y border-gray-200
        shadow-sm
      "
    >
      <div className="flex items-center gap-3">

        {/* Accent line */}
        <div
          className="
            w-2 h-8
            rounded-full
            bg-blue-600
          "
        />

        <div className="flex flex-col">

          {/* Group columns */}
          <div
            className="
              text-[11px]
              uppercase
              tracking-wider
              text-gray-500
            "
          >
            {groupBy.map(g => g.displayName).join(" • ")}
          </div>


          {/* Group value + row count */}
          <div className="flex items-center gap-2">

            <div
              className="
                text-sm
                font-semibold
                text-gray-800
              "
            >
              {groupObj.group}
            </div>


            {/* Row count badge */}
            <span
              className="
                px-2
                py-0.5
                rounded-full
                bg-blue-50
                border border-blue-200
                text-blue-700
                text-[11px]
                font-semibold
              "
            >
              {groupObj.rows.length} rows
            </span>

          </div>

        </div>

      </div>

    </div>
  </td>
</tr>

)}


    {groupObj.rows.map((row, i) => (
      <tr
        key={row.id ?? i}
        className="group hover:bg-gray-50 transition-colors cursor-pointer"
        onDoubleClick={() => {
          if (row.prf_num && !isRowUnposted(row)) {
            handlePreview(encodeURIComponent(row.prf_num));
            return;
          }
          if (!row.prf_num || isRowUnposted(row)) {
            setEditRowId(row.id);
            setEditRow({ ...row });
            setOriginalRow(row);
            setShowEditPopup(true);
          }
        }}
      >

        {/* ================= SERIAL NO ================= */}
        <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-20 bg-white group-hover:bg-gray-50 w-16 min-w-16 border-r border-gray-200">

          {/* ✅ FIXED SERIAL NUMBER */}
          {(rowIndexMap.get(row.id) ?? 0) + 1}

        </td>
        
                     <td className="px-4 py-3 whitespace-nowrap">
  <div className="flex items-center justify-end gap-2">
    {row.pdf_path && (
  <button
    type="button"
    onClick={() => setPreviewPdfUrl(getPdfUrl(row.pdf_path))}
    title="View Uploaded PDF"
    className="p-1 rounded hover:bg-blue-50 transition"
  >
    <EyeIcon className="w-5 h-5 text-gray-600" />
  </button>
)}
    {/* Always show PRF checkbox */}
    <input
      type="checkbox"
      checked={row.requires_prf_form || false}
      onChange={(e) =>
        handleRequiresPrfChange(row, e.target.checked)
      }
      className="h-4 w-4 cursor-pointer shrink-0"
      title="PRF Required"
    />



    {editRowId === row.id ? (
      <>
        {/* SAVE */}
        <button
          onClick={handleSaveEdit}
          title="Save Edit"
          className="p-1 rounded hover:bg-gray-200 transition"
        >
          <SavePlus size={18} className="text-green-600" />
        </button>

        {/* CANCEL EDIT */}
        <button
          onClick={handleCancelEdit}
          title="Cancel Edit"
          className="p-1 rounded hover:bg-gray-200 transition"
        >
          <X size={18} className="text-gray-500" />
        </button>

        {!row.is_active && (
          <PermissionButton
            user={activeUser}
            permission="modify"
            onClick={() => handleUndoCancelRow(row)}
            title="Undo Cancel"
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <RotateCcw size={18} className="text-gray-500" />
          </PermissionButton>
        )}
      </>
    ) : row.prf_num ? (
      <>
        {isRowUnposted(row) ? (
          <>
            <PermissionButton
              user={activeUser}
              permission="modify"
              onClick={() => {
                setEditRowId(row.id);
                setEditRow({ ...row });
                setOriginalRow(row);
                setShowEditPopup(true);
              }}
              title="Edit"
              className="p-1 rounded hover:bg-gray-200 transition"
            >
              <Pencil size={18} className="text-gray-500" />
            </PermissionButton>

            <button
              onClick={() => handlePost(encodeURIComponent(row.prf_num))}
              disabled={!isUserHavePrfAccess}
              title="Post"
              className="p-1 rounded hover:bg-blue-200 transition"
            >
              <Send size={18} className="text-gray-500" />
            </button>
          </>
        ) : (
          <button
            onClick={() => handleUnpost(encodeURIComponent(row.prf_num))}
            disabled={!isUserHavePrfAccess}
            title="Unpost"
            className={`p-1 rounded hover:bg-yellow-100 transition ${
              !isUserHavePrfAccess ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            <Undo2 size={18} className="text-gray-500" />
          </button>
        )}

        <button
          onClick={() => handlePreview(encodeURIComponent(row.prf_num))}
          title="Preview"
          className="p-1 rounded hover:bg-gray-200 transition"
        >
          <FileSearch size={18} className="text-gray-500" />
        </button>
      </>
    ) : (
      <>
        <PermissionButton
          user={activeUser}
          permission="modify"
          onClick={() => {
            setEditRowId(row.id);
            setEditRow({ ...row });
            setOriginalRow(row);
          }}
          title="Edit"
          className="p-1 rounded hover:bg-gray-200 transition"
        >
          <Pencil size={18} className="text-gray-500" />
        </PermissionButton>

        {row.is_active ? (
          <PermissionButton
            user={activeUser}
            permission="delete"
            onClick={() => handleCancelRow(row)}
            title="Cancel"
            className="p-1 rounded hover:bg-gray-200 transition"
          >
            <X size={18} className="text-gray-500" />
          </PermissionButton>
        ) : (
          <span
            title="Row is already cancelled"
            className="p-1 rounded text-gray-400"
          >
            <BookX size={18} className="text-gray-500" />
          </span>
        )}

        <PermissionButton
          user={activeUser}
          permission="delete"
          onClick={() => handleDelete(row)}
          title="Delete"
          className="p-1 rounded hover:bg-red-50 transition"
        >
          <Trash2 size={18} className="text-red-500" />
        </PermissionButton>
      </>
    )}
  </div>
</td>

                          {/* ================= COLUMNS ================= */}
                          {orderedVisibleColumns.map((col) => {

                            const isMaster = !!col.master;

                            const editKey = `edit-${row.id}-${col.column_name}`;

                            const isDate = col.data_type
                              ?.toLowerCase()
                              .includes("date");

                            const isAmount = col.data_type
                              ?.toLowerCase()
                              .includes("decimal");

                            const rawValue = row?.[col.column_name];

                            let value =
                              typeof rawValue === "object"
                                ? rawValue?.value ?? ""
                                : rawValue ?? "";

                            // ================= MASK DISPLAY =================
                          if (col.master === "credit_card" && value) {
  value = String(value).slice(-4);
}
                           if (col.column_name === "prf_num") {

                              const val = row[col.column_name];
                              const disablePrfCheckbox = isPrfBlockedProductType(row.product_types);
                              const RequiredPRF = row.requires_prf_form === true
                              const isCheckboxDisabled = disablePrfCheckbox || !isUserHavePrfAccess || !RequiredPRF;
                              //console.log("Row ID:", row.id, "Product Types:", row.product_types, "Disable PRF Checkbox:", disablePrfCheckbox);
                              //console.log("disablePrfCheckbox for row", row.id, "with product types", row.product_types, ":", disablePrfCheckbox);
                              if (val && String(val).trim() !== "") {

                                const generatedLabel = isRowUnposted(row)
                                  ? `PRF Unposted (${val})`
                                  : `Already Generated (${val})`;
                                const generatedClass = isRowUnposted(row)
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700";

                                return (
                                  <td
                                    key={col.column_id}
                                    className="px-4 py-3 whitespace-nowrap"
                                  >
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${generatedClass}`}>
                                      {generatedLabel}
                                    </span>
                                  </td>
                                );

                              } else {

                                return (
                                  <td className="px-4 py-3 whitespace-nowrap text-center" key={col.column_id}>
                                                     <label
  className={`relative flex items-center justify-center ${
    isCheckboxDisabled
      ? "cursor-not-allowed"
      : "cursor-pointer"
  }`}
>
  <input
    type="checkbox"
    checked={
      !isCheckboxDisabled &&
      selectedRowIds.includes(row.id)
    }
    disabled={isCheckboxDisabled}
    onChange={(e) => {
      if (isCheckboxDisabled) return;

      setSelectedRowIds((prev) =>
        e.target.checked
          ? [...prev, row.id]
          : prev.filter((id) => id !== row.id)
      );
    }}
    className="
      peer
      appearance-none
      h-5 w-5
      rounded-md
      border-2 border-gray-300
      bg-white
      checked:bg-green-500
      checked:border-green-500
      transition-all duration-200
      disabled:cursor-not-allowed
      disabled:opacity-40
    "
  />

  <svg
    className="
      absolute
      w-3 h-3
      text-white
      opacity-0
      peer-checked:opacity-100
      pointer-events-none
    "
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  </svg>
</label>
 </td>
                                );
                              }
                            }
                            return (
                              <td
                                key={col.column_id}
                                className={`px-4 py-3 whitespace-nowrap ${getAlignClass(
                                  col.display_name
                                )} ${pinnedColumns.includes(col.column_name) ? "sticky z-20 bg-blue-50 border-r border-gray-200" : "" } `}
                                style={getPinnedLeft(col.column_name)}
                              >

                                {editRowId === row.id ? (

                                  <div className="relative">

                                    {/* ================= INPUT ================= */}
                                    <input
                                      type={isNumericColumn(col) ? "number" : isDate ? "date" : "text"}
                                      disabled={
                                        col.column_name === "total_amount_aed"
                                      }
                                      className="
                                        w-full
                                        rounded-xl
                                        border border-gray-300
                                        bg-white
                                        px-3 py-2
                                        pr-10
                                        text-sm
                                        outline-none
                                        transition-all duration-200
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                        disabled:bg-gray-100
                                        disabled:text-gray-500
                                      "
                                      value={(() => {

                                        // ================= AED =================
                                        if (
                                          col.column_name === "total_amount_aed"
                                        ) {
                                          return (
                                            editRow.total_amount_aed || ""
                                          );
                                        }

                                        // ================= DATE =================
                                        if (isDate) {
                                          return formatForInput(
                                            editRow[col.column_name]
                                          );
                                        }

                                        // ================= CREDIT CARD =================
                                        if (
                                          col.master === "credit_card"
                                        ) {

                                          const raw =
                                            typeof editRow[
                                              col.column_name
                                            ] === "object"
                                              ? editRow[col.column_name]
                                                  ?.value ?? ""
                                              : editRow[
                                                  col.column_name
                                                ] ?? "";

                                          if (!raw) return "";

                                          const last4 =
                                            String(raw).slice(-4);

                                          return `**** **** **** ${last4}`;
                                        }

                                        // ================= NORMAL =================
                                        return typeof editRow[
                                          col.column_name
                                        ] === "object"
                                          ? editRow[col.column_name]
                                              ?.value ?? ""
                                          : editRow[col.column_name] ??
                                              "";

                                      })()}
                                     onChange={(e) => {

                                      let val = e.target.value;

                                      // ================= REMOVE MASK =================
                                      if (col.master === "credit_card") {
                                        val = val.replace(/\D/g, "");
                                      }

                                      // ================= NUMERIC =================
                                      if (isNumericColumn(col.column_name)) {
                                        val = handleNumericInput(val);
                                      }

                                      let updatedRow = {
                                        ...editRow,
                                        [col.column_name]: val,
                                      };

                                      // =====================================================
                                      // VAT + TOTAL AUTO CALCULATION
                                      // =====================================================

                                      const triggerColumns = [
                                        "amount",
                                        "vend_code",
                                        "prd_code"
                                      ];

                                      if (triggerColumns.includes(col.column_name)) {

                                        let matchedProvider = null;

                                        // =========================
                                        // FIRST CHECK VENDOR
                                        // =========================
                                       
                                        if (updatedRow.vend_code) {

                                          matchedProvider = serviceProviders.find(
                                            sp =>
                                              String(sp.vend_code || "")
                                                .trim()
                                                .toLowerCase() ===
                                              String(updatedRow.vend_code || "")
                                                .trim()
                                                .toLowerCase()
                                          );
                                          
                                        }

                                        if (!matchedProvider && updatedRow.prd_code) {
   
                                        matchedProvider = serviceProviders.find(sp => {
  const value = String(updatedRow.prd_code || "")
    .trim()
    .toLowerCase();

  return (
    String(sp.prd_code || "")
      .trim()
      .toLowerCase() === value ||
    String(sp.prd_name || "")
      .trim()
      .toLowerCase() === value
  );
});
                                        }

                                        const amount = parseFloat(updatedRow.amount || 0);

                                      
                                        if (matchedProvider?.prd_is_vat) {

                                          const vat = (amount * Number(vatPercent || 0)) / 100;

                                          updatedRow.vat_amount = vat.toFixed(2);

                                          updatedRow.total_amount = (
                                            amount + vat
                                          ).toFixed(2);

                                        } else {

                                          updatedRow.vat_amount = "0.00";

                                          updatedRow.total_amount = amount.toFixed(2);
                                        }
                                      }

                                      setEditRow(updatedRow);

                                      setActiveDropdown(editKey);
                                    }}
                                      onFocus={() => {

                                        setActiveDropdown(editKey);

                                        // ================= FETCH MASTER =================
                                        if (
                                          isMaster &&
                                          col.master
                                        ) {
                                          fetchMasterDataForColumn(
                                            col.master
                                          );
                                        }

                                        if (
                                          isMaster &&
                                          col.master1
                                        ) {
                                          fetchMasterDataForColumn(
                                            col.master1
                                          );
                                        }
                                      }}
                                      onBlur={(e) => {

                                        // ================= DECIMAL FORMAT =================
                                        if (
                                          isAmount &&
                                          e.target.value !== ""
                                        ) {

                                          setEditRow((prev) => ({
                                            ...prev,
                                            [col.column_name]:
                                              Number(
                                                e.target.value
                                              ).toFixed(2),
                                          }));
                                        }

                                        setTimeout(() => {
                                          setActiveDropdown(null);
                                        }, 150);
                                      }}
                                    />

                                    {/* ================= LOADER ================= */}
                                    {isMaster &&
                                      loadingMaster === col.master && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                          <Loader type="dots" />
                                        </div>
                                    )}
                                   



                                    {/* ================================================= */}
                                    {/* ================= DROPDOWN ===================== */}
                                    {/* ================================================= */}

                                    {isMaster &&
                                      activeDropdown === editKey &&
                                      (() => {

                                        const currentValue =
                                          typeof editRow[
                                            col.column_name
                                          ] === "object"
                                            ? editRow[col.column_name]
                                                ?.value || ""
                                            : editRow[col.column_name] ||
                                              "";

                                        const rawOptions =
                                          getMasterOptions(
                                            col,
                                            currentValue,
                                            editRow
                                          ).slice(0, 20);
                                     

                                        const filteredOptions =
                                          rawOptions.filter((val) => {

                                            const display =
                                              typeof val === "object"
                                                ? val.value
                                                : val;

                                            return display
                                              ?.toLowerCase()
                                              .includes(
                                                currentValue.toLowerCase()
                                              );
                                          });

                                        // ================= EXACT MATCH =================
                                        const exactMatch =
                                          filteredOptions.some(
                                            (val) => {

                                              const display =
                                                typeof val ===
                                                "object"
                                                  ? val.value
                                                  : val;

                                              return (
                                                display?.toLowerCase() ===
                                                currentValue.toLowerCase()
                                              );
                                            }
                                          );

                                        const showAdd =
                                          currentValue &&
                                          !exactMatch &&
                                          loadingMaster !==
                                            col.master;

                                        return (
                                          <div
                                            className="
                                              absolute z-50 mt-2 w-full overflow-hidden
                                              rounded-2xl border border-gray-200
                                              bg-white/95 backdrop-blur-xl
                                              shadow-[0_10px_35px_rgba(0,0,0,0.12)]
                                              max-h-64 overflow-y-auto
                                            "
                                          >

                                            {/* ================= LOADING ================= */}
                                            {loadingMaster ===
                                              col.master && (
                                              <div className="flex items-center justify-center py-6">
                                                <Loader type="dots" />
                                              </div>
                                            )}

                                            {/* ================= OPTIONS ================= */}
                                            {loadingMaster !==
                                              col.master &&
                                              filteredOptions.map(
                                                (val, idx) => {

                                                  const display =
                                                    typeof val ===
                                                    "object"
                                                      ? val.value
                                                      : val;

                                                  // ================= MASK DROPDOWN =================
                                                  let displayValue =
                                                    display;

                                                  if (
                                                    col.master ===
                                                    "credit_card"
                                                  ) {
                                                    const last4 =
                                                      String(
                                                        display
                                                      ).slice(-4);

                                                    displayValue = `**** **** **** ${last4}`;
                                                  }

                                                  return (
                                                    <div
                                                      key={idx}
                                                      className="
                                                        flex items-center justify-between
                                                        px-4 py-3
                                                        text-sm text-gray-700
                                                        cursor-pointer
                                                        hover:bg-blue-50
                                                        transition-all duration-150
                                                        border-b border-gray-100
                                                        last:border-0
                                                      "
                                                    onMouseDown={() => {
                                                    
                                                      const selectedLabel =
                                                      typeof val === "object"
                                                      ? val.value
                                                      : val;

                                                      setEditRow(prev => ({
                                                      ...prev,
                                                      [col.column_name]: selectedLabel,
                                                      }));

                                                      setActiveDropdown(null);
                                                      }}


                                                    >
                                                      <span className="truncate">
                                                        {displayValue}
                                                      </span>
                                                    </div>
                                                  );
                                                }
                                            )}

                                            {/* ================= EMPTY ================= */}
                                            {loadingMaster !==
                                              col.master &&
                                              filteredOptions.length ===
                                                0 &&
                                              !showAdd && (
                                                <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                                  No results found
                                                </div>
                                            )}

                                            {/* ================= ADD NEW ================= */}
                                            {loadingMaster !==
                                              col.master &&
                                              showAdd && (
                                                <div
                                                  className="
                                                    sticky bottom-0
                                                    bg-green-50
                                                    border-t border-green-200
                                                    px-4 py-3
                                                    text-sm font-medium text-green-700
                                                    cursor-pointer
                                                    hover:bg-green-100
                                                    transition
                                                  "
                                                  onMouseDown={async () => {

                                                    await addMasterValue(
                                                      col.master,
                                                      currentValue
                                                    );

                                                    setEditRow({
                                                      ...editRow,
                                                      [col.column_name]:
                                                        currentValue,
                                                    });

                                                    setActiveDropdown(
                                                      null
                                                    );
                                                  }}
                                                >
                                                  + Add "{currentValue}"
                                                </div>
                                            )}

                                          </div>
                                        );
                                      })()}
                                  </div>

                                ) : (

                                  (() => {

                                    // ================= DATE =================
                                    if (isDate) {
                                      return formatDate(value);
                                    }

                                    // ================= AED =================
                                    if (
                                      col.column_name ===
                                      "total_amount_aed"
                                    ) {
                                      return value
                                        ? Number(value).toFixed(2)
                                        : "-";
                                    }

                                    // ================= DECIMAL =================
                                    if (
  col.data_type?.toLowerCase().includes("decimal") &&
  value !== ""
) {
  const num = Number(value);
  return !isNaN(num) && num !== 0
    ? num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "-";
}

                                    // ================= AMOUNT =================
                                    if (
                                      col.column_name
                                        .toLowerCase()
                                        .includes("amount")
                                    ) {
                                      return value
                                        ? Number(value).toLocaleString()
                                        : "-";
                                    }

                                    // ================= CREDIT CARD =================
                                    if (col.master === "credit_card") {
  const raw = String(value ?? "");
  return raw ? raw.slice(-4) : "-";
}

                                    // ================= NORMAL =================
                                    return typeof value === "object"
                                      ? value.value
                                      : value;

                                  })()
                                )}
                              </td>
                            );
                          })}

                        </tr>
                         ))}
  </React.Fragment>
))}
                      {showEditPopup && (
                        <EditRowPopup
                          visibleColumns={visibleColumns}
                          editRow={editRow}
                          setEditRow={setEditRow}
                          columns={columns}
                          getMasterOptions={getMasterOptions}
                          loadingMaster={loadingMaster}
                          fetchMasterDataForColumn={fetchMasterDataForColumn}
                          serviceProviders={serviceProviders}
                          vatPercent={vatPercent}
                          onClose={() => {
                            setShowEditPopup(false);
                            setEditRowId(null);
                          }}
                          onSave={async () => {
                            await handleSaveEdit();
                            setShowEditPopup(false);
                            setEditRowId(null);
                          }}
                        />
                      )}
                      </tbody>
                     <tfoot className="sticky bottom-0 bg-gray-100 border-t-2 border-gray-300 z-30">
  <tr>

    {/* Serial No */}
  <td className="px-4 py-3"></td>

   {orderedVisibleColumns.map((col, index) => {
  const isNumeric = col.column_name.toLowerCase().includes("amount");

  // Find the index of the Amount column
  const amountIndex = orderedVisibleColumns.findIndex(
    c => c.column_name === "amount"
  );

  return (
    <React.Fragment key={col.column_id}>
      {index === amountIndex && (
        <td className="px-4 py-3 text-center">
          <button
            onClick={() => setShowTotals(!showTotals)}
            className="px-3 py-1 rounded bg-blue-600 text-white text-xs"
          >
            {showTotals ? "Hide Total" : "Show Total"}
          </button>
        </td>
      )}

      <td
        className={`px-4 py-3 font-semibold ${getAlignClass(
          col.display_name
        )}`}
      >
        {showTotals && isNumeric
          ? Number(grandTotal[col.column_name] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : ""}
      </td>
    </React.Fragment>
  );
})}

    {/* Action */}
    

  </tr>
</tfoot>

                    </table>
                    {showHidePopup && hidePopupColumn === "__sno__" && (
  <div
    style={{
      position: "fixed",
      top: menuPosition.top,
      left: menuPosition.left,
      zIndex: 9999
    }}
  >
    
<ShowHideColumnsPopup
  columns={columns}
  tempHideColumns={tempHideColumns}
  setTempHideColumns={setTempHideColumns}
  onCancel={() => {
    setShowHidePopup(false);
    setHidePopupColumn(null);
  }}
  onSave={async (selectedColumnsFromDrag) => {
    if (activeViewId === "main") {
      await saveColumnSelection(selectedColumnsFromDrag);
    }

    setShowHidePopup(false);
    setHidePopupColumn(null);
  }}
/>

{/* <ShowHideColumnsPopup
      columns={columns}
      tempHideColumns={tempHideColumns}
      setTempHideColumns={setTempHideColumns}
      onCancel={() => {
        setShowHidePopup(false);
        setHidePopupColumn(null);
      }}
      onSave={async () => {
        await saveColumnSelection(tempHideColumns);
        setShowHidePopup(false);
        setHidePopupColumn(null);
      }}
    /> */}
  </div>
)}
                    </div>
                    {/* ================= MOBILE VIEW ================= */}
<div className="md:hidden space-y-4">

  {sortedAllRows.map((row, i) => (

    <div
      key={row.id ?? i}
      className="
        bg-white
        rounded-2xl
        border border-gray-200
        shadow-sm
        overflow-hidden
      "
    >

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">

        <div>
          <div className="text-xs text-gray-500">
            Record
          </div>

          <div className="font-semibold text-gray-800">
            #{(page - 1) * pageSize + i + 1}
          </div>
        </div>

        {!row.is_active ? (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
            Cancelled
          </span>
        ) : (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-600">
            Active
          </span>
        )}
      </div>

      {/* Fields */}
      <div className="divide-y">

        {visibleColumns.map((col) => {

          let value = row[col.column_name];

          if (col.master === "credit_card" && value) {
            const last4 = String(value).slice(-4);
            value = `**** **** **** ${last4}`;
          }

          if (
            col.data_type?.toLowerCase().includes("date")
          ) {
            value = formatDate(value);
          }

          if (
            col.data_type?.toLowerCase().includes("decimal") &&
            value
          ) {
            value = Number(value).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          }

          return (
            <div
              key={col.column_id}
              className="flex justify-between gap-3 px-4 py-3"
            >
              <span className="text-gray-500 text-sm">
                {col.display_name}
              </span>

              <span className="text-right text-gray-800 font-medium break-all">
                {value || "-"}
              </span>
            </div>
          );
        })}

      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t">

        {row.prf_num ? (

          <div className="grid grid-cols-2 gap-2">
            {isRowUnposted(row) ? (
              <>
                <PermissionButton
                  user={activeUser}
                  permission="modify"
                  onClick={() => {
                    setEditRowId(row.id);
                    setEditRow({ ...row });
                    setOriginalRow(row);
                    setShowEditPopup(true);
                  }}
                  className="
                    py-2
                    rounded-xl
                    border
                    bg-white
                    text-sm
                  "
                >
                  Edit
                </PermissionButton>

                <button
                  onClick={() => handlePost(encodeURIComponent(row.prf_num))}
                  disabled={!isUserHavePrfAccess}
                  className="
                    w-full
                    bg-emerald-600
                    text-white
                    py-2.5
                    rounded-xl
                    font-medium
                  "
                >
                  Post
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() =>
                    handleUnpost(
                      encodeURIComponent(row.prf_num)
                    )
                  }
                  disabled={!isUserHavePrfAccess}
                  className={`px-3 py-1 text-white rounded-md text-sm font-medium transition-colors
                      ${
                        !isUserHavePrfAccess
                          ? "bg-gray-300 cursor-not-allowed opacity-50"
                          : "bg-red-400 hover:bg-red-500"
                      }`}
                  >
                  Unpost
                </button>

                <button
                  onClick={() =>
                    handlePreview(
                      encodeURIComponent(row.prf_num)
                    )
                  }
                  className="
                    w-full
                    bg-blue-600
                    text-white
                    py-2.5
                    rounded-xl
                    font-medium
                  "
                >
                  Preview
                </button>
              </>
            )}
          </div>

        ) : (

          <div className="grid grid-cols-3 gap-2">

            <PermissionButton
              user={activeUser}
              permission="modify"
              onClick={() => {
                setEditRowId(row.id);
                setEditRow({ ...row });
                setOriginalRow(row);
              }}
              className="
                py-2
                rounded-xl
                border
                bg-white
                text-sm
              "
            >
              Edit
            </PermissionButton>

            <PermissionButton
              user={activeUser}
              permission="delete"
              onClick={() => handleCancelRow(row)}
              className="
                py-2
                rounded-xl
                border
                bg-white
                text-sm
              "
            >
              Cancel
            </PermissionButton>

            <PermissionButton
              user={activeUser}
              permission="delete"
              onClick={() => handleDelete(row)}
              className="
                py-2
                rounded-xl
                border
                bg-white
                text-sm
              "
            >
              Delete
            </PermissionButton>

          </div>

        )}

      </div>

    </div>

  ))}

</div>
                    </>
                  )}
                  

                 
                 
{showGenerateModal && (

  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center px-4 py-6">

  {/* ================= MAIN POPUP ================= */}
<div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[26px] bg-gradient-to-br from-white to-slate-50 shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-slate-200">

  {/* HEADER */}
  <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-[26px]">

    <div>

      <h2 className="text-xl font-bold text-slate-800">
        Payment Request Form
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        PRF NUMBER : {prfNumber}
      </p>

    </div>

    <button
      onClick={() => setShowGenerateModal(false)}
      className="h-10 w-10 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-500 transition"
    >
      ✕
    </button>

  </div>

  {/* BODY */}
  <div className="p-6 space-y-6">

    {/* ================= TABLE ================= */}
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
        <div>
          <h3 className="font-semibold text-slate-800">
            Invoice / PO Details
          </h3>
        </div>
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-slate-700">
      Receipt No
    </label>

    <input
      type="text"
      value={form.receipt_number || ""}
      onChange={(e) =>
        setForm(prev => ({
          ...prev,
          receipt_number: e.target.value
        }))
      }
      placeholder="Enter receipt number"
      className="px-3 py-2 border rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>

      </div>

      <div className="overflow-auto">

        <table className="w-full text-sm">

          <thead className="bg-slate-100 text-slate-700">

            <tr>

              <th className="p-3 border-b text-center">#</th>
              <th className="p-3 border-b text-left">Date</th>
              <th className="p-3 border-b text-left">Doc No</th>
              <th className="p-3 border-b text-left">Product</th>
              <th className="p-3 border-b text-right">Amount</th>
              <th className="p-3 border-b text-right">
                VAT Amount
              </th>
              <th className="p-3 border-b text-right">Total</th>
              {/* <th className="p-3 border-b text-center">Action</th> */}

            </tr>

          </thead>

          <tbody>
            
            {modalItems.map((item, i) => (
             
              <tr
                key={i}
                className={`hover:bg-blue-50/40 transition ${
                  item.isSelected ? "bg-blue-50/60" : ""
                }`}
              >

                {/* SNO */}
                <td className="p-3 border-b text-center font-medium">
                  {i + 1}
                </td>

                {/* DATE */}
                <td className="p-3 border-b min-w-[150px]">

                  <input
                    type="date"
                    value={
                      item.doc_date
                        ? new Date(item.doc_date)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    readOnly
                    onChange={(e) =>
                      handleItemChange(i, "doc_date", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />

                </td>

                {/* DOC NO */}
                <td className="p-3 border-b min-w-[160px]">

                  <input
                    value={item.doc_no}
                    onChange={(e) =>
                      handleItemChange(i, "doc_no", e.target.value)
                    }
                    readOnly
                    placeholder="Enter doc no"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />

                </td>

                {/* PRODUCT */}
                <td className="p-3 border-b min-w-[220px]">

                 <input
                
                  value={item.product || ""}
                  onChange={(e) =>
                    handleItemChange(i, "product", e.target.value)
                  }
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
                />

                </td>

                {/* AMOUNT */}
                <td className="p-3 border-b min-w-[140px]">

                  <input
                    type="number"
                    step="0.01"
                    readOnly
                    value={Number(item.amount || 0).toFixed(2)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-right focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  />

                </td>

                {/* VAT */}
                <td className="p-3 border-b min-w-[140px]">

                  <input
                    value={Number(item.vat || 0).toFixed(2)}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-right font-medium"
                  />

                </td>

                {/* TOTAL */}
                <td className="p-3 border-b min-w-[150px]">

                  <input
                    value={Number(item.total_amount || 0).toFixed(2)}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-right font-semibold"
                  />

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
    {/* ================= REMARKS ================= */}
<div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-6 items-start">

  {/* Period */}
  <div className="flex items-center gap-3">
    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
      Period :
    </label>

  <input
  type="date"
  value={modalItems[0]?.period_start?.split("T")[0] || ""}
  onChange={(e) => {
    const value = e.target.value;

    setModalItems(prev =>
      prev.map(item => ({
        ...item,
        period_start: value,
      }))
    );
  }}
  className="w-30 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>

<span className="text-sm text-slate-600">to</span>

<input
  type="date"
  value={modalItems[0]?.period_end?.split("T")[0] || ""}
  onChange={(e) => {
    const value = e.target.value;

    setModalItems(prev =>
      prev.map(item => ({
        ...item,
        period_end: value,
      }))
    );
  }}
  className="w-30 px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
  </div>

  {/* Remarks */}
  <div className="flex flex-1 gap-3">
    <label className="text-sm font-medium text-slate-700 mt-2 whitespace-nowrap">
      Remarks :
    </label>

    <textarea
      value={form.remarks || ""}
      onChange={(e) =>
        setForm((prev) => ({
          ...prev,
          remarks: e.target.value,
        }))
      }
      rows={2}
      placeholder="Enter remarks"
      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>

</div>
    {/* ================= APPROVAL ================= */}
  <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">

 <div className="px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-indigo-50 flex items-center justify-between">

  <h3 className="font-semibold text-slate-800">
    Approval Workflow
  </h3>

  <label className="flex items-center gap-3 cursor-pointer select-none">

    <span className="text-sm font-medium text-slate-700">
      Advertising
    </span>

    <div className="relative">
      <input
        type="checkbox"
        checked={isAdvertising}
        onChange={(e) => setIsAdvertising(e.target.checked)}
        className="sr-only peer"
      />

      <div
        className="
          w-12 h-6
          bg-slate-300
          rounded-full
          transition-all duration-300
          peer-checked:bg-indigo-600
        "
      />

      <div
        className="
          absolute top-0.5 left-0.5
          w-5 h-5
          bg-white
          rounded-full
          shadow-md
          transition-all duration-300
          peer-checked:translate-x-6
        "
      />
    </div>

  </label>

</div>

<div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

  {[
    // { label: "Paid By", key: "paid_by" },
    { label: "Prepared By", key: "prepared_by" },
    { label: "Checked By Marketting", key: "checked_by" },
    { label: "Verified By IT", key: "verified_by_it" },
    { label: "Verified By Accounts", key: "verified_by" },
    { label: "Signed By", key: "signed_by" },
    { label: "Approved By", key: "approved_by" }
  ].map((field, idx) => (

    <div key={idx}>
      <label className="text-xs font-medium text-slate-500 mb-1 block">
        {field.label}
      </label>

     <input
  value={
    field.key === "prepared_by"
      ? (activeUserName || "")
      : (form[field.key] ?? "")
  }
  readOnly={field.key === "prepared_by"}
  disabled={field.key === "checked_by" && !isAdvertising}
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      [field.key]: e.target.value,
    }))
  }
  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none
    ${
      field.key === "checked_by" && !isAdvertising
        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
        : "bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
    }`}
/>
    </div>

  ))}

</div>

</div>

  </div>

  {/* FOOTER */}
  <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-6 py-4 flex justify-end gap-3 rounded-b-[26px]">

    <button
      onClick={() => setShowGenerateModal(false)}
      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-sm"
    >
      Cancel
    </button>

     <button
      onClick={handleDraftPreviewFromModal}
      className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-sm"
    >
      Preview
    </button>

    <button
      onClick={handleGenerate}
      className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md text-sm font-medium"
    >
      Save & Generate
    </button>

  </div>

</div>

  </div>

)}

<ConfirmModal
  open={confirmOpen}
  title={confirmData.title}
  message={confirmData.message}
  confirmText={confirmData.confirmText}
  type={confirmData.type}
  onClose={() => setConfirmOpen(false)}
  onConfirm={async () => {
    await confirmData.action?.();
    setConfirmOpen(false);
  }}
/>
                  

                </div>
            </div>
         <div ref={printRef} className="hidden print:block">
          
  <PrintableTable
    columns={columns}
    finalRows={finalRows}
    printModuleName={printModuleName}
    module={module}
    groupBy={groupBy}
  />
</div>
 <ConfirmModal
  open={confirmOpen}
  title={confirmData.title}
  message={confirmData.message}
  confirmText={confirmData.confirmText}
  cancelText={confirmData.cancelText}
  type={confirmData.type}
  onClose={() => setConfirmOpen(false)}
  onConfirm={confirmData.onConfirm}
/>
{showReportHeaderModal && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
    <div className="w-[520px] rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">

      {/* HEADER */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">
          Report Header Settings
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          This header will be used for Print, Excel and PDF.
        </p>
      </div>

      {/* BODY */}
   {/* BODY */}
<div className="p-6 space-y-4">

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Main Header
    </label>

    <input
      type="text"
      value="ABDULWAHED BIN SHABIB GROUP"
      readOnly
      className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
    />
  </div>

  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Sub Header
    </label>

    <input
      type="text"
      value={printModuleName}
      onChange={(e) => setPrintModuleName(e.target.value)}
      placeholder="Enter report title"
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>

</div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">

        <button
          onClick={() => {
            setShowReportHeaderModal(false);
            setReportActionType(null);
          }}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          onClick={() => {
          localStorage.setItem("print_custom_header", "ABDULWAHED BIN SHABIB GROUP");
localStorage.setItem("print_module_name", printModuleName || "");

            setShowReportHeaderModal(false);

            if (reportActionType === "print") {
              handlePrint();
            }

            if (reportActionType === "excel") {
              handleExcel();
            }

            if (reportActionType === "pdf") {
              handlePdf();
            }

            setReportActionType(null);
          }}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Continue
        </button>

      </div>

    </div>
  </div>
)}
{showPreview && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

    <div className="w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">

      {/* CLOSE BUTTON */}
      {/* <div className="flex justify-end p-3 border-b">
        <button
          onClick={() => setShowPreview(false)}
          className="px-3 py-1 text-sm rounded-md border hover:bg-gray-100"
        >
          Close
        </button>
      </div> */}

      {/* YOUR COMPONENT */}
      <PaymentRequestPreview
        data={previewData}
        disablePrint={previewFromGenerateModal}
         onBack={() => {
          setShowPreview(false);
          if (previewFromGenerateModal) {
            setShowGenerateModal(true);
            return;
          }
         // loadModule(); // <-- refresh table data after closing preview
        }}
      />

    </div>

  </div>
)}

{previewPdfUrl && (
  <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-5">
    <div className="bg-white w-[90vw] h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800">Uploaded PDF Preview</h3>

        <button
          onClick={() => setPreviewPdfUrl("")}
          className="p-2 rounded-md hover:bg-red-50 text-red-600"
        >
          <X size={20} />
        </button>
      </div>

      <iframe
        src={previewPdfUrl}
        title="Uploaded PDF Preview"
        className="w-full flex-1"
      />
    </div>
  </div>
)}

        </div>



    );
}