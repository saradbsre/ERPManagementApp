import { useEffect, useState, useRef, act } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchSections, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, exportColumnNames, importTable, getMasterValues, currencises, exportPdf } from "../../api/api";
import { FiEdit3 } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";
import { FiSave } from "react-icons/fi";
import { MdOutlineCancel } from "react-icons/md";
import { openPrintWindow } from "../../utils/PrintHelper";
import logo from "../../assets/headero.png";
import TableFilters from "../filters/TableFilters";
import { applyFilters } from "../../utils/applyFilters";
import { exportToExcel } from "../../utils/export";
import { getAlignClass } from "../../utils/leftAlign";
import { isNumericColumn, handleNumericInput } from "../../utils/numberValidation";
import { isAmountField, isTotalField, hasAnyAmountValue } from "../../utils/costHelpers";
import PermissionButton from "../PermissionButton";

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

    const getVisibleColumns = () => {
        if (tableColumnMode === "default") {
            return columns;
        }

        if (tableColumnMode === "saved") {
            return columns.filter(c =>
                savedTableColumns.includes(c.column_name)
            );
        }

        if (tableColumnMode === "custom") {
            return columns.filter(c =>
                selectedColumns.includes(c.column_name)
            );
        }

        return columns;
    };
    const visibleColumns = getVisibleColumns();
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
                key.includes("total_cost_yearly")
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
    <h1 style="font-size:24px; margin-bottom:5px;">
        ${company}
    </h1>

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
            const value = row[col.column_name] ?? "-";

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


    // ================= LOAD MODULE =================
    const loadModule = async () => {
        try {
            if (location.state?.module) {
                const mod = location.state.module;
                setModule(mod);
                setColumns(mod?.columns?.filter(c => c.is_active) || []);
                // console.log("Module loaded from location state:", mod);
                // console.log("Active columns:", mod?.columns?.filter(c => c.is_active) || []);
                //console.log(columns);
                return;
            }

            const res = await fetchSections();
            const mod = res.data.find(m => m.module_id == id);

            if (mod) {
                setModule(mod);
                setColumns(mod?.columns?.filter(c => c.is_active) || []);
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

    const handleCreate = () => {
        setIsCreating(true);

        const empty = {};
        columns.forEach(col => {
            empty[col.column_name] = "";
        });

        setNewRow(empty);
    };


    useEffect(() => {
        if (!columns.length) return;


        const uniqueMasters = [...new Set(columns.map(c => c.master).filter(Boolean))];

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
    const getExchangeRate = (currencyCode) => {
        const list = currencies || [];

        const currency = list.find(
            c => c.currency_code === currencyCode
        );

        return Number(currency?.exchange_rate ?? 1);
    };
    const calculateCost = (amount, currencyCode, billingCycle) => {
        if (!amount || !currencyCode) return null;

        const rate = getExchangeRate(currencyCode);
        const amountInAED = Number(amount) * rate;

        let monthly = null;
        let yearly = null;

        if (billingCycle === "Monthly") {
            monthly = amountInAED;
            yearly = amountInAED * 12;
        }
        else if (billingCycle === "Yearly") {
            yearly = amountInAED;
            monthly = null; // or yearly / 12 if you still want it
        }

        return { monthly, yearly };
    };

    const handleNewRowChange = (key, value, masterName) => {
        setNewRow(prev => {
            const updated = {
                ...prev,
                [key]: value
            };

            // store billing cycle
            if (masterName === "billing_cycle") {
                sessionStorage.setItem("billing_cycle", value);
                updated.billing_cycle = value;
            }

            return updated;
        });
    };

    useEffect(() => {
        const amountFields = [
            "amount_aed",
            "amount_usd",
            "amount_eur",
            "amount_gbp"
        ];

        let amount = 0;
        let currency = "";

        for (let key of amountFields) {
            if (newRow[key]) {
                amount = Number(newRow[key]);
                currency = key.replace("amount_", "").toUpperCase();
                break;
            }
        }

        const billing =
            newRow.term || sessionStorage.getItem("billing_cycle");

        if (!amount || !currency || !billing) return;

        const calc = calculateCost(amount, currency, billing);

        if (calc) {
            setNewRow(prev => ({
                ...prev,
                total_cost_monthly_aed: calc.monthly !== null ? calc.monthly.toFixed(2) : "",
                total_cost_yearly_aed: calc.yearly !== null ? calc.yearly.toFixed(2) : ""
            }));
        }
    }, [
        newRow.amount_aed,
        newRow.amount_usd,
        newRow.amount_eur,
        newRow.amount_gbp,
        newRow.term
    ]);
    useEffect(() => {
        const savedBilling = sessionStorage.getItem("billing_cycle");

        if (savedBilling) {
            setNewRow(prev => ({
                ...prev,
                billing_cycle: savedBilling
            }));
        }
    }, []);

    const handleSave = async () => {
        try {
            await createModuleRow(id, newRow, activeUserEmail);

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
            userName: localStorage.getItem("username")
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

    // console.log("ROWS:", rows.length);
    // console.log("FILTERED:", filtered.length);
    // console.log("FINAL:", finalRows.length);

    // ================= PAGINATION =================
    const totalPages = Math.ceil(finalRows.length / pageSize);
    const paginatedRows = finalRows.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const handlePdf = async (mode) => {
        const cols = getColumnsToUse(mode);

        try {
            const res = await exportPdf({
                rows: finalRows,
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


    return (
        <div className="h-full flex flex-col">

            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800">
                    {module?.display_name || "Loading..."}
                </h1>

                <div className="flex items-center gap-2">

  {/* NEW */}
  {console.log("Active User in CTable:", activeUser)}
  <PermissionButton
    user={activeUser}
    permission="add"
    onClick={handleCreate}
    className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white 
               hover:bg-green-700 hover:shadow-md transition"
  >
    + New
  </PermissionButton>

  {/* IMPORT */}
  <PermissionButton
    user={activeUser}
    permission="add"
    onClick={() => setShowImportModal(true)}
    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
               hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
  >
    Import
  </PermissionButton>

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
                <button
                    onClick={() => setShowTableColumnModal(true)}
                    className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100"
                >
                    Customize Columns
                </button>
                {/* {console.log("masterTypes", columns.reduce((acc, col) => {
    if (col.master) {
      acc[col.master] = col.data_type;
    }
    return acc;
  }, {}))} */}

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

            {/* ACTIVE FILTER CHIPS */}
            {/* ACTIVE FILTERS (2nd ROW UI) */}
            <div className="flex flex-wrap gap-2 mt-0 mb-4">

                {filters.map((f, i) => {
                    const options =
                        f.master === "currency"
                            ? currencies.map(c => c.currency_code)
                            : masterDataMap?.[f.master] || [];

                    return (
                        <div
                            key={i}
                            className="relative flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 shadow-sm"
                        >

                            {/* MASTER NAME */}
                            <span className="text-sm font-medium text-gray-700">
                                {f.master}
                            </span>

                            {/* SELECTED VALUES */}
                            <div className="flex gap-1 flex-wrap">
                                {(f.values || []).map((val, idx) => (
                                    <span
                                        key={idx}
                                        className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                                    >
                                        {val}
                                        <button
                                            onClick={() => {
                                                const updated = [...filters];
                                                updated[i].values =
                                                    updated[i].values.filter(v => v !== val);
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
                                <div ref={el => (dropdownRefs.current[i] = el)}
                                    className="absolute top-8 left-0 bg-white border rounded-lg shadow-lg w-56 max-h-60 overflow-auto z-50"
                                    onClick={e => e.stopPropagation()}>

                                    {options.map((opt, idx) => {
                                        const checked = (f.values || []).includes(opt);

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

                                                        if (!updated[i].values) {
                                                            updated[i].values = [];
                                                        }

                                                        if (checked) {
                                                            updated[i].values =
                                                                updated[i].values.filter(v => v !== opt);
                                                        } else {
                                                            updated[i].values.push(opt);
                                                        }

                                                        setFilters(updated);
                                                    }}
                                                />

                                                <span className="text-sm">{opt}</span>
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
                                <th className="px-4 py-3 border-b">S.No</th> {/* ✅ ADD THIS */}

                                {visibleColumns.map(col => (
                                    <th
                                        key={col.column_id}
                                        className={`${getAlignClass(col.display_name)} px-4 py-3 whitespace-nowrap border-b`}
                                    >

                                        {col.display_name}
                                    </th>
                                ))}

                                <th className="px-4 py-3 border-b">Actions</th>
                            </tr>
                        </thead>

                        {/* TABLE BODY */}
                        <tbody className="divide-y">

                            {/* ================= CREATE ROW ================= */}
                            {isCreating && (
                                <tr className="bg-blue-50">
                                    <td className="px-4 py-3 whitespace-nowrap"></td> {/* ✅ ADD THIS */}

                                    {visibleColumns.map((col) => {
                                        const isMaster = !!col.master;

                                        return (
                                            <td key={col.column_id} className={`px-4 py-2 ${getAlignClass(col.display_name)} whitespace-nowrap`}>
                                                <div className="relative">
                                                     {/* {console.log("Disable condition for", col.column_name, ":", isTotalField(col.column_name), !isAmountField(col.column_name) && disableOthers)} */}
                                                    <input
                                                        type="text"
                                                        className="border px-2 py-1 rounded w-full"
                                                        value={newRow[col.column_name] ?? ""}
                                                        disabled={
                                                            isTotalField(col.column_name) ||
                                                            (!isAmountField(col.column_name) && disableOthers)
                                                           
                                                        }
                                                        
                                                        onChange={(e) => {
                                                            let value = e.target.value;

                                                            if (isNumericColumn(col.column_name)) {
                                                                value = handleNumericInput(value);
                                                            }

                                                            handleNewRowChange(
                                                                col.column_name,
                                                                value,
                                                                col.master
                                                            );
                                                        }}
                                                        onFocus={() =>
                                                            setActiveDropdown(`create-${col.column_name}`)
                                                        }
                                                        onBlur={() =>
                                                            setTimeout(() => setActiveDropdown(null), 150)
                                                        }
                                                    />

                                                    {/* CREATE DROPDOWN */}
                                                    {isMaster &&
                                                        activeDropdown === `create-${col.column_name}` && (
                                                            <div className="absolute z-50 bg-white border w-full max-h-48 overflow-auto shadow-lg rounded mt-1">

                                                                {(masterDataMap[col.master] || [])
                                                                    .filter(val =>
                                                                        val.toLowerCase().includes(
                                                                            (newRow[col.column_name] || "").toLowerCase()
                                                                        )
                                                                    )
                                                                    .slice(0, 20)
                                                                    .map((val, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                                                                            onMouseDown={() =>
                                                                                handleNewRowChange(
                                                                                    col.column_name,
                                                                                    val,
                                                                                    col.master
                                                                                )
                                                                            }
                                                                        >
                                                                            {val}
                                                                        </div>
                                                                    ))}

                                                            </div>
                                                        )}

                                                </div>
                                            </td>
                                        );
                                    })}

                                    {/* CREATE ACTIONS */}
                                    <td className="px-4 py-3 whitespace-nowrap flex gap-2">
                                        <button onClick={handleSave} className="text-green-600">
                                            Save
                                        </button>

                                        <button onClick={handleCancel} className="text-gray-500">
                                            Cancel
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {/* ================= DATA ROWS ================= */}
                            {paginatedRows.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50">

                                    <td className="px-4 py-3 whitespace-nowrap">{(page - 1) * pageSize + i + 1}</td>


                                    {visibleColumns.map((col) => {
                                        const isMaster = !!col.master;
                                        const editKey = `edit-${row.id}-${col.column_name}`;

                                        return (
                                            <td key={col.column_id} className={`px-4 py-3 whitespace-nowrap ${getAlignClass(col.display_name)}`}>

                                                {/* ================= EDIT MODE ================= */}
                                                {editRowId === row.id ? (
                                                    <div className="relative">

                                                        <input
                                                            className="border px-2 py-1 rounded w-full"
                                                            value={editRow[col.column_name] || ""}
                                                            onChange={(e) => {
                                                                let value = e.target.value;

                                                                if (isNumericColumn(col.column_name)) {
                                                                    value = handleNumericInput(value);
                                                                }

                                                                setEditRow({
                                                                    ...editRow,
                                                                    [col.column_name]: value,
                                                                });
                                                            }}
                                                            onFocus={() => setActiveDropdown(editKey)}
                                                            onBlur={() =>
                                                                setTimeout(() => setActiveDropdown(null), 150)
                                                            }
                                                        />

                                                        {/* EDIT DROPDOWN */}
                                                        {isMaster && activeDropdown === editKey && (
                                                            <div className="absolute z-50 bg-white border w-full max-h-48 overflow-auto shadow-lg rounded mt-1">

                                                                {(masterDataMap[col.master] || [])
                                                                    .filter(val =>
                                                                        val.toLowerCase().includes(
                                                                            (editRow[col.column_name] || "").toLowerCase()
                                                                        )
                                                                    )
                                                                    .slice(0, 20)
                                                                    .map((val, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                                                                            onMouseDown={() =>
                                                                                setEditRow({
                                                                                    ...editRow,
                                                                                    [col.column_name]: val,
                                                                                })
                                                                            }
                                                                        >
                                                                            {val}
                                                                        </div>
                                                                    ))}

                                                            </div>
                                                        )}

                                                    </div>

                                                ) : (
                                                    row?.[col.column_name] ?? "-"
                                                )}

                                            </td>
                                        );
                                    })}

                                    {/* ================= ACTION ICONS ================= */}
                                    <td className="px-4 py-3 whitespace-nowrap flex gap-2">

                                        {editRowId === row.id ? (
                                            <>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded"
                                                    title="Save"
                                                >
                                                    <FiSave size={16} />
                                                </button>

                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                                                    title="Cancel"
                                                >
                                                    <MdOutlineCancel size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <PermissionButton
                                                    user={activeUser}
                                                    permission="modify"
                                                    onClick={() => handleEdit(row)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Edit"
                                                >
                                                    <FiEdit3 size={16} />
                                                </PermissionButton>

                                                <PermissionButton
                                                    user={activeUser}
                                                    permission="delete"
                                                    onClick={() => handleDelete(row)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <MdDeleteOutline size={16} />
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