import { useEffect, useState, useRef, act, use } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, exportColumnNames, importTable, getMasterValues, currencises, exportPdf, getProviderPlans,upsertSavedFilter, getCustomizedColumns, upsertCustomizedColumns, getMasterData, addMasterData, cancelModuleRow, undoCancelModuleRow, getVatPercentage, getLastPRFNumber, createprf, getApprovalWorkflow, getPreviewPRF  } from "../../api/api";
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

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";

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
    const userRole = activeUser?.role;
    const [vatPercent, setVatPercent] = useState(0);
    const [providerPlansMap, setProviderPlansMap] = useState({});
    const [providerPlans, setProviderPlans] = useState([]);
    const [autoFilledFields, setAutoFilledFields] = useState({});
    const [planManuallyChanged, setPlanManuallyChanged] = useState(false);
    const [groupBy, setGroupBy] = useState("service");
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
    const [serviceProviders, setServiceProviders] = useState([]);
    const [creditCards, setCreditCards] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [modalItems, setModalItems] = useState([]);
    const [prfNumber, setPrfNumber] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [workflow, setWorkflow] = useState({});
    const [availableProducts, setAvailableProducts] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc", });
    const configOrder = mainTableConfig[module.module_name];
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [showActions, setShowActions] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const tableContainerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isAdvertising, setIsAdvertising] = useState(false);
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
    
    let orderedColumns = columns;
if (configOrder) {
  orderedColumns = [...columns].sort(
    (a, b) => configOrder.indexOf(a.column_name) - configOrder.indexOf(b.column_name)
  );
}
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
        getMasterData("services", activeUserEmail).then(res => {
        const result = Array.isArray(res?.data) ? res.data : [];
        setServiceTypes(result);
      //  console.log("Service Types:", result);
      });
        getMasterData("credit_card", activeUserEmail).then(res => {
        const result = Array.isArray(res?.data) ? res.data : [];
        setCreditCards(result);
      //  console.log("Credit Cards:", result);
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

  const oldIndex = columns.findIndex((c) => c.column_name === active.id);
  const newIndex = columns.findIndex((c) => c.column_name === over.id);

  const reordered = arrayMove(columns, oldIndex, newIndex);

  setColumns(reordered);

  // Keep only previously selected columns, but in new order
  setTempSelectedColumns((prev) =>
    reordered
      .map((c) => c.column_name)
      .filter((name) => prev.includes(name))
  );
};

const [dateFilters, setDateFilters] = useState(getCurrentMonth());

const isFilterActive = search || filters?.length > 0 

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

const saveColumnSelection = async () => {
  try {

    // 1️⃣ Save to DB (use TEMP state)
    console.log("Saving columns for module", currentModule?.module_id, ":", tempSelectedColumns);
    await upsertCustomizedColumns(
      currentModule?.module_id,
      activeUserEmail,
      tempSelectedColumns
    );

    // 2️⃣ Commit TEMP → LIVE
    setSelectedColumns(tempSelectedColumns);
    setSavedTableColumns(tempSelectedColumns);

    // 3️⃣ UI updates
    setShowColumnSelector(false);
    setTableColumnMode("custom");

  } catch (err) {
    console.error("Failed to save customized columns:", err);
  }
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

const handleSort = (columnName) => {
  let direction = "asc";

  if (
    sortConfig.key === columnName &&
    sortConfig.direction === "asc"
  ) {
    direction = "desc";
  }

  setSortConfig({
    key: columnName,
    direction,
  });
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

    return res?.data?.data?.columns || [];

  } catch (err) {
    console.error("Failed to load customized columns:", err);
    return [];
  }
};

useEffect(() => {
let active = true;

const initSavedColumns = async () => {
const cols = await fetchCustomizedColumns();
if (!active) return;

if (cols.length > 0) {
setSavedTableColumns(cols);
setSelectedColumns(cols);
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
  console.log("Latest PRF from API:", latest);
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

const toFilterKey = (masterName, rawVal) => {
  const input = String(rawVal ?? "").trim().toLowerCase();
  if (!input) return rawVal;

  if (masterName === "currency") {
    const hit = currencies.find((c) => {
      const code = String(c.currency_code ?? "").trim().toLowerCase();
      const name = String(c.currency ?? "").trim().toLowerCase();
      return code === input || name === input;
    });

    return hit?.currency_code ?? rawVal;
  }

  const options = masterDataMap?.[masterName] || [];
  const hit = options.find((o) => {
    const key = String(o?.key ?? o?.id ?? o?.value ?? "").trim().toLowerCase();
    const val = String(o?.value ?? o ?? "").trim().toLowerCase();
    return input === key || input === val;
  });

  return hit ? (hit.key ?? hit.id ?? hit.value) : rawVal;
};

const saveFiltersAsKeys = filters.map((filter) => ({
  ...filter,
  values: (filter.values || []).map((val) => toFilterKey(filter.master, normalize(val))),
}));
const handleSaveFilter = async () => {
  if (!saveFilterName.trim()) {
    alert("Filter name is required");
    return;
  }

 const payload = {
  filterName: saveFilterName.trim(),
  userId: activeUser?.email,
  module_id: currentModule?.module_id,
  filterData: {
    search,
    filters: saveFiltersAsKeys,
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
  const amount = Number(newRow.total_amount);

  const currency =
    typeof newRow.currency === "object"
      ? newRow.currency?.value
      : newRow.currency;

  if (isNaN(amount) || !currency) return;


  const calc = calculateCost(
    amount,
    currency,
    newRow.term
  );

  if (calc == null || isNaN(calc)) return;

  setNewRow(prev => ({
    ...prev,
    total_amount_aed: calc.toFixed(2)
  }));

}, [newRow.amount, newRow.currency, newRow.term]);

useEffect(() => {
  if (!editRowId) return;
  if (!editRow.total_amount || !editRow.currency) return;
  const calc = calculateCost(
    editRow.total_amount,
    editRow.currency,
    editRow.term
  );

  if (calc === null) return;

  setEditRow(prev => ({
    ...prev,
    total_amount_aed: calc.toFixed(2)
  }));

}, [editRow.total_amount, editRow.currency, editRow.term]);

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

const masterList = Object.values(masterMap);

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

    

   const getVisibleColumns = () => {
  let cols = orderedColumns;

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
   if (tableColumnMode === "saved" && savedTableColumns.length) {
    cols = savedTableColumns
      .map(colName => columns.find(c => c.column_name === colName))
      .filter(Boolean);
  } else if (tableColumnMode === "custom" && selectedColumns.length) {
    cols = selectedColumns
      .map(colName => columns.find(c => c.column_name === colName))
      .filter(Boolean);
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
// console.log("selectedRow:", selectedRow);
// console.log("currencies:", currencies);

const rowCurrency = (
  Array.isArray(selectedRow)
    ? selectedRow[0]?.currency
    : selectedRow?.currency
)
  ?.toString()
  .trim()
  .toUpperCase();

//console.log("Row Currency:", rowCurrency);

const selectedCurrency = currencies.find((c) => {
  const currencyCode = (c.currency_code || "")
    .toString()
    .trim()
    .toUpperCase();

  const currencyName = (c.currency || "")
    .toString()
    .trim()
    .toUpperCase();

  return (
    currencyCode === rowCurrency ||
    currencyName === rowCurrency
  );
});

// console.log("Selected Currency:", selectedCurrency);
// console.log("Selected currency for PRF generation:", selectedCurrency);
const exchange_rate = selectedCurrency?.exchange_rate || 1;
//console.log("exchange_rate:", exchange_rate, "for currency:", selectedCurrency);
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
    exchange_rate,
    userid: activeUserEmail,
    is_advertising: isAdvertising ? 1 : 0,
  };

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

  setForm({
    receipt_number: "",
    prepared_by: "",
    checked_by: "",
    verified_by_it: "",
    verified_by: "",
    signed_by: "",
    approved_by: ""
  });
};

const handlePreview = async (prfNum) => {
  try {
    const res = await getPreviewPRF(prfNum);
    // The API returns: { data: [ { header, details } ] }
    const previewObj = Array.isArray(res.data) ? res.data[0] : res.data;
    console.log("API Response for preview:", res.data);
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

  setColumns(result);

  // console.log("🔥 Final Transformed Columns:", result);
};

    // ================= LOAD MODULE =================
const loadModule = async (
  overrideDateFilters = dateFilters
) => {
  try {
    setLoading(true);
    const res = await fetchSections();
    const mod = res.data.find(
      (m) => m.module_id == id
    );

    if (mod) {
      setModule(mod);

      const payload = {
        // search,
        filters: JSON.stringify(filters || []),
        dateFilters: JSON.stringify({
          date: {
            startDate:
              overrideDateFilters.startDate,
            endDate:
              overrideDateFilters.endDate,
          },
        }),
      };

      const dataRes = await getModuleData(
        id,
        activeUserEmail,
        payload,
        userRole
      );
      console.log("userRole:", userRole);
      setRows(dataRes.data || []);

      setColumns(
        (mod?.columns || []).filter(
          (c) => c.is_active !== false
        )
      );
    }
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const isGenerated = rows.some(r => !!r.prf_generate);
//console.log("Is Generated row:", isGenerated);

useEffect(() => {
  loadModule();
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

const getMasterOptions = (col, searchText = "") => {

  const selectedVendor =
    newRow?.vendors || editRow?.vendors || null;
//console.log("Selected vendor for master options:", selectedVendor);
// console.log("newRow:", newRow?.vendors, "editRow:", editRow?.vendors);

if (col.column_name === "products") {
  const selectedVendorValue = String(selectedVendor || "")
    .trim()
    .toLowerCase();

  const currentProductValue = String(
    newRow?.products || editRow?.products || ""
  )
    .trim();

  let products = [];

  if (selectedVendorValue && serviceProviders?.length) {
    products = serviceProviders.filter((sp) => {
      const vendorCode = String(sp.vendor || "")
        .trim()
        .toLowerCase();

      // If vendor_name is missing in products, resolve from vendors master
      const vendorNameFromMaster =
        vendors.find(
          (v) =>
            String(v.vendor_code || "").trim().toLowerCase() === vendorCode
        )?.vendor_name || "";

      const vendorName = String(
        sp.vendor_name || vendorNameFromMaster || ""
      )
        .trim()
        .toLowerCase();

      return (
        selectedVendorValue === vendorCode ||
        selectedVendorValue === vendorName
      );
    });

    // Fallback: if selected vendor has no mapped products, show all products
    if (products.length === 0) {
      products = [...serviceProviders];
    }
  } else if (serviceProviders?.length) {
    products = [...serviceProviders];
  }

  const unique = products.filter(
    (item, index, self) =>
      index === self.findIndex((p) => p.product_code === item.product_code)
  );

  let mapped = unique.map((sp) => ({
    key: sp.product_code,
    value: sp.product,
  }));

  // Keep current value visible in edit/create even if not in mapped list
  if (
    currentProductValue &&
    !mapped.some(
      (o) =>
        String(o.value || "").toLowerCase() === currentProductValue.toLowerCase() ||
        String(o.key || "").toLowerCase() === currentProductValue.toLowerCase()
    )
  ) {
    mapped = [
      { key: currentProductValue, value: currentProductValue },
      ...mapped,
    ];
  }

  return mapped;
}

if (col.column_name === "product_types") {

 // console.log("editRow.products", editRow.products);
  const selectedProduct =
    newRow?.products ||
    editRow?.products ||
    null;
    


  // =========================
  // FILTER SERVICES BY PRODUCT
  // =========================
  if (selectedProduct && serviceProviders?.length) {

    // Find provider rows matching selected product code
const matchedProviders = serviceProviders.filter((sp) => {
  const selected = String(selectedProduct || "").trim().toLowerCase();

  const code = String(sp.product_code || "").trim().toLowerCase();
  const name = String(sp.product || "").trim().toLowerCase();

  return selected === code || selected === name;
});


    // Get service codes
    const serviceIds = matchedProviders.map(
      sp => String(sp.services)
    );

   

    // Match service master
    const matchedServices = serviceTypes.filter(
      st =>
        serviceIds.includes(
          String(st.service_code)
        )
    );

  

    // Remove duplicates by service_code
    const uniqueServices = matchedServices.filter(
      (item, index, self) =>
        index ===
        self.findIndex(
          s =>
            s.service_code ===
            item.service_code
        )
    );

    return uniqueServices.map(st => ({
      key: st.service_code,   // S01
      value: st.service_name // Subscriptions
    }));
  }

  // =========================
  // FALLBACK ALL SERVICES
  // =========================
  return serviceTypes.map(st => ({
    key: st.service_code,    // S01
    value: st.service_name   // Subscriptions
  }));
}

  // ================= BASE OPTIONS =================
  let options = [];

  if (col.master && masterDataMap?.[col.master]) {
    options = [...masterDataMap[col.master]];
  }

  if (col.master1 && masterDataMap?.[col.master1]) {
    options = [...options, ...masterDataMap[col.master1]];
  }

  // ================= REMOVE DUPLICATES =================
  options = options.filter(
    (item, index, self) =>
      index === self.findIndex(
        t => t.id === item.id
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

  return options;
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
  console.log("SETTING PRODUCT TYPE:", normalized);
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
      updated.term = normalized;
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
    console.log("Auto-selecting plan:", firstPlan);
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
        console.log("NEW ROW AT SAVE:", newRow);
        console.log("Original payload before processing:", payload);
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
  setLoading(true);
  setConfirmData({
    title: "Cancel Record",
    message: "Are you sure you want to cancel this record?",
    confirmText: "Yes, Cancel",
    type: "warning",
    onConfirm: async () => {
      try {
        await cancelModuleRow(id, row.id, activeUserEmail);
        setLoading(false);
        setPopupMessage("Record cancelled successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
        console.error(err);
        setPopupMessage("Error cancelling record");
        setPopupType("error");
      }
      setLoading(false);
      setConfirmOpen(false); // Always close modal
    }
  });
  setConfirmOpen(true);
};

const handleUndoCancelRow = (row) => {
  setLoading(true);
  setConfirmData({
    title: "Undo Cancellation",
    message: "Do you want to restore this cancelled record?",
    confirmText: "Restore",
    type: "info",
    onConfirm: async () => {
      try {
        await undoCancelModuleRow(id, row.id, activeUserEmail);
        setLoading(false);
        setPopupMessage("Record restored successfully");
        setPopupType("success");
        loadModule();
      } catch (err) {
          setLoading(false);
        console.error(err);
        setPopupMessage("Error restoring record");
        setPopupType("error");
      }
      setConfirmOpen(false); // Always close modal
    }
  });
  setConfirmOpen(true);
};
const handleExcel = async (mode, savedCols = null, groupBy) => {
  const cols = getExcelColumns(mode, savedCols);
  //console.log("Excel export columns:", cols);
  const company = localStorage.getItem("print_company") || "";
  const moduleName =
    printModuleName ||
    localStorage.getItem("print_module_name") ||
    module?.display_name;

  const formattedRows = finalRows.map((row, index) => {
    const newRow = {
      SNo: index + 1,
      __groupKey: getGroupKey(row, groupBy) // ✅ ADD THIS
    };
    //console.log("Formatting row for Excel with groupBy:", groupBy, "Row:", row);

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
    moduleName,
    groupBy // ✅ PASS IT
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
            loadModule(); // refresh table after import
        } catch (err) {
            console.error(err);
            alert("Import failed ❌");
        }
    };
     
const handleClear = async () => {
  const defaults = getCurrentMonth();

  setDateFilters(defaults);

  const payload = {
    search,
    filters: JSON.stringify(filters || []),
    dateFilters: JSON.stringify(buildDatePayload(defaults)),
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

    const handlePrint = (mode, savedCols = [], groupBy) => {
    const cols = getColumnsToUse(mode, savedCols);
   // console.log("Print columns:", cols);
    openPrintWindow({
        content: generateTableHTML(cols),
        userName: activeUser?.name || "User",
        groupBy,
    });
    setColumns(cols); // Ensure columns are set for the print view
    setShowPrintModal(false);
    };

   

// const handlePrint = (
//   mode = "default",
//   customCols = null
// ) => {

//   if (!printRef.current) return;

//   let cols;

//   if (customCols && Array.isArray(customCols)) {

//     cols = columns.filter(col =>
//       customCols.includes(col.column_name)
//     );

//   } else {

//     cols = getColumnsToUse(mode);

//   }

//   openPrintWindow({
//     content: printRef.current.innerHTML,
//     userName: activeUser?.email || "User",
//     groupBy,
//     columns: cols
//   });
// };

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

const finalRows = filtered.filter(row => {
  const searchNorm = normalizeString(search);
  //console.log("Filtering row with search:", searchNorm);
  return visibleColumns.some(col => {
    const val = row[col.column_name];
    //console.log(`Checking column "${col.column_name}" with value:`, val);
    const cellNorm = normalizeString(
      typeof val === "object" ? val?.value ?? "" : val ?? ""
    );
    const searchresult = cellNorm.includes(searchNorm);
    //console.log("Search result for column", col.column_name, ":", searchresult);
    return searchresult;
  });
});

    const normalizedRows = finalRows.map(row => {
  const currency = (row.currency || "").toLowerCase();

  return {
    ...row,
    [`amount_${currency}`]: row.amount
  };
});


    // ================= PAGINATION =================
    const totalPages = Math.ceil(normalizedRows.length / pageSize);

//     const sortedRows = [...rows].sort((a, b) => {
//   if (!sortConfig.key) return 0;

//   let aValue = a[sortConfig.key];
//   let bValue = b[sortConfig.key];

//   // normalize object values
//   aValue =
//     typeof aValue === "object"
//       ? aValue?.value ?? ""
//       : aValue ?? "";

//   bValue =
//     typeof bValue === "object"
//       ? bValue?.value ?? ""
//       : bValue ?? "";

//   // numeric sort
//   if (!isNaN(aValue) && !isNaN(bValue)) {
//     return sortConfig.direction === "asc"
//       ? Number(aValue) - Number(bValue)
//       : Number(bValue) - Number(aValue);
//   }

//   // string sort
//   return sortConfig.direction === "asc"
//     ? String(aValue).localeCompare(String(bValue))
//     : String(bValue).localeCompare(String(aValue));
// });

  

    const handlePdf = async (mode, customCols = null, groupBy= "service" ) => {
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
                userName: activeUser?.name || "User",

                // ✅ SEND BOTH TO BACKEND
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

  if (!search) {

    return true;
  }

  const searchNorm =
    normalizeString(search);



  const searchMatch =
    visibleColumns.some(
      (col, cIndex) => {

        const val =
          row[col.column_name];

        const cellNorm =
          normalizeString(
            typeof val === "object"
              ? val?.value ?? ""
              : val ?? ""
          );

        const match =
          cellNorm.includes(searchNorm);

   
        return match;
      }
    );



  return searchMatch;
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

const getGroupKey = (row, groupBy = "service") => {

  const normalize = (v) =>
    String(v || "")
      .replace(/^product\s*types?:?\s*/i, "") // removes "Product Types:"
      .trim();

  if (groupBy === "terms") {
    return normalize(
      row.term?.value ||
      row.term ||
      "UNKNOWN"
    );
  }

  // DEFAULT → PRODUCT TYPES
  return normalize(
    row.product_types?.value ||
    row.product_types ||
    "UNKNOWN"
  );
};

const groupedRows = finalRows.reduce((acc, row) => {

  const key = getGroupKey(row, groupBy); // 👈 dynamic

  if (!acc[key]) acc[key] = [];

  acc[key].push(row);

  return acc;

}, {});

const grandTotals = {};

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

  ${Object.entries(groupedRows).map(([serviceType, rows]) => {

    // ================= GROUP TOTALS =================
    const groupTotals = {};

    sortedCols.forEach(col => {
      if (isTotalColumn(col)) {
        groupTotals[col.column_name] = rows.reduce((sum, row) => {
          return sum + toNumber(row[col.column_name]);
        }, 0);

        // add to grand total
        grandTotals[col.column_name] =
          (grandTotals[col.column_name] || 0) +
          groupTotals[col.column_name];
      }
    });

    const firstTotalIndex = sortedCols.findIndex(isTotalColumn);

    return `
      <div style="margin-bottom:40px; text: 5px;">

        <!-- GROUP TITLE -->
        <h3 style="margin:10px 0; text-align:center;">
          ${serviceType}
        </h3>

        <table border="1" cellspacing="0" cellpadding="5"
          style="width:100%; border-collapse:collapse;">

          <!-- HEADER -->
          <thead>
            <tr>
              <th style="text-align:center">S.No</th>
              ${sortedCols.map(col => `
                <th>${col.display_name}</th>
              `).join("")}
            </tr>
          </thead>

          <!-- BODY -->
          <tbody>

            ${rows.map((row, index) => `
              <tr>
                <td style="text-align:center">${index + 1}</td>

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

                  if (isNumericColumn(col) || col.isDynamicCurrency) {
                    return `
                      <td style="text-align:right">
                        ${value === "" ? "" : toNumber(value) === 0 ? "-" : formatNumber(value)}
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

            <!-- ================= GROUP TOTAL ROW ================= -->
            <tr style="font-weight:bold; background:#f5f5f5;">

              <td></td>

              <!-- 🔥 TOTAL LABEL BEFORE FIRST TOTAL COLUMN -->
              <td colspan="${firstTotalIndex > 0 ? firstTotalIndex : 1}" style="text-align:right;">
                TOTAL
              </td>

              <!-- TOTAL VALUES -->
              ${sortedCols.slice(firstTotalIndex).map(col => {

                if (!isTotalColumn(col)) {
                  return `<td></td>`;
                }

                return `
                  <td style="text-align:right;">
                    ${groupTotals[col.column_name] === 0
                      ? "-"
                      : formatNumber(groupTotals[col.column_name] || 0)}
                  </td>
                `;
              }).join("")}

            </tr>

          </tbody>

        </table>

      </div>
    `;
  }).join("")}

 <!-- ================= GRAND TOTAL (INLINE STYLE) ================= -->

<table border="1" cellspacing="0" cellpadding="5"
  style="width:100%; margin-top:30px; border-collapse:collapse;">

  <tbody>

    <tr style="font-weight:bold; background:#ddd;">

      <td></td>

      <!-- LABEL BEFORE FIRST TOTAL COLUMN -->
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

  const paginatedRows = filteredRows.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const sortedRows = [...paginatedRows].sort(
  (a, b) => {

    if (!sortConfig.key) return 0;

    let aValue =
      a[sortConfig.key];

    let bValue =
      b[sortConfig.key];

    // =========================
    // OBJECT VALUE NORMALIZE
    // =========================

    aValue =
      typeof aValue === "object"
        ? aValue?.value ?? ""
        : aValue ?? "";

    bValue =
      typeof bValue === "object"
        ? bValue?.value ?? ""
        : bValue ?? "";

 

    // =========================
    // NUMERIC SORT
    // =========================

    if (
      !isNaN(aValue) &&
      !isNaN(bValue)
    ) {

      return sortConfig.direction === "asc"
        ? Number(aValue) -
            Number(bValue)
        : Number(bValue) -
            Number(aValue);
    }

    // =========================
    // STRING SORT
    // =========================

    return sortConfig.direction ===
      "asc"
      ? String(aValue).localeCompare(
          String(bValue)
        )
      : String(bValue).localeCompare(
          String(aValue)
        );
  }
);

    const handleGenerateSelected = () => {
  // Get the selected rows' data
 const selectedRows = sortedRows.filter(
  (row) => selectedRowIds.includes(row.id) && !isPrfBlockedProductType(row.product_types)
);
  if (selectedRows.length === 0) return;
  // setSelectedRow(selectedRows[0] || null);
  setSelectedRow(selectedRows);
  // If you want to show all products from selected rows in the modal:
  console.log("Preparing row for modal:", selectedRows);
  setModalItems(selectedRows.map(row => ({
    doc_date: row.date || "",
    doc_no: row.invoice_number || "",
    product: row.products || "",
    amount: row.amount || "",
    vat: row.vat_amount || "",
    total_amount: row.total_amount || "",
    isSelected: true,
  })));
  
  setShowGenerateModal(true);
};

function calculateRowTotals({ amount, currency, service_provider_id }) {
  const provider = serviceProviders.find(p => p.id === service_provider_id);
  console.log("Calculating totals for amount:", amount, "currency:", currency, "provider ID:", service_provider_id, "provider:", provider);
  const isVat = provider?.is_vat;
  const amt = Number(amount) || 0;
  const vat = isVat ? (amt * vatPercent) / 100 : 0;
  const total = amt + vat;

  // Find currency value (exchange rate)
  const currencyObj = currencies.find(c => c.code === currency);
  const currencyValue = currencyObj ? Number(currencyObj.value) : 1;
  const totalAed = total * currencyValue;
 // console.log("VAT:", vat, "Total:", total, "Total in AED:", totalAed, "Currency value:", currencyValue);

  return {
    vat_amount: vat.toFixed(2),
    total_amount: total.toFixed(2),
    total_amount_aed: totalAed.toFixed(2),
  };
}
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
  
  <PermissionButton
    user={activeUser}
    permission="add"
    onClick={handleCreate}
    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white 
               hover:bg-green-700 hover:shadow-md transition"
  >
    + New
  </PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="print"
    onClick={() => setShowPrintModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-gray-100 hover:border-gray-500 transition"
  >
    Print
  </PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="export"
    onClick={() => setShowExcelModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-green-50 hover:border-green-500 hover:text-green-600 transition"
  >
    Excel
  </PermissionButton>

  <PermissionButton
    user={activeUser}
    permission="export"
    onClick={() => setShowPdfModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition"
  >
    PDF
  </PermissionButton>

  <button
    onClick={() => setShowTableColumnModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
  >
    Customize
  </button>

  <button
    className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
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

  {/* ================= MOBILE ================= */}
  <div className="md:hidden">

    {/* Search + Toggle */}
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Search records..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 border px-3 py-2 rounded-lg"
      />

   <button
  onClick={() => setShowMobileFilters(!showMobileFilters)}
  className={`flex items-center justify-between w-full px-4 py-2 rounded-xl shadow-sm transition-all ${
    showMobileFilters
      ? "bg-gradient-to-r from-pink-200 to-indigo-400 text-white"
      : "bg-white border border-slate-200"
  }`}
>

  <span
    className={`transition-transform ${
      showMobileFilters ? "rotate-180" : ""
    }`}
  >
    ▼
  </span>
</button>
    </div>

    {/* Drawer */}
    {showMobileFilters && (
  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">

    {/* Header */}
    <div className="bg-gradient-to-r from-pink-200 to-indigo-400 px-4 py-3">
      <h3 className="text-black font-semibold text-sm">
        Filters & Date Range
      </h3>
    </div>

    <div className="p-4 space-y-4">

      {/* Filters */}
      <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
        <TableFilters
          masterList={masterList}
          filters={filters}
          setFilters={setFilters}
          currencies={currencies}
          masterDataMap={masterDataMap}
          setMasterDataMap={setMasterDataMap}
        />
      </div>

      {/* Save Filter */}
      {isFilterActive && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Save current filter..."
            value={saveFilterName}
            onChange={(e) => setSaveFilterName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <button
            onClick={handleSaveFilter}
            disabled={!saveFilterName.trim()}
            className={`w-full rounded-xl py-2 text-sm font-medium text-white transition ${
              saveFilterName.trim()
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            Save Filter
          </button>
        </div>
      )}

      {/* Date Range */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Date Range
        </label>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            name="startDate"
            value={dateFilters.startDate}
            onChange={onInputChange}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50"
          />

          <input
            type="date"
            name="endDate"
            value={dateFilters.endDate}
            onChange={onInputChange}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-slate-50"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">

        <button
          onClick={applyDateFilter}
          className="rounded-xl bg-green-600 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
        >
          Apply
        </button>

        <button
          onClick={handleClear}
          className="rounded-xl bg-red-500 py-2 text-sm font-medium text-white shadow hover:bg-red-600"
        >
          Clear
        </button>

        <button
          onClick={() =>
            setActiveDateFilter(
              activeDateFilter === "custom" ? null : "custom"
            )
          }
          className={`rounded-xl py-2 text-sm font-medium shadow ${
            activeDateFilter === "custom"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          Custom
        </button>

      </div>

    </div>
  </div>
)}
  </div>

  {/* ================= DESKTOP ================= */}
  <div className="hidden md:flex flex-wrap items-center gap-3">

    <input
      type="text"
      placeholder="Search records..."
      className="border px-3 py-2 rounded-lg w-64"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />

    <TableFilters
      masterList={masterList}
      filters={filters}
      setFilters={setFilters}
      currencies={currencies}
      masterDataMap={masterDataMap}
      setMasterDataMap={setMasterDataMap}
    />

    {isFilterActive && (
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border">
        <input
          type="text"
          placeholder="Enter filter name (required)"
          value={saveFilterName}
          onChange={(e) => setSaveFilterName(e.target.value)}
          className="border px-2 py-1 rounded text-sm w-52"
        />

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

    <div className="flex gap-3 items-center">
      <input
        type="date"
        name="startDate"
        value={dateFilters.startDate}
        onChange={onInputChange}
        className="border rounded px-3 py-2 bg-slate-50 w-[150px]"
      />

      <span className="text-gray-500">to</span>

      <input
        type="date"
        name="endDate"
        value={dateFilters.endDate}
        onChange={onInputChange}
        className="border rounded px-3 py-2 bg-slate-50 w-[150px]"
      />
    </div>

    <button
      onClick={applyDateFilter}
      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
    >
      Apply
    </button>

    <button
      onClick={handleClear}
      className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
    >
      Clear
    </button>

    <button
      onClick={() =>
        setActiveDateFilter(
          activeDateFilter === "custom" ? null : "custom"
        )
      }
      className={`px-3 py-2 border rounded-lg text-sm hover:bg-gray-100 ${
        activeDateFilter === "custom" ? "bg-gray-100" : ""
      }`}
    >
      Custom Range
    </button>

    {/* Desktop only Pagination */}
    <div className="flex items-center gap-2 text-sm ml-4">
      <button
        disabled={page === 1}
        onClick={() => setPage((p) => p - 1)}
        className="px-3 py-1 border rounded disabled:opacity-40"
      >
        Prev
      </button>

      <span className="text-gray-600">
        {page} / {totalPages || 1}
      </span>

      <button
        disabled={page === totalPages}
        onClick={() => setPage((p) => p + 1)}
        className="px-3 py-1 border rounded disabled:opacity-40"
      >
        Next
      </button>
    </div>

    {/* Desktop only Total */}
    <span className="text-sm text-gray-500 ml-auto">
      Total: {finalRows.length}
    </span>

  </div>

</div>
          
{activeDateFilter && isMobile && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
    
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-gray-800">
          Select Date Range
        </h3>

        <button
          onClick={() => setActiveDateFilter(null)}
          className="text-gray-500 text-lg"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <DateOnlyFilter
          onApply={(range) => {
            if (!range?.start || !range?.end) return;

            const updatedFilters = {
              startDate: range.start,
              endDate: range.end,
            };

            setDateFilters(updatedFilters);
            setActiveDateFilter(null);
            loadModule(updatedFilters);
          }}
        />
      </div>

    </div>

  </div>
)}
 {activeDateFilter && !isMobile && (
  <div className="mb-4">
    <DateOnlyFilter
      onApply={(range) => {
        if (!range?.start || !range?.end) return;

        const updatedFilters = {
          startDate: range.start,
          endDate: range.end,
        };

        setDateFilters(updatedFilters);
        setActiveDateFilter(null);
        loadModule(updatedFilters);
      }}
    />
  </div>
)}

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
                     setFilters(prev =>
                        prev.map((item, index) => {
                          if (index !== i) return item;

                          const current =
                            (item.values || []).map(normalize);

                          return {
                            ...item,
                            values: checked
                              ? current.filter(v => v !== label)
                              : [...current, label],
                          };
                        })
                      );
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
            <div className="flex items-center gap-2 text-sm ml-4 mb-3 bg-white px-3 py-2 rounded-lg shadow-sm border">

  {/* FIRST */}
  <button
    disabled={page === 1}
    onClick={() => setPage(1)}
    className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title="First Page"
  >
    ⏮
  </button>

  {/* PREV */}
  <button
    disabled={page === 1}
    onClick={() => setPage((p) => Math.max(p - 1, 1))}
    className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title="Previous"
  >
    ◀
  </button>

  {/* PAGE INFO */}
  <div className="px-3 py-1 rounded-md bg-gray-50 border text-gray-700 font-medium">
    {page} / {totalPages || 1}
  </div>

  {/* NEXT */}
  <button
    disabled={page === totalPages}
    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
    className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title="Next"
  >
    ▶
  </button>

  {/* LAST */}
  <button
    disabled={page === totalPages}
    onClick={() => setPage(totalPages)}
    className="px-3 py-1 rounded-md border hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
    title="Last Page"
  >
    ⏭
  </button>

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
                    <table className="min-w-max w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 border-b text-left">S.No</th> 
                                {visibleColumns.map(col => (
                                   <th
                                      key={col.column_id}
                                      onClick={() => handleSort(col.column_name)}
                                      className={`${getAlignClass(
                                        col.display_name
                                      )} px-4 py-3 whitespace-nowrap border-b cursor-pointer select-none hover:bg-gray-200`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <span>{col.display_name}</span>

                                        {sortConfig.key === col.column_name ? (
                                          sortConfig.direction === "asc" ? (
                                            <span>▲</span>
                                          ) : (
                                            <span>▼</span>
                                          )
                                        ) : (
                                          <span className="text-gray-400">↕</span>
                                        )}
                                      </div>
                                    </th>
                                ))}

                                <th className="px-4 py-3 border-b text-right">Actions</th>
                            </tr>
                        </thead>

                        {/* TABLE BODY */}
                    <tbody className="divide-y">
                      {isCreating && (
                        <tr className="bg-blue-50">
                          <td className="px-4 py-3 whitespace-nowrap"></td>

                          {visibleColumns.map((col) => {

                            const isMaster = !!col.master;

                            const isDate =
                              col.data_type?.toLowerCase().includes("date");

                            const isAmount =
                              col.data_type?.toLowerCase().includes("decimal");

                            // =========================
                            // DISPLAY VALUE
                            // =========================
                            const fieldValue = inputValues[col.column_name];

                            const displayValue =
                              typeof fieldValue === "object"
                                ? fieldValue.value
                                : fieldValue ??
                                  newRow[col.column_name] ??
                                  "";

                            return (

                              <td
                                key={col.column_id}
                                className={`
                                  px-4 py-2 whitespace-nowrap
                                  ${getAlignClass(col.display_name)}
                                  ${col.column_name === "company"
                                    ? "min-w-[450px]"
                                    : ""
                                  }
                                `}
                              >

                                <div className="relative">

                                  {/* ================= INPUT ================= */}
                                  <input
                                    autoComplete="off"

                                    type={
                                      isNumericColumn(col)
                                        ? "number"
                                        : isDate
                                        ? "date"
                                        : "text"
                                    }

                                    className={`
                                      rounded-xl
                                      border border-gray-300
                                      bg-white
                                      px-3 py-2
                                      text-sm
                                      outline-none
                                      transition-all duration-200
                                      focus:border-blue-500
                                      focus:ring-4
                                      focus:ring-blue-100

                                      ${
                                        col.column_name === "company"
                                          ? "w-[450px]"
                                          : "w-full"
                                      }
                                    `}

                                    value={
                                      col.column_name === "total_amount_aed"
                                        ? newRow.total_amount_aed || ""
                                        : isDate
                                        ? formatForInput(displayValue)
                                        : displayValue
                                    }

                                    disabled={
                                      col.column_name === "total_amount_aed" ||
                                      col.column_name === "vat_amount" ||
                                      col.column_name === "total_amount" ||
                                      col.column_name === "prf_generate"
                                    }

                                    onChange={(e) => {

                                      let val = e.target.value;

                                      // =========================
                                      // NUMERIC
                                      // =========================
                                      if (isNumericColumn(col.column_name)) {
                                        val = handleNumericInput(val);
                                      }

                                      if (col.column_name === "amount") {

                        const totals = calculateRowTotals({
                          amount: val,
                          currency: newRow.currency,
                          service_provider_id: serviceProviders.find(sp => {
                            //console.log("sp", sp.product_code)
                            const matched = sp.product_code === (newRow.products?.value || newRow.products);
                            // console.log("Matched name for amount change:", serviceProviders.product, "with new row product:", newRow.products  );
                            if (matched) {
                            }
                            return matched;
                          })?.id
                        
                        });

                        setNewRow(prev => ({
                          ...prev,
                          amount: val,
                          vat_amount: totals.vat_amount,
                          total_amount: totals.total_amount,
                          total_amount_aed: totals.total_amount_aed
                        }));
                      }

                                      // =========================
                                      // MASTER FIELD
                                      // =========================
                                      if (isMaster) {

                        setInputValues(prev => ({
                          ...prev,
                          [col.column_name]: {
                            key: "",
                            value: val
                          }
                        }));

                        setActiveField(col.column_name);

                      }

                                      // =========================
                                      // NORMAL FIELD
                                      // =========================
                                      else {

                                        handleNewRowChange(
                                          col.column_name,
                                          val,
                                          col.master
                                        );

                                      }

                                    }}

                                    onFocus={() => {

                                      setActiveField(col.column_name);

                                      if (col.master) {
                                        fetchMasterDataForColumn(col.master);
                                      }

                                    }}

                                    onBlur={(e) => {

                                      if (isAmount && e.target.value !== "") {

                                        handleNewRowChange(
                                          col.column_name,
                                          Number(e.target.value).toFixed(2),
                                          col.master
                                        );

                                      }

                                      setTimeout(() => {
                                        setActiveField(null);
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

                                  {/* ================= MASTER DROPDOWN ================= */}
                                  {isMaster &&
                                    activeField === col.column_name &&
                                    loadingMaster !== col.master &&
                                    (() => {

                                      const typedValue =
                                        typeof inputValues[col.column_name] === "object"
                                          ? inputValues[col.column_name]?.value || ""
                                          : inputValues[col.column_name] || "";

                                      const rawOptions = getMasterOptions(
                                        col,
                                        typedValue,
                                        newRow
                                      );

                                      const filteredOptions =
                                        rawOptions.filter((option) => {

                                          const label =
                                            typeof option === "object"
                                              ? option.value
                                              : option;

                                          return String(label || "")
                                            .toLowerCase()
                                            .includes(
                                              typedValue.toLowerCase()
                                            );

                                        });

                                      return (

                                        <div className="
                                          absolute z-50 mt-2 w-full overflow-hidden
                                          rounded-2xl border border-gray-200
                                          bg-white shadow-xl
                                          max-h-64 overflow-y-auto
                                        ">

                                          {/* OPTIONS */}
                                          {filteredOptions.map((option, i) => {

                                            const label =
                                              typeof option === "object"
                                                ? option.value
                                                : option;

                                            return (

                                              <div
                                                key={i}

                                                className="
                                                  px-4 py-3
                                                  text-sm text-gray-700
                                                  cursor-pointer
                                                  hover:bg-blue-50
                                                  border-b border-gray-100
                                                "

                      onMouseDown={async () => {

                        const value =
                          typeof option === "object"
                            ? option.key ?? option.id ?? option.value
                            : option;

                        const label =
                          typeof option === "object"
                            ? option.value
                            : option;

                        // ✅ 1. update NEW ROW FIRST (source of truth)
                      setNewRow(prev => ({
                        ...prev,
                        [col.column_name]: value,
                        ...(col.column_name === "products"
                          ? { product_types: "" }
                          : {})
                      }));

                        // ✅ 2. UI state
                        setInputValues(prev => ({
                          ...prev,
                          [col.column_name]: { key: value, value: label }
                        }));

                        // ✅ 3. DB state
                      if (col.column_name === "product_types") {
                        console.log("PRODUCT TYPE SELECTED", option);
                      }
                        handleNewRowChange(col.column_name, value, col.master);

                        // ✅ 4. load dependent data
                        if (col.column_name === "products") {

                          const matchedProvider = serviceProviders.find(sp =>
                            String(sp.product || "").trim().toLowerCase() ===
                            String(label || "").trim().toLowerCase()
                          );

                          await loadProviderPlans(matchedProvider?.id);
                        }

                        setActiveField(null);
                      }}
                                              >

                                                {label}

                                              </div>

                                            );

                                          })}

                                          {/* EMPTY */}
                                          {filteredOptions.length === 0 && (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                              No results found
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

                            <button
                              onClick={handleSave}
                              className="
                                px-3 py-1.5 text-sm rounded-md
                                border border-blue-300 bg-white
                                hover:bg-blue-100 hover:border-blue-500
                                transition
                              "
                            >
                              Save
                            </button>

                            <button
                              onClick={handleCancel}
                              className="
                                px-3 py-1.5 text-sm rounded-md
                                border border-red-300 bg-white
                                hover:bg-red-100 hover:border-red-500
                                transition
                              "
                            >
                              Cancel
                            </button>

                          </td>

                        </tr>
                      )}
                      {sortedRows.map((row, i) => (
                        <tr
                          key={row.id ?? i}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          
                          {/* ================= SERIAL NO ================= */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(page - 1) * pageSize + i + 1}
                          </td>

                          {/* ================= COLUMNS ================= */}
                          {visibleColumns.map((col) => {

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
                              const raw = String(value);
                              const last4 = raw.slice(-4);

                              value = `**** **** **** ${last4}`;
                            }
                           if (col.column_name === "prf_generate") {

                              const val = row[col.column_name];
                              const disablePrfCheckbox = isPrfBlockedProductType(row.product_types);
                              //console.log("Row ID:", row.id, "Product Types:", row.product_types, "Disable PRF Checkbox:", disablePrfCheckbox);
                              //console.log("disablePrfCheckbox for row", row.id, "with product types", row.product_types, ":", disablePrfCheckbox);
                              if (val && String(val).trim() !== "") {

                                return (
                                  <td
                                    key={col.column_id}
                                    className="px-4 py-3 whitespace-nowrap"
                                  >
                                    <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                                      Already Generated ({val})
                                    </span>
                                  </td>
                                );

                              } else {

                                return (
                                  <td className="px-4 py-3 whitespace-nowrap text-center" key={col.column_id}>
                                                      <label className="relative flex items-center justify-center cursor-pointer">
                             <input
  type="checkbox"
  checked={!disablePrfCheckbox && selectedRowIds.includes(row.id)}
  disabled={disablePrfCheckbox}
  onChange={(e) => {
    if (disablePrfCheckbox) return;
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
    cursor-pointer
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
                                )}`}
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
                                        "vendors",
                                        "products"
                                      ];

                                      if (triggerColumns.includes(col.column_name)) {

                                        let matchedProvider = null;

                                        // =========================
                                        // FIRST CHECK VENDOR
                                        // =========================
                                        if (updatedRow.vendors) {

                                          matchedProvider = serviceProviders.find(
                                            sp =>
                                              String(sp.vendor || "")
                                                .trim()
                                                .toLowerCase() ===
                                              String(updatedRow.vendors || "")
                                                .trim()
                                                .toLowerCase()
                                          );
                                        }

                                        // =========================
                                        // IF NO VENDOR MATCH
                                        // CHECK PRODUCT
                                        // =========================
                                        if (!matchedProvider && updatedRow.products) {

                                          matchedProvider = serviceProviders.find(
                                            sp =>
                                              String(sp.product || "")
                                                .trim()
                                                .toLowerCase() ===
                                              String(updatedRow.products || "")
                                                .trim()
                                                .toLowerCase()
                                          );
                                        }

                                        const amount = parseFloat(updatedRow.amount || 0);

                                        // =========================
                                        // VAT ENABLED
                                        // =========================
                                        if (matchedProvider?.is_vat) {

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
                                    if (
                                      col.master === "credit_card"
                                    ) {
                                      const raw = String(value ?? "");
                                      const last4 = raw.slice(-4);

                                      return raw
                                        ? `**** **** **** ${last4}`
                                        : "-";
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

                      <td className="px-4 py-3 whitespace-nowrap flex gap-2 justify-end">

  {editRowId === row.id ? (

    <>
      {/* SAVE */}
      <button
        onClick={handleSaveEdit}
        className="
          px-3 py-1.5 text-sm rounded-md border transition
          border-blue-300
          bg-white
          hover:bg-blue-100
          hover:border-blue-500
        "
      >
        Save
      </button>

      {/* CANCEL EDIT */}
      <button
        onClick={handleCancelEdit}
        className="
          px-3 py-1.5 text-sm rounded-md border transition
          border-red-300
          bg-white
          hover:bg-red-100
          hover:border-red-500
        "
      >
        Cancel
      </button>

      {/* UNDO CANCEL */}
      {!row.is_active && (
        <PermissionButton
          user={activeUser}
          permission="modify"
          onClick={() => handleUndoCancelRow(row)}
          className="
            px-3 py-1.5 text-sm rounded-md border transition
            border-gray-400
            bg-gray-100
            hover:bg-gray-200
            hover:border-gray-500
          "
        >
          Undo Cancel
        </PermissionButton>
      )}
    </>

  ) : row.prf_generate ? (

    <>
      {/* PREVIEW */}
       
     <button
  
  onClick={() => handlePreview(encodeURIComponent(row.prf_generate))}
  className="btn btn-primary"
>
  Preview
</button>
    </>

  ) : (

    <>
      {/* EDIT */}
      <PermissionButton
        user={activeUser}
        permission="modify"
        onClick={() => {

          setEditRowId(row.id);

          setEditRow({
            ...row,
          });

          setOriginalRow(row);

        }}
        className="
          px-3 py-1.5 text-sm rounded-md border transition
          border-blue-300
          bg-white
          hover:bg-blue-100
          hover:border-blue-500
        "
      >
        Edit
      </PermissionButton>

      {/* CANCEL */}
      {row.is_active ? (
        <PermissionButton
          user={activeUser}
          permission="delete"
          onClick={() => {
            handleCancelRow(row);
          }}
          className="
            px-3 py-1.5 text-sm rounded-md border transition
            border-red-300
            bg-white
            hover:bg-red-100
            hover:border-red-500
          "
        >
          Cancel
        </PermissionButton>
      ) : (
        <span
          className="
            px-3 py-1.5 text-sm rounded-md
            bg-gray-100 text-gray-500
          "
        >
          Cancelled
        </span>
      )}

      {/* DELETE */}
      <PermissionButton
        user={activeUser}
        permission="delete"
        onClick={() => {
          handleDelete(row);
        }}
        className="
          px-3 py-1.5 text-sm rounded-md border transition
          border-red-300
          bg-white
          hover:bg-red-100
          hover:border-red-500
        "
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
                    </div>
                    {/* ================= MOBILE VIEW ================= */}
<div className="md:hidden space-y-4">

  {sortedRows.map((row, i) => (

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

        {row.prf_generate ? (

          <button
            onClick={() =>
              handlePreview(
                encodeURIComponent(row.prf_generate)
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
                                    onClick={() => handlePrint("default",null,groupBy)}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                <button
                                    onClick={async () => {
                                    const savedCols = await fetchCustomizedColumns();

                                    handlePrint("saved", savedCols, groupBy); // ✅ pass directly
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
                                 <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="border p-2 w-full rounded"
                                  >
                                    <option value="service">Service Types</option>
                                    <option value="terms">Terms</option>
                                  </select>
                               

                            </div>

                        </Modal>
                    )}
                    {showExcelModal && (
                        <Modal title="Excel Export" onClose={() => setShowExcelModal(false)}>
                            <div className="flex gap-3">

                                <button
                                    onClick={() => handleExcel("default", null, groupBy)}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                <button
                                     onClick={async () => {
                                    const savedCols = await fetchCustomizedColumns();

                                    handleExcel("saved", savedCols, groupBy);  // ✅ pass directly
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
                                 <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="border p-2 w-full rounded"
                                  >
                                    <option value="service">Service Types</option>
                                    <option value="terms">Terms</option>
                                  </select>

                            </div>

                        </Modal>
                    )}

                    {showPdfModal && (
                        <Modal title="PDF Export" onClose={() => setShowPdfModal(false)}>
                            <div className="flex gap-3">

                                <button
                                    onClick={() => handlePdf("default", null, groupBy)}
                                    className="btn btn-gray flex-1"
                                >
                                    Default
                                </button>

                                <button
                                   onClick={async () => {
                                        const savedCols = await fetchCustomizedColumns();
                                        handlePdf("saved", savedCols, groupBy); // ✅ pass directly
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
                                 <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value)}
                                    className="border p-2 w-full rounded"
                                  >
                                    <option value="service">Service Types</option>
                                    <option value="terms">Terms</option>
                                  </select>

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
          //setSelectedColumns([]); // reset
        }}
        className="btn btn-gray flex-1"
      >
        Default
      </button>

      {/* SAVED (DB or localStorage fallback) */}
      <button
  onClick={async () => {
    try {

      const res = await getCustomizedColumns(
        currentModule?.module_id,
        activeUserEmail
      );

      let cols = [];

      if (res?.data?.data?.columns) {
        cols = res.data.data.columns;
        setSavedTableColumns(cols);
      } else {
        cols = saved;
        setSavedTableColumns(saved);
      }

      setTableColumnMode("saved");

      // ✅ print using saved columns
   //   handlePrint("saved", cols);

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
  <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50">

    <div className="w-[500px] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50 border-b">

        <h2 className="text-lg font-semibold text-gray-800">
          Customize Columns
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Search and select fields to show in your table
        </p>

        {/* SEARCH */}
        <div className="mt-4 relative">

          <input
            type="text"
            placeholder="Search columns..."
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            className="w-full px-4 py-2 pl-10 text-sm rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition"
          />

          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">
            🔍
          </span>

        </div>

      </div>

      {/* Quick actions */}
      <div className="flex justify-between px-6 py-3 text-xs bg-gray-50 border-b">

        <button
          onClick={() => setTempSelectedColumns(columns.map(c => c.column_name))}
          className="text-blue-600 hover:underline font-medium"
        >
          Select All
        </button>

        <button
          onClick={() => setTempSelectedColumns([])}
          className="text-red-500 hover:underline font-medium"
        >
          Clear All
        </button>

      </div>

      {/* List */}
     {/* List */}
<DndContext
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={columns.map(c => c.column_name)}
    strategy={verticalListSortingStrategy}
  >

    <div className="max-h-72 overflow-auto p-4 space-y-2">

      {columns
        .filter(col =>
          col.display_name
            .toLowerCase()
            .includes(columnSearch.toLowerCase())
        )
        .map(col => {

          const checked =
            tempSelectedColumns.includes(col.column_name);

          return (
            <SortableColumnItem
              key={col.column_name}
              col={col}
              checked={checked}
              toggleTempColumn={toggleTempColumn}
            />
          );
        })}

    </div>

  </SortableContext>
</DndContext>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white">

        <button
          onClick={() => setShowColumnSelector(false)}
          className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-100 transition"
        >
          Cancel
        </button>

        <button
          onClick={saveColumnSelection}
          className="px-5 py-2 text-sm rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-md transition"
        >
          Apply Changes
        </button>

      </div>

    </div>

  </div>
)}
                   {showPrintOptions && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">

    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-[fadeIn_.2s_ease]">

      {/* HEADER */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-blue-50 via-indigo-50 to-white px-6 py-5">

        {/* decorative blur */}
        <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-blue-200/40 blur-3xl"></div>

        <div className="relative z-10">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
              🖨️
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Print Settings
              </h2>

              <p className="text-sm text-gray-500 mt-0.5">
                Customize your print header & branding
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* BODY */}
      <div className="space-y-5 p-6">

        {/* COMPANY */}
        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Company / Trade Name
          </label>

          <div className="relative">

            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="
                w-full appearance-none rounded-2xl border border-gray-200
                bg-gray-50 px-4 py-3 text-sm text-gray-700
                outline-none transition-all
                focus:border-blue-400
                focus:bg-white
                focus:ring-4 focus:ring-blue-100
              "
            >
              <option value="">
                Default (Module Name)
              </option>

              {companyList.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}

            </select>

            {/* dropdown icon */}
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
              ▼
            </div>

          </div>

        </div>

        {/* MODULE NAME */}
        <div>

          <label className="mb-2 block text-sm font-medium text-gray-700">
            Custom Module Name
          </label>

          <div className="relative">

            <input
              type="text"
              placeholder="Enter custom module title..."
              value={printModuleName}
              onChange={(e) => setPrintModuleName(e.target.value)}
              className="
                w-full rounded-2xl border border-gray-200
                bg-gray-50 px-4 py-3 text-sm
                outline-none transition-all
                focus:border-blue-400
                focus:bg-white
                focus:ring-4 focus:ring-blue-100
              "
            />

            <div className="absolute right-4 top-3 text-gray-300">
              ✏️
            </div>

          </div>

        </div>

        {/* PREVIEW */}
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">

          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
            Preview
          </p>

          <div className="rounded-xl bg-white border p-4 shadow-sm">

            <h3 className="text-lg font-semibold text-gray-800">
              {selectedCompany || "Your Company"}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              {printModuleName || module?.display_name || "Module Name"}
            </p>

          </div>

        </div>

      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">

        <button
          onClick={() => setShowPrintOptions(false)}
          className="
            rounded-xl border border-gray-200
            bg-white px-4 py-2.5 text-sm font-medium text-gray-600
            transition hover:bg-gray-100
          "
        >
          Cancel
        </button>

        <button
          onClick={savePrintOptions}
          className="
            rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600
            px-5 py-2.5 text-sm font-medium text-white
            shadow-lg shadow-blue-200
            transition hover:scale-[1.02] hover:shadow-xl
          "
        >
          Save Settings
        </button>

      </div>

    </div>

  </div>
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

          <p className="text-xs text-slate-500 mt-1">
            Add invoice details
          </p>

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
              {console.log("Rendering item:", modalItems)}
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
  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium"
/>

                </td>

                {/* AMOUNT */}
                <td className="p-3 border-b min-w-[140px]">

                  <input
                    type="number"
                    step="0.01"
                    value={Number(item.amount || 0).toFixed(2)}
                    // onChange={(e) => {

                    //   const amount =
                    //     parseFloat(e.target.value || 0);

                    //   const vat =
                    //     (amount * parseFloat(vatPercent || 0)) / 100;

                    //   const total =
                    //     amount + vat;

                    //   const updatedItems = [...modalItems];

                    //   updatedItems[i].amount =
                    //     amount.toFixed(2);

                    //   updatedItems[i].vat =
                    //     vat.toFixed(2);

                    //   updatedItems[i].total_amount =
                    //     total.toFixed(2);

                    //   setModalItems(updatedItems);

                    // }}
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

                {/* ACTION */}
                {/* <td className="p-3 border-b text-center">

                  <button
                    onClick={() => removeRow(i)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm transition"
                  >
                    Delete
                  </button>

                </td> */}

              </tr>

            ))}

          </tbody>

        </table>

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
            ? (form[field.key] || activeUserName || "")
            : (form[field.key] || workflow?.[field.key] || "")
        }
        onChange={(e) =>
          setForm((prev) => ({
            ...prev,
            [field.key]: e.target.value
          }))
        }
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
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
         onBack={() => {
          setShowPreview(false);
          loadModule(); // <-- refresh table data after closing preview
        }}
      />

    </div>

  </div>
)}

        </div>



    );
}