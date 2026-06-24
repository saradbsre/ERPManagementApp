import React,{ useEffect, useState, useRef, useLayoutEffect, act, use, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import {  getModuleData, getMasterValues, getReportData   } from "../../api/api";
import { openPrintWindow } from "../../utils/PrintHelper";
import logo from "../../assets/headero.png";
import TableFilters from "../filters/TableFilters";
import { applyFilters } from "../../utils/applyFilters";
import { exportToExcel } from "../../utils/export";
import PermissionButton from "../PermissionButton";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatDate } from "../../utils/formatDate";
import DateOnlyFilter from "../DateOnlyFilter";
import Loader from "../Loader";
import PrintableTable from "../PrintableTable";
import { getDateRange } from "../../utils/dateRanges";
import { formatAmount } from "../../utils/formatAmount";
import CustomizeDrawer from "../tables/CustomizeDrawer";

export default function ReportTable() {
    const { id } = useParams();
    //console.log("ReportTable ID:", id);
    const location = useLocation();
    //console.log("ReportTable Location State:", location.state);
    const [report, setReport] = useState(location.state?.report || null);
    const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false);
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
    const [companyMap, setCompanyMap] = useState({});
    const [vendorMap, setVendorMap] = useState({});
    const [creditCardMap, setCreditCardMap] = useState({});
    const [productMap, setProductMap] = useState({});
    const [reportType, setReportType] = useState("summary");
    const isSummary = report?.is_detailed === true;  
    const groupBy = report?.group_by || null;
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
    useEffect(() => {
      setReport(location.state?.report || null);
    }, [id, location.state]);
   
   
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
      reportType,
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
    


  




useEffect(() => {
  setPage(1);

  if (id) {
    loadReport(id, dateFilters);
  }
}, [id]);













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
      const closeMenu = () => setOpenMenu(null);
      window.addEventListener("click", closeMenu);
      return () => window.removeEventListener("click", closeMenu);
    }, []);

function getFormattedDateTime(date = new Date()) {

  const pad = (n) => n.toString().padStart(2, "0");

  let day = pad(date.getDate());
  let month = pad(date.getMonth() + 1);
  let year = date.getFullYear();

  let hours = date.getHours();
  let minutes = pad(date.getMinutes());

  let ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12

  return `${day}/${month}/${year} ${hours} ${minutes} ${ampm}`;
}

const buildTotalRow = (cols, rows) => {
  const totalRow = {};

  cols.forEach((col) => {
    const key = col.column_name;

    const isNumeric =
      key.toLowerCase().includes("cr") ||
      key.toLowerCase().includes("bc") ||
      key.toLowerCase().includes("cost") ||
      key.toLowerCase().includes("total");

    if (isNumeric) {
      totalRow[key] = rows.reduce((sum, r) => {
        const val = Number(r[key]) || 0;
        return sum + val;
      }, 0);
    } else {
      totalRow[key] = "";
    }
  });

  return totalRow;
};

const handlePrint = () => {
  const printWindow = window.open("", "", "width=1200,height=900");

  const moduleName = report?.description || "Report";
  const formattedTime = getFormattedDateTime();

  const isDetailed =
    reportType === "detailed" && report?.is_detailed === true;

  // ================= TOTAL ROW BUILDER =================
  const buildTotalRow = (cols, rows) => {
    const total = {};

    cols.forEach((col) => {
      const key = col.column_name;

      const isNumeric =
        key.toLowerCase().includes("cr") ||
        key.toLowerCase().includes("bc") ||
        key.toLowerCase().includes("cost") ||
        key.toLowerCase().includes("total");

      if (isNumeric) {
        total[key] = rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0);
      } else {
        total[key] = "";
      }
    });

    return total;
  };

  // ================= DATA PREP =================
  const dataRows = rows || [];
  const totalRow = buildTotalRow(columns, dataRows);

  const pageRows = dataRows;

  let tableHtml = "";

  // ================= SUMMARY =================
  if (!isDetailed) {
    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            ${columns
              .map(
                (col) => `
                  <th class="${isRightAligned(col) ? "text-right" : "text-left"}">
                    ${col.display_name}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${pageRows
            .map(
              (row, i) => `
                <tr>
                  <td style="text-align:center">${(page - 1) * pageSize + i + 1}</td>

                  ${columns
                    .map((col) => `
                      <td class="${
                        isRightAligned(col) ? "text-right" : "text-left"
                      }">
                        ${getCellValue(row, col)}
                      </td>
                    `)
                    .join("")}
                </tr>
              `
            )
            .join("")}

          <!-- ================= TOTAL ROW ================= -->
          <tr style="font-weight:bold;background:#e5e7eb;">
            <td>TOTAL</td>

            ${columns
              .map((col) => `
                <td class="${
                  isRightAligned(col) ? "text-right" : "text-left"
                }">
                  ${getCellValue(totalRow, col, true)}
                </td>
              `)
              .join("")}
          </tr>

        </tbody>
      </table>
    `;
  }

  // ================= DETAILED =================
  else {
    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            ${visibleDetailedColumns
              .map(
                (col) => `
                  <th class="${isRightAligned(col) ? "text-right" : "text-left"}">
                    ${col.display_name}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${fullGroupedRows   
            .map(
              ([groupName, groupRows]) => `
                <tr>
                  <td colspan="${
                    visibleDetailedColumns.length + 1
                  }" style="background:#e5e7eb;font-weight:bold;">
                    ${(report?.group_by || "GROUP").toUpperCase()} : ${groupName}
                  </td>
                </tr>

                ${groupRows
                  .map(
                    (row, i) => `
                      <tr>
                        <td style="text-align:center">${i + 1}</td>

                        ${visibleDetailedColumns
                          .map(
                            (col) => `
                              <td class="${
                                isRightAligned(col)
                                  ? "text-right"
                                  : "text-left"
                              }">
                                ${getCellValue(row, col)}
                              </td>
                            `
                          )
                          .join("")}
                      </tr>
                    `
                  )
                  .join("")}
              `
            )
            .join("")}

          <!-- ================= TOTAL ROW ================= -->
          <tr style="font-weight:bold;background:#e5e7eb;">
            <td colspan="${
              visibleDetailedColumns.length + 1
            }">TOTAL</td>
          </tr>

          <tr style="font-weight:bold;background:#f3f4f6;">
            <td>TOTAL</td>

            ${visibleDetailedColumns
              .map(
                (col) => `
                <td class="${
                  isRightAligned(col) ? "text-right" : "text-left"
                }">
                  ${getCellValue(totalRow, col, true)}
                </td>
              `
              )
              .join("")}
          </tr>
        </tbody>
      </table>
    `;
  }

  // ================= PRINT WINDOW =================
  printWindow.document.write(`
    <html>
      <head>
       
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm 10mm 20mm 10mm;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: "Times New Roman", serif;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border: 1px solid #ccc;
            padding: 3px;
            font-size: 9px;
          }

          th {
            background: #f3f4f6;
          }

          h3 {
            text-align: center;
            margin-bottom: 10px;
          }

          .text-right { text-align: right; }
          .text-left { text-align: left; }

          @media print {
            @page {
              @bottom-left {
                content: "Designed by Bin Shabib Group LLC • User: ${
                  activeUser?.name || ""
                } • Printed: ${formattedTime}";
                font-size: 9px;
              }

              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9px;
              }
            }
          }
        </style>
      </head>

      <body>
        <h3>${moduleName}</h3>
        ${tableHtml}
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
};


const generateGroupedTableHTML = (columns, groups, groupBy) => {
  return `
    <table border="1" style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr>
          <th>S/N</th>
          ${columns.map(c => `<th>${c.display_name}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${groups
          .map(
            ([groupName, rows]) => `
            <tr>
              <td colspan="${columns.length + 1}" style="background:#eee;font-weight:bold;">
                ${groupBy.toUpperCase()} : ${groupName}
              </td>
            </tr>
            ${rows
              .map(
                (row, i) => `
                <tr>
                  <td>${i + 1}</td>
                  ${columns
                    .map(col => {
                      const val = row[col.column_name] ?? "-";
                      return `<td>${val}</td>`;
                    })
                    .join("")}
                </tr>
              `
              )
              .join("")}
          `
          )
          .join("")}
      </tbody>
    </table>
  `;
};
   
    // ================= PAGINATION =================
  const totalPages = Math.ceil(rows.length / pageSize);

  

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

  const company = selectedCompany || localStorage.getItem("print_company") || "";

  const moduleTitle = printModuleName || module?.display_name;

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






const handleQuickDateChange = (value) => {
  setActiveDateFilter(value);

  const range = getDateRange(value);

  if (range) {
    setDateFilters(range);
  }
};



const loadMasters = async () => {
  const currencyRes = await getMasterValues("currency");
  const termRes = await getMasterValues("billing_cycle");
  const companyRes = await getMasterValues("company");
  const vendorRes = await getMasterValues("vendors");
  const creditCardRes = await getMasterValues("credit_card");
  const productRes = await getMasterValues("products");

  const currencyData = currencyRes?.data?.data || [];
  const termData = termRes?.data?.data || [];

  // ✅ COMPANY FIX (handles object OR array)
  const rawCompany = companyRes?.data?.data || companyRes?.data || {};
  const rawVendors = vendorRes?.data?.data || vendorRes?.data || {};
  const rawCreditCards = creditCardRes?.data?.data || creditCardRes?.data || {};
  const rawProducts = productRes?.data?.data || productRes?.data || {};

  const companyData = Array.isArray(rawCompany)
    ? rawCompany
    : Object.entries(rawCompany).map(([key, value]) => ({
        key,
        value,
      }));

  const vendorData = Array.isArray(rawVendors)
    ? rawVendors
    : Object.entries(rawVendors).map(([key, value]) => ({
        key,
        value,
      }));

  const creditCardData = Array.isArray(rawCreditCards)
    ? rawCreditCards
    : Object.entries(rawCreditCards).map(([key, value]) => ({
        key,
        value,
      }));

  const productData = Array.isArray(rawProducts)
    ? rawProducts
    : Object.entries(rawProducts).map(([key, value]) => ({
        key,
        value,
      }));

  // =========================
  // CURRENCY MAP
  // =========================
  const currencyMap = {};
  currencyData.forEach(c => {
    if (c?.key) {
      currencyMap[String(c.key).trim().toUpperCase()] = c.value;
    }
  });

  // =========================
  // TERM MAP
  // =========================
  const termMap = {};
  termData.forEach(t => {
    if (t?.key) {
      termMap[String(t.key).trim().toUpperCase()] = t.value;
    }
  });

  // =========================
  // COMPANY MAP (FIXED)
  // =========================
  const companyMap = {};
  companyData.forEach(c => {
    if (c?.key) {
      companyMap[String(c.key).trim().toUpperCase()] = c.value;
    }
  });

  const vendorMap = {};
  vendorData.forEach(v => {
    if (v?.key) {
      vendorMap[String(v.key).trim().toUpperCase()] = v.value;
    }
  });

  const creditCardMap = {};
  creditCardData.forEach(cc => {
    if (cc?.key) {
      creditCardMap[String(cc.key).trim().toUpperCase()] = cc.value;
    }
  });

  const productMap = {};
  productData.forEach(p => {
    if (p?.key) {
      productMap[String(p.key).trim().toUpperCase()] = p.value;
    }
  });

  setCurrencies(currencyData);
  setTerm(termData);
  setCurrencyMap(currencyMap);
  setTermMap(termMap);
  setCompanyMap(companyMap);
  setVendorMap(vendorMap);
  setCreditCardMap(creditCardMap);
  setProductMap(productMap);

  return { currencyMap, termMap, companyMap, vendorMap, creditCardMap, productMap };
};

useEffect(() => {
  loadMasters();
}, []);

const buildDynamicColumns = (data, currencyMap, termMap) => {
  if (!data?.length) return [];

  const keys = Object.keys(data[0]).filter(
    key =>
      key !== "curr_code" &&
      key !== "billcycle_code" &&
      data.some(row => row[key] !== undefined)
  );

  return keys.map((key) => {
    if (key === "company") {
      return {
        column_name: key,
        display_name: "Company",
      };
    }

    if (key === "vendor") {
      return {
        column_name: key,
        display_name: "Vendor",
      };
    }

    if (key === "PaymentMethod") {
      return {
        column_name: key,
        display_name: "Payment Method",
      };
    }

    if (key === "product") {
      return {
        column_name: key,
        display_name: "Product",
      };
    }

    if (key.startsWith("CR")) {
      return {
        column_name: key,
        display_name: `Cost (${currencyMap?.[key.toUpperCase()] || key})`,
      };
    }

    if (key.startsWith("BC")) {
      return {
        column_name: key,
        display_name: `Total Cost (${termMap?.[key.toUpperCase()] || key})`,
      };
    }

    return {
      column_name: key,
      display_name: key,
    };
  });
};

const getCellValue = (row, col, isTotalRow = false) => {
  const value = row[col.column_name];

  // ================= TOTAL ROW OVERRIDE =================
  if (isTotalRow) {
    if (col.column_name.startsWith("CR") ||
        col.column_name.startsWith("BC") ||
        col.column_name.toLowerCase().includes("total")) {
      return formatAmount(value) ?? "-";
    }

    // ❗ DO NOT mask payment method in total row
    if (col.column_name.toLowerCase().includes("paymentmethod")) {
      return value ?? "-";
    }

    return value ?? "-";
  }

  // ================= NORMAL ROW LOGIC =================
  if (col.column_name.startsWith("CR")) {
    return formatAmount(value) ?? "-";
  }

  if (col.column_name.startsWith("BC")) {
    return formatAmount(value) ?? "-";
  }

  if (col.column_name.toLowerCase().includes("total")) {
    return formatAmount(value) ?? "-";
  }

  if (col.column_name.toLowerCase().includes("paymentmethod")) {
    return "**** " + (value || "").slice(-4);
  }

  return value ?? "-";
};

const handleReportTypeChange = async (type) => {
  if (type === reportType) return;

  setReportType(type);

  await loadReport(
    id,
    dateFilters,
    type
  );
};

const loadReport = async (reportId, overrideDateFilters = dateFilters, type = reportType) => {
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
      reportType: type,
    };

    const res = await getReportData(reportId, activeUserEmail, payload);
    const data = res.data || [];
    //console.log("Raw report data:", data);
    // 1️⃣ LOAD MASTERS FIRST
    const { currencyMap, termMap, companyMap, vendorMap, creditCardMap, productMap } = await loadMasters();

    // helper
    const normalize = (v) => String(v || "").trim().toUpperCase();

    // 2️⃣ MAP ROWS
    const mappedRows = data.map(row => {
     
      const newRow = { ...row };

      if ("company" in row) {
        newRow.company =
          companyMap?.[normalize(row.company)] || row.company;
      }

      if ("vendor" in row) {
        newRow.vendor =
          vendorMap?.[normalize(row.vendor)] || row.vendor;
      }
      
      if ("PaymentMethod" in row) {
        newRow["PaymentMethod"] =
          creditCardMap?.[normalize(row.PaymentMethod)] || row.PaymentMethod;
      }

      if ("term" in row) {
        newRow.term = 
           termMap?.[normalize(row.term)] || row.term;
      }

      if ("product" in row) {
        newRow.product =
          productMap?.[normalize(row.product)] || row.product;
      }

      return newRow;
    });

    // 3️⃣ SET FINAL ROWS (IMPORTANT)
    setRows(mappedRows);

    // 4️⃣ COLUMNS
    const dynamicCols = buildDynamicColumns(mappedRows, currencyMap, termMap);
    setColumns(dynamicCols);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const summaryRows = rows;

const groupedRows = useMemo(() => {
  if (!report?.is_detailed || !groupBy) return [];

  return Object.entries(
    rows.reduce((acc, row) => {
      const key = row[groupBy] || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {})
  );
}, [rows, groupBy, report]);

const visibleDetailedColumns = useMemo(() => {
  if (!columns?.length) return [];

  if (reportType !== "detailed") return columns;

  return columns.filter(
    (col) => col.column_name !== report?.group_by
  );
}, [columns, reportType, report]);



const detailedFlatRows = useMemo(() => {
  if (reportType !== "detailed") return [];

  return rows.map((row) => ({
    ...row,
    _group: row[groupBy] || "Unknown",
  }));
}, [rows, groupBy, reportType]);

const paginatedRows = rows.slice(
  (page - 1) * pageSize,
  page * pageSize
);

const paginatedDetailedRows = useMemo(() => {
  return detailedFlatRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
}, [detailedFlatRows, page]);

const paginatedGroupedRows = useMemo(() => {
  if (reportType !== "detailed") return [];

  return Object.entries(
    paginatedDetailedRows.reduce((acc, row) => {
      const key = row._group;

      if (!acc[key]) acc[key] = [];
      acc[key].push(row);

      return acc;
    }, {})
  );
}, [paginatedDetailedRows, reportType]);

const fullGroupedRows = useMemo(() => {
  if (reportType !== "detailed") return [];

  return Object.entries(
    rows.reduce((acc, row) => {
      const key = row[groupBy] || "Unknown";

      if (!acc[key]) acc[key] = [];
      acc[key].push(row);

      return acc;
    }, {})
  );
}, [rows, groupBy, reportType]);


 const isRightAligned = (col) => {
      const name = (col.column_name || "").toLowerCase();
      return name.includes("bc") || name.includes("cr") || name.includes("cost") || name.includes("total");
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

            <div className="flex items-center border rounded-lg overflow-hidden shadow-sm">

  <button
    onClick={() => handleReportTypeChange("summary")}
    disabled={report.is_detailed === false}
    className={`px-4 py-1.5 text-sm font-medium transition ${
      reportType === "summary"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-700 hover:bg-gray-100"
    } ${
      report.is_detailed === false
        ? "opacity-50 cursor-not-allowed"
        : ""
    }`}
  >
    Summary
  </button>

  <button
    onClick={() => handleReportTypeChange("detailed")}
    disabled={report.is_detailed === false}
    className={`px-4 py-1.5 text-sm font-medium transition ${
      reportType === "detailed"
        ? "bg-blue-600 text-white"
        : "bg-white text-gray-700 hover:bg-gray-100"
    } ${
      report.is_detailed === false
        ? "opacity-50 cursor-not-allowed"
        : ""
    }`}
  >
    Detailed
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
                {/* Total: {finalRows.length} */}
              </span>
            </div>
              </div>

            </div>
          




           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  {loading ? (
    <div className="flex justify-center items-center h-80">
      <Loader type="orbit" />
    </div>
  ) : reportType === "detailed" && report.is_detailed === true ? (
    /* ================= DETAILED ================= */
    <div className="overflow-x-auto">
      <table className="min-w-max w-full text-sm border-separate border-spacing-0">

        {/* ❗ HEADER FIX (ADD THIS) */}
        <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 border-b text-left">S/N</th>
            {visibleDetailedColumns.map((col) => (
              <th
                key={col.column_name}
                className={`px-4 py-3 border-b text-left ${
                  isRightAligned(col) ? "text-right" : "text-left"
                }`}
              >
                {col.display_name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
         {paginatedGroupedRows.map(([groupName, groupRows]) => (
  <React.Fragment key={groupName}>

    {/* GROUP HEADER */}
    <tr>
      <td
        colSpan={visibleDetailedColumns.length + 1}
        className="bg-gray-200 font-bold px-4 py-3"
      >
        {(report?.group_by || "GROUP").toUpperCase()} : {groupName}
      </td>
    </tr>

    {/* ROWS */}
    {groupRows.map((row, i) => (
      <tr key={i}>
        <td className="px-4 py-3 border-b">
          {(page - 1) * pageSize + i + 1}
        </td>

        {visibleDetailedColumns.map((col) => (
          <td
            key={col.column_name}
            className={`px-4 py-3 border-b ${
              isRightAligned(col) ? "text-right" : "text-left"
            }`}
          >
            {getCellValue(row, col)}
          </td>
        ))}
      </tr>
    ))}

  </React.Fragment>
))}
        </tbody>
      </table>
    </div>

  ) : (
    /* ================= SUMMARY ================= */
    <div className="overflow-x-auto">
      <table className="min-w-max w-full text-sm border-separate border-spacing-0">

        {/* ✅ THIS WAS MISSING IN YOUR SCREENSHOT */}
        <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 border-b text-left">S/N</th>

            {columns.map((col) => (
              <th
                key={col.column_name}
                className={`px-4 py-3 border-b text-left ${
                  isRightAligned(col) ? "text-right" : "text-left"
                }`}
              >
                {col.display_name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {paginatedRows.length ? (
            paginatedRows.map((row, i) => (
              <tr key={i}>
                <td className="px-4 py-3 border-b">
                  {(page - 1) * pageSize + i + 1}
                </td>

                {columns.map((col) => (
                  <td
                    key={col.column_name}
                    className={`px-4 py-3 border-b ${
                      isRightAligned(col) ? "text-right" : "text-left"
                    }`}
                  >
                    {getCellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length + 1} className="text-center py-10">
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
    finalRows={rows}
    printModuleName={printModuleName}
   // module={module}
    groupBy={groupBy}
  />

</div>

{/* <CustomizeDrawer
  open={showCustomizeDrawer}
  onClose={() => setShowCustomizeDrawer(false)}

  // Columns (ONLY what is actually used)
  columns={columns}
 

  // Header (Printer Custom)
  selectedCompany={selectedCompany}
  setSelectedCompany={setSelectedCompany}
  companyList={company}

  // Sub Header
  printModuleName={printModuleName}
  setPrintModuleName={setPrintModuleName}
/> */}



        </div>



    );
}