import { useEffect, useState, useRef, act } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections, getModuleData, exportColumnNames, importTable, exportPdf,upsertSavedFilter, getFilteredReports, getMasterValues, getReportCustomizedColumns, upsertReportCustomizedColumns  } from "../../api/api";
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


export default function ReportPage() {
    const { id } = useParams();
    const location = useLocation();
    const report = location.state?.report;
    const [editRowId, setEditRowId] = useState(null);
    const [editRow, setEditRow] = useState({});
    const [module, setModule] = useState(location.state?.module || null);
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
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
    const [autoFilledFields, setAutoFilledFields] = useState({});
    const [dateFilters, setDateFilters] = useState({});
    const [activeDateFilter, setActiveDateFilter] = useState(null);
    const [showSaveFilter, setShowSaveFilter] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState("");
    const [showTableColumnModal, setShowTableColumnModal] = useState(false);
    const [tableColumnMode, setTableColumnMode] = useState("default");
    const filter_name = report?.filter_name || "Custom Filter";
    const [isInitialized, setIsInitialized] = useState(false);
    const [printModuleName, setPrintModuleName] = useState("");
    const masterList = [
        ...new Set(columns.map(c => c.master).filter(Boolean))
    ];
    const isFilterActive =
    Boolean(search) ||
    (filters?.length > 0) ||
    (Object.keys(dateFilters || {}).length > 0);



// LOAD MODULE & DATA
const loadModule = async () => {
  try {
    const sectionRes = await fetchSections();

    console.log("RAW RESPONSE:", sectionRes);

    const modules =
      sectionRes?.data?.data ||
      sectionRes?.data ||
      sectionRes ||
      [];

    const mod = modules.find(
  m => String(m.module_id) === String(report.module_id)
);

    // console.log("ID:", id);
    // console.log("Modules:", modules);
    // console.log("Matched module:", mod);

    if (!mod) return;

    setModule(mod);

    const cols = Array.isArray(mod.columns)
      ? mod.columns.filter(c => c.is_active !== false)
      : [];

    setColumns(cols);

  } catch (err) {
    console.error("loadModule error:", err);
  }
};

  const loadReportData = async () => {
  try {
    if (!report) return;

    const res = await getFilteredReports({
      module_id: report.module_id,
      filters: filters || [],
      search: search || "",
      dateFilters: dateFilters || {}
    });

    setRows(res.data || []);
  } catch (err) {
    console.error("loadReportData error:", err);
  }
};
// SYNC AUTH ACROSS TABS USEFFECT
useEffect(() => {
  if (!report?.filters) return;

  const parsed = JSON.parse(report.filters);

  setFilters(parsed.filters || []);
  setSearch(parsed.search || "");
  setDateFilters(parsed.dateFilters || {});

  setIsInitialized(true);
}, [report]);

useEffect(() => {
  if (!isInitialized) return;

  loadReportData();
}, [filters, search, dateFilters]);


   useEffect(() => {
        loadModule();
    }, [id]);
    console.log("id:", id);

    useEffect(() => {
  const active = isFilterActive;
  
  console.log("isFilterActive:", isFilterActive);
  console.log("saveFilterName:", saveFilterName);

  setShowSaveFilter(active);
}, [search, filters, dateFilters]);

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

    useEffect(() => {
  if (report?.filter_name) {
    setSaveFilterName(report.filter_name);
  }
}, [report]);

const fetchCustomizedColumns = async () => {
  try {
    const res = await getReportCustomizedColumns(
      report.id,
      activeUserEmail
    );

    return res?.data?.data?.columns || [];

  } catch (err) {
    console.error("Failed to load customized columns:", err);
    return [];
  }
};

const saveColumnSelection = async () => {
  try {
    // 1️⃣ Save locally (optional but fast UX)
    // localStorage.setItem(
    //   `table_columns_${id}`,
    //   JSON.stringify(selectedColumns)
    // );

    // 2️⃣ Save to DB
    await upsertReportCustomizedColumns(
      report.id,
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

useEffect(() => {
  if (!report?.filters) return;

  try {
    const parsed = JSON.parse(report.filters);

    setFilters(parsed.filters || []);
    setSearch(parsed.search || "");
    setDateFilters(parsed.dateFilters || {});
  } catch (err) {
    console.error("Invalid report filters JSON:", err);
  }
}, [report]);
 
// FORMATTING HELPERS
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



    // CRUD HANDLERS (for inline editing - optional)

     const handleSaveFilter = async () => {
  if (!saveFilterName.trim()) {
    alert("Filter name is required");
    return;
  }

  const payload = {
    id: report?.id, // include ID for updates, omit for new filters
    filterName: saveFilterName.trim(),
    userId: activeUser?.email,     // ✅ string only
    module_id: module?.module_id,    // ✅ IMPORTANT
    filterData: {
      search,
      filters,
      dateFilters
    }
  };

  console.log("Saving filter:", payload);

  await upsertSavedFilter(payload);

  setSaveFilterName("");
  setShowSaveFilter(false);
  loadSavedFilters();
};
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
   

     
   
    

const getVisibleColumns = () => {
  let cols = [...columns];

  // ✅ distinct currencies
  const distinctCurrencies = [
    ...new Set(
      rows
        .map(r => (r.currency || "").toUpperCase())
        .filter(Boolean)
    )
  ];

  // ✅ remove currency column
  cols = cols.filter(
    c => c.column_name.toLowerCase() !== "currency"
  );

  const dynamicCols = [];

  cols.forEach(col => {
    const name = col.column_name.toLowerCase();

    // ✅ amount/cost/price columns except total
    const isCurrencyColumn =
      (
        name.includes("amount") ||
        name.includes("cost") ||
        name.includes("price")
      ) &&
      !name.includes("total");

    if (isCurrencyColumn) {

      distinctCurrencies.forEach(cur => {
        dynamicCols.push({
          ...col,
          column_id: `${col.column_name}_${cur}`,
          column_name: `${col.column_name}_${cur.toLowerCase()}`,
          display_name: `${col.display_name} (${cur})`,
          data_type: "decimal"
        });
      });

    } else {
      dynamicCols.push(col);
    }
  });

  // ✅ move total columns to end
  const normalCols = dynamicCols.filter(
    c => !c.column_name.toLowerCase().includes("total")
  );

  const totalCols = dynamicCols.filter(
    c => c.column_name.toLowerCase().includes("total")
  );

  cols = [...normalCols, ...totalCols];

  // ✅ currency filter logic
  const currencyFilter = filters.find(
    f => f.master === "currency"
  );

  if (currencyFilter && currencyFilter.values.length > 0) {

    const selectedCurrencies =
      currencyFilter.values.map(v => v.toLowerCase());

    cols = cols.filter(col => {

      const name = col.column_name.toLowerCase();

      // keep non currency columns
      if (
        !name.includes("_aed") &&
        !name.includes("_usd") &&
        !name.includes("_eur")
      ) {
        return true;
      }

      return selectedCurrencies.some(cur =>
        name.endsWith(`_${cur}`)
      );
    });
  }

  // ✅ saved/custom modes
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
  const name = col.column_name.toLowerCase();
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

          <td style="text-align:center">
            Total
          </td>

       ${sortedCols.map(col => {

  // ONLY SHOW TOTAL FOR total COLUMNS
  if (!isTotalColumn(col)) {
    return `<td></td>`;
  }

  return `
    <td style="text-align:right">
      ${formatNumber(
        totals[col.column_name] || 0
      )}
    </td>
  `;

}).join("")}

        </tr>

      </tbody>

    </table>

  `;
};
    
const dateColumns = visibleColumns.filter(col =>
  col.data_type?.toLowerCase().includes("date")
);




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
    const finalRows = rows;
   
   const normalizedRows = rows.map(row => {

  const currency =
    (row.currency || "").toLowerCase();

  const updatedRow = {
    ...row
  };

  columns.forEach(col => {

    const name = col.column_name.toLowerCase();

    const isCurrencyColumn =
      (
        name.includes("amount") ||
        name.includes("cost") ||
        name.includes("price")
      ) &&
      !name.includes("total");

    if (isCurrencyColumn) {

      updatedRow[
  `${col.column_name}_${currency}`
] = row[col.column_name] ?? "";
    }
  });

  return updatedRow;
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

     


    return (
        <div className="h-full flex flex-col">

            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800">
                    {module?.display_name} - {report?.filter_name || "Loading..."}
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

  setDateFilters(prev => ({
    ...prev,
    [activeDateFilter]: {
      start: range.start,
      end: range.end,
      source: "picker"
    }
  }));

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

                                {/* <th className="px-4 py-3 border-b text-right">Actions</th> */}
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
      const isAmount = col.data_type?.toLowerCase().includes("decimal") 

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

           

            </div>
          ) : (
          (() => {

  const safeNumber = (val) => {
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  // ================= DATE =================
  if (isDate) return formatDate(value);

  // ================= TOTAL =================
  if (col.column_name === "total_amount_aed") {
    const num = safeNumber(value);
    return num !== null ? num.toFixed(2) : "-";
  }

  // ================= DECIMAL =================
  if (col.data_type?.toLowerCase().includes("decimal")) {
    const num = safeNumber(value);

    return num !== null
      ? num.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      : "-";
  }

  // ================= AMOUNT FIELDS =================
  if (col.column_name.toLowerCase().includes("amount")) {
    const num = safeNumber(value);
    return num !== null ? num.toLocaleString() : "-";
  }

  // ================= CREDIT CARD =================
  if (col.master === "credit_card") {
    const raw = String(value ?? "");
    if (!raw) return "-";

    const last4 = raw.slice(-4);
    return `**** **** **** ${last4}`;
  }

  // ================= OBJECT HANDLING =================
  if (typeof value === "object" && value !== null) {
    return value.value ?? "-";
  }

  return value ?? "-";

})()
          )}

        </td>
      );
    })}

  

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
                                        handleExcel("saved",savedCols)
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
                                        handlePdf("saved",savedCols)
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
                                const res = await getReportCustomizedColumns(report.id,
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