import React,{ useEffect, useState, useRef, useLayoutEffect, act, use, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import {  getModuleData, getMasterValues, getReportData, fetchMasters, getDisplayName, reportPdf   } from "../../api/api";
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
import TableFiltersDrawer from "../filters/TableFiltersDrawer";

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
    const [masters, setMasters] = useState([]);
    const [displayNames, setDisplayNames] = useState({});
    const groupBy = report?.group_by || null;
  
    const IsEquivalent = report?.is_equivalent === true;
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
useEffect(() => {
  setReport(location.state?.report || null);

  resetFiltersState(); // ✅ clear filters when new report loads
}, [id, location.state]);

useEffect(() => {
  if (report) {
    const displaynames = async () => {
      const res = await getDisplayName();

      const map = {};
      (res.data || []).forEach(item => {
        map[item.column_name] = item.display_name;
      });

      setDisplayNames(map);
    };

    displaynames();
  }
}, [report]);

useEffect(() => {
  if (!rows?.length) return;

  const dynamicCols = buildDynamicColumns(rows);
  setColumns(dynamicCols);

}, [displayNames, rows]);



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

  const Masters = async () => {
    try {
      const res = await fetchMasters();
      setMasters(res.data || []);
    
    } catch (err) {
      console.error(err);
    }
  };
const compapny = async () => {
  try {
    const res = await getMasterValues("company");

    const companyData = res.data?.data || [];

    const formatted = companyData.map((item) => item.value);

    setCompany(formatted);
  } catch (err) {
    console.error(err);
  }
};


    useEffect(() => {
    Masters();
    compapny();
  }, []);




const masterList = (masters || []).map(item => ({
  master: item.master_name,
  display_name: item.display_name
}));

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


const handleSearch = async (appliedFilters) => {
  try {
    setLoading(true);
    setPage(1);

    const reportId = report?.report_id || id;

    const payloadFilters = appliedFilters ?? filters ?? [];

    const payload = {
      filters: JSON.stringify(payloadFilters || []),
      dateFilters: JSON.stringify({
        date: {
          startDate: dateFilters.startDate,
          endDate: dateFilters.endDate,
        },
      }),
      reportType,
    };

    const res = await getReportData(reportId, activeUserEmail, payload);

    let data = res.data || [];

    // ✅ 1. normalize keys (IMPORTANT)
    data = data.map(normalizeKeys);

    // ❗ 2. currency transformation (THIS WAS MISSING)
    data = transformCurrencyRows(data);

    // ✅ 3. set rows
    setRows(data);

    // ✅ 4. rebuild columns
    const dynamicCols = buildDynamicColumns(data);
    setColumns(dynamicCols);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
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

  try {
    setLoading(true);

    // ================= RESET UI STATE =================
    setSearch("");
    setSearchColumnKey(null);
    setFilters([]);
    setPage(1);
    setActiveDateFilter("");

    const reportId = report?.report_id || id;

    // ================= RESET DATE =================
    setDateFilters(defaults);

    // ================= API CALL =================
    const payload = {
      search: "",
      filters: JSON.stringify([]),
      dateFilters: JSON.stringify({
        date: {
          startDate: defaults.startDate,
          endDate: defaults.endDate,
        },
      }),
      reportType,
    };

    const res = await getReportData(reportId, activeUserEmail, payload);

    let data = res.data || [];

    // ================= IMPORTANT PIPELINE =================

    // 1. normalize keys (fix case issues like Total_Amount_AED)
    data = data.map(normalizeKeys);

    // 2. transform currency columns (creates amount_AED, amount_USD, etc.)
    data = transformCurrencyRows(data);

    // ================= SET ROWS =================
    setRows(data);

    // ================= REBUILD COLUMNS =================
    const dynamicCols = buildDynamicColumns(data);
    setColumns(dynamicCols);

  } catch (err) {
    console.error("handleClear failed:", err);
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

const buildTotalRow = (rows, cols) => {
  const total = {};

  cols.forEach((col) => {
    if (isNumericColumn(col)) {
      total[col.column_name] = rows.reduce(
        (sum, row) => sum + parseNum(row[col.column_name]),
        0
      );
    } else {
      total[col.column_name] = "";
    }
  });

  return total;
};

const formatPrintDate = (dateStr) => {
  if (!dateStr) return "";

  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const handlePrint = () => {
  const printWindow = window.open("", "", "width=1200,height=900");
  const printCompany =  localStorage.getItem("print-company") || "";
  
  const moduleName = report?.description || "Report";
  const formattedTime = getFormattedDateTime();

  const fromDate = formatPrintDate(dateFilters.startDate);
  const toDate = formatPrintDate(dateFilters.endDate);
  

  
  const isDetailed = reportType === "detailed" && report?.is_detailed === true;

  const reportTypeLabel = isDetailed ? "Detailed" : "Summary";

  const reportTitle = `${moduleName} ${reportTypeLabel} (${fromDate} to ${toDate})`;


  console.log("filters applied for print:", filters);
 
  // ================= TOTAL HELPERS =================
  const isNumeric = (key) =>
    key?.toLowerCase().includes("cr") ||
    key?.toLowerCase().includes("bc") ||
    key?.toLowerCase().includes("cost") ||
    key?.toLowerCase().includes("total") ||
    key?.toLowerCase().includes("amount");

  const dataRows = rows || [];

const grandTotal = buildTotalRow(
  dataRows,
  visibleDetailedColumns
);

    const buildGroupTotal = (rows, cols) => {
    const total = {};
    cols.forEach((col) => {
      const key = col.column_name;
      if (isNumeric(key)) {
        total[key] = rows.reduce(
          (sum, r) => sum + (Number(r[key]) || 0),
          0
        );
      } else {
        total[key] = "";
      }
    });
    return total;
  };

  const buildGrandTotal = (groups, cols) => {
    const total = {};
    cols.forEach((col) => {
      const key = col.column_name;
      if (isNumeric(key)) {
        total[key] = groups.reduce((acc, g) => {
          return (
            acc +
            g.rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
          );
        }, 0);
      } else {
        total[key] = "";
      }
    });
    return total;
  };

  let tableHtml = "";

  // ================= SUMMARY =================
   if (!isDetailed) {
    const totalRow = buildGroupTotal(rows, columns);

    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            ${columns
              .map(
                (c) => `<th class="${
                  isRightAligned(c) ? "text-right" : "text-left"
                }">${c.display_name}</th>`
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${rows
            .map(
              (row, i) => `
            <tr>
              <td style="text-align:center">${i + 1}</td>
              ${columns
                .map(
                  (c) => `
                <td class="${
                  isRightAligned(c) ? "text-right" : "text-left"
                }">
                  ${getCellValue(row, c)}
                </td>
              `
                )
                .join("")}
            </tr>`
            )
            .join("")}

          <!-- TOTAL ROW -->
          <tr style="font-weight:bold;background:#e5e7eb;">
            <td></td>

            ${columns
              .map((c, i) => {
                const total = totalRow[c.column_name];

                // ✅ LABEL BEFORE AMOUNT COLUMN
                const isLabel =
                  i ===
                  columns.findIndex((x) =>
                    x.column_name.toLowerCase().includes("amount")
                  ) - 1;

                return `
                  <td class="text-right">
                    ${isLabel ? "TOTAL" : isNumeric(c.column_name) ? formatAmount(total) : ""}
                  </td>
                `;
              })
              .join("")}
          </tr>
        </tbody>
      </table>
    `;
  }

  // ================= DETAILED =================
  else {
    const firstAmountIndex =
      visibleDetailedColumns.findIndex((c) =>
        c.column_name?.toLowerCase().startsWith("amount_")
      );

    const totalLabelIndex =
      firstAmountIndex > 0 ? firstAmountIndex - 1 : 0;

    tableHtml = `
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            ${visibleDetailedColumns
              .map(
                (col) => `
                  <th class="${
                    isRightAligned(col)
                      ? "text-right"
                      : "text-left"
                  }">
                    ${col.display_name}
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>

        <tbody>
          ${fullGroupedRows
            .map(([groupName, groupRows]) => {
             const groupTotal = buildTotalRow(
  groupRows,
  visibleDetailedColumns
);

              return `
                <!-- GROUP HEADER -->
                <tr>
                  <td colspan="${
                    visibleDetailedColumns.length + 1
                  }"
                    style="background:#e5e7eb;font-weight:bold;">
                    ${(displayNames[report?.group_by] || report?.group_by || "GROUP").toUpperCase()} :
                    ${groupName}
                  </td>
                </tr>

                <!-- GROUP ROWS -->
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

                <!-- GROUP TOTAL -->
                <tr style="font-weight:bold;background:#f1f5f9;">
                  <td></td>

                  ${visibleDetailedColumns
                    .map((col, index) => {
                      const isLabel =
                        index === totalLabelIndex;

                      return `
                        <td class="text-right">
                          ${
                            isLabel
                              ? "TOTAL"
                              : isNumericColumn(col)
                              ? formatAmount(
                                  groupTotal[col.column_name]
                                )
                              : ""
                          }
                        </td>
                      `;
                    })
                    .join("")}
                </tr>
              `;
            })
            .join("")}

          <!-- ================= GRAND TOTAL ================= -->
          <tr style="font-weight:bold;background:#e5e7eb;">
            <td></td>

            ${visibleDetailedColumns
              .map((col, index) => {
                const isLabel =
                  index === totalLabelIndex;

                return `
                  <td class="text-right">
                    ${
                      isLabel
                        ? "GRAND TOTAL"
                        : isNumericColumn(col)
                        ? formatAmount(
                            grandTotal[col.column_name]
                          )
                        : ""
                    }
                  </td>
                `;
              })
              .join("")}
          </tr>
        </tbody>
      </table>
    `;
  }

const hasFilters =
  Array.isArray(filters) &&
  filters.some(
    (f) => f?.values && f.values.length > 0
  );

const filterHtml = hasFilters
  ? `
  <div style="margin-top:20px;">
    <h4 style="margin-bottom:8px; font-size:11px;">Applied Filters</h4>

    <table style="width:100%; border-collapse:collapse; font-size:10px;">
      <tbody>
        ${filters
          .filter(f => f?.master !== "dateFilters") // 👈 extra safety
          .map((filter) => `
            <tr>
              <td style="border:1px solid #ccc;padding:5px;font-weight:bold;">
                ${filter.master.charAt(0).toUpperCase() + filter.master.slice(1)}
              </td>

              <td style="border:1px solid #ccc;padding:5px;">
                ${(filter.values || [])
                  .map(v => v.value)
                  .join(", ")}
              </td>
            </tr>
          `)
          .join("")}
      </tbody>
    </table>
  </div>
`
  : "";

    const pageStyle = isDetailed
    ? "size:A4 landscape; margin:10mm 10mm 20mm 10mm;"
    : "size:A4 portrait; margin:10mm 10mm 20mm 10mm;";
  // ================= PRINT STYLES =================
  printWindow.document.write(`
    <html>
      <head>
        <style>
          @page {
            ${pageStyle}
          }

          body {
            font-family: "Times New Roman", serif;
            margin: 0;
          }

          table {
            width: auto;
            min-width: 100%;
            border-collapse: collapse;
            margin: 0 auto;
          }

          th, td {
            border: 1px solid #ccc;
            padding: 3px;
            font-size: 9px;
          }

          th {
            background: #f3f4f6;
          }

          .text-right { text-align: right; }
          .text-left { text-align: left; }

          h3 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 13px;
          }

          @media print {
            @page {
              @bottom-left {
                content: "User: ${activeUser?.name || ""} • Printed: ${formattedTime}";
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
        <h3> ${printCompany}</h3>
        <h3>${reportTitle}</h3>
        ${tableHtml}
        ${filterHtml}
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

const handlePdf = async () => {
  try {
    const reportId = report?.report_id || id;

    const isDetailed =
      reportType === "detailed" && report?.is_detailed === true;

    const moduleName = report?.description || "Report";

    // ================= BASE DATA =================
    const rowsData = filteredRows.map(normalizeKeys);
    const transformedRows = transformCurrencyRows(rowsData);
    const cols = isDetailed ? visibleDetailedColumns : columns;

    let payload;

    // ================= SUMMARY =================
    if (!isDetailed) {
      payload = {
        rows: transformedRows,
        columns: cols,
        userName: activeUser?.name || "User",
        moduleName,
        reportType: "summary",
      };
    }

    // ================= DETAILED =================
    else {
      const grouped = Object.entries(
        transformedRows.reduce((acc, row) => {
          const key = row[groupBy] || "Unknown";
          if (!acc[key]) acc[key] = [];
          acc[key].push(row);
          return acc;
        }, {})
      ).map(([groupName, rows]) => ({
        groupName,
        rows: rows.map((r, idx) => ({
          ...r,
          _sn: idx + 1
        }))
      }));

      payload = {
        rows: grouped,
        columns: cols,
        userName: activeUser?.name || "User",
        moduleName,
        reportType: "detailed",
        groupBy
      };
    }

    const res = await reportPdf(
      reportId,
      activeUserEmail,
      payload
    );

     const url = window.URL.createObjectURL(new Blob([res.data]));


    const link = document.createElement("a");
    link.href = url;
    link.download = `${moduleName}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

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

const normalizeKeys = (row) => {
  const newRow = {};

  Object.keys(row).forEach((k) => {
    newRow[k.toLowerCase()] = row[k];
  });

  return newRow;
};


const buildDynamicColumns = (data = []) => {
  if (!data.length) return [];

  const firstRow = data[0];

  const baseKeys = Object.keys(firstRow).filter(
    key =>
      key !== "curr_code" &&
      key !== "total_amount" &&          // ❌ REMOVE
      key !== "total_amount_aed" &&
      key !== "total_amount_aed".toLowerCase() &&
      !key.toLowerCase().includes("total_amount") &&
      !key.startsWith("amount_")
  );

  const normalCols = baseKeys.map((key) => ({
    column_name: key,
    display_name: displayNames?.[key] || key
  }));

  const currencies = Array.from(
    new Set(
      data
        .map(r => r.curr_code?.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  const currencyCols = currencies.map(curr => ({
    column_name: `amount_${curr}`,
    display_name: `Amount (${curr})`
  }));

  // ✅ ONLY AED TOTAL
  const totalCols = [];

  if (
    firstRow.hasOwnProperty("total_amount_aed") ||
    firstRow.hasOwnProperty("Total_Amount_AED")
  ) {
    totalCols.push({
      column_name: "total_amount_aed",
      display_name: displayNames?.total_amount_aed || "Total Amount (AED)"
    });
  }

  return [...normalCols, ...currencyCols, ...totalCols];
};

const transformCurrencyRows = (data = []) => {
  const currencies = Array.from(
    new Set(
      data
        .map(r => r.curr_code?.trim().toUpperCase())
        .filter(Boolean)
    )
  );

  return data.map(row => {
    const newRow = { ...row };

    // ❌ remove unwanted column completely
    delete newRow.total_amount;

    const rowCurr = row.curr_code?.trim().toUpperCase();

    currencies.forEach(curr => {
      newRow[`amount_${curr}`] =
        rowCurr === curr ? (row.total_amount ?? 0) : "-";
    });

    return newRow;
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

  if(col.column_name.includes("date")) {
    return formatDate(value) ?? "-";
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

  resetFiltersState(); // ✅ ADD THIS

  setReportType(type);

  await loadReport(id, dateFilters, type);
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

    const data = (res.data || []).map(normalizeKeys);

    // ❗ NO MASTER MAPPING ANYMORE

    const transformed = transformCurrencyRows(data);

    setRows(transformed);

    const dynamicCols = buildDynamicColumns(transformed);
    setColumns(dynamicCols);
    setColumns(dynamicCols);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const applyDateFilter = async () => {
  try {
    setLoading(true);
    setPage(1);

    const reportId = report?.report_id || id;

    await loadReport(
      reportId,
      dateFilters,
      reportType
    );

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const filteredRows = useMemo(() => {
  if (!search) return rows;

  const keyword = search.toLowerCase();

  return rows.filter((row) =>
    Object.values(row).some((val) =>
      String(val || "").toLowerCase().includes(keyword)
    )
  );
}, [rows, search]);


const summaryRows = filteredRows;

const indexedRows = useMemo(() => {
  return filteredRows.map((row, index) => ({
    ...row,
    _globalSn: index + 1,
    _group: row[groupBy] || "Unknown"
  }));
}, [filteredRows, groupBy]);

const groupedRows = useMemo(() => {
  if (!report?.is_detailed || !groupBy) return [];

  return Object.entries(
    indexedRows.reduce((acc, row) => {
      const key = row[groupBy] || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {})
  );
}, [indexedRows, groupBy, report]);

const visibleDetailedColumns = useMemo(() => {
  if (!columns?.length) return [];

  if (reportType !== "detailed") return columns;

  return columns.filter(
    (col) => col.column_name !== report?.group_by
  );
}, [columns, reportType, report]);



const detailedFlatRows = useMemo(() => {
  if (reportType !== "detailed") return [];

  return filteredRows.map((row) => ({
    ...row,
    _group: row[groupBy] || "Unknown",
  }));
}, [filteredRows, groupBy, reportType]);

const paginatedRows = filteredRows.slice(
  (page - 1) * pageSize,
  page * pageSize
);

const paginatedDetailedRows = useMemo(() => {
  return indexedRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
}, [indexedRows, page]);

const fullGroupedRows = useMemo(() => {
  if (reportType !== "detailed") return [];

  return Object.entries(
    filteredRows.reduce((acc, row) => {
      const key = row[groupBy] || "Unknown";

      if (!acc[key]) acc[key] = [];
      acc[key].push(row);

      return acc;
    }, {})
  );
}, [filteredRows, groupBy, reportType]);

// const paginatedGroupedRows = useMemo(() => {
//   if (reportType !== "detailed") return [];

//   const group = fullGroupedRows[page - 1];

//   if (!group) return [];

//   const [groupName, rows] = group;

//   return [[
//     groupName,
//     rows.map((row, idx) => ({
//       ...row,
//       _sn: idx + 1
//     }))
//   ]];
// }, [fullGroupedRows, page, reportType]);

// const totalPages =
//   reportType === "detailed"
//     ? fullGroupedRows.length
//     : Math.ceil(filteredRows.length / pageSize);
 const isRightAligned = (col) => {
      const name = (col.column_name || "").toLowerCase();
      return name.includes("bc") || name.includes("cr") || name.includes("cost") || name.includes("total") || name.includes("amount");
    };

    const groupSerialMap = useMemo(() => {
  const map = {};

  if (reportType !== "detailed") return map;

  const grouped = filteredRows.reduce((acc, row) => {
    const key = row[groupBy] || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  Object.keys(grouped).forEach(group => {
    map[group] = grouped[group].map((_, idx) => idx + 1);
  });

  return map;
}, [filteredRows, groupBy, reportType]);

const enrichedRows = useMemo(() => {
  if (reportType !== "detailed") return [];

  const grouped = filteredRows.reduce((acc, row) => {
    const key = row[groupBy] || "Unknown";

    if (!acc[key]) acc[key] = [];

    acc[key].push(row);

    return acc;
  }, {});

  Object.keys(grouped).forEach(group => {
    grouped[group] = grouped[group].map((row, idx) => ({
      ...row,
      _sn: idx + 1
    }));
  });

  return grouped;
}, [filteredRows, groupBy, reportType]);

const isNumericColumn = (col) =>
  col.column_name?.toLowerCase().includes("cr") ||
  col.column_name?.toLowerCase().includes("bc") ||
  col.column_name?.toLowerCase().includes("cost") ||
  col.column_name?.toLowerCase().includes("total") ||
  col.column_name?.toLowerCase().includes("amount");

const parseNum = (val) =>
  isNaN(parseFloat((val ?? "0").toString().replace(/,/g, "")))
    ? 0
    : parseFloat((val ?? "0").toString().replace(/,/g, ""));
    
const totalColIndex = columns.findIndex(col =>
  col.column_name?.toLowerCase().includes("total_amount_aed")
);

const groupedPages = useMemo(() => {
  if (reportType !== "detailed") return [];

  const pages = [];
  const maxRows = 10;

  let currentPage = [];
  let currentCount = 0;

  fullGroupedRows.forEach(([groupName, groupRows]) => {
    const groupCount = groupRows.length;

    // Large group (>10) gets its own page
    if (groupCount > maxRows) {
      // Save current page first
      if (currentPage.length) {
        pages.push(currentPage);
        currentPage = [];
        currentCount = 0;
      }

      pages.push([
        [
          groupName,
          groupRows.map((row, idx) => ({
            ...row,
            _sn: idx + 1,
          })),
        ],
      ]);

      return;
    }

    // Doesn't fit in current page -> start a new page
    if (currentCount + groupCount > maxRows) {
      pages.push(currentPage);
      currentPage = [];
      currentCount = 0;
    }

    currentPage.push([
      groupName,
      groupRows.map((row, idx) => ({
        ...row,
        _sn: idx + 1,
      })),
    ]);

    currentCount += groupCount;
  });

  if (currentPage.length) {
    pages.push(currentPage);
  }

  return pages;
}, [fullGroupedRows, reportType]);

const paginatedGroupedRows =
  groupedPages[page - 1] || [];

const totalPages =
  reportType === "detailed"
    ? groupedPages.length
    : Math.ceil(filteredRows.length / pageSize);

const grandTotalRow = useMemo(() => {
  return buildTotalRow(filteredRows, visibleDetailedColumns);
}, [filteredRows, visibleDetailedColumns]);

const firstAmountIndex = visibleDetailedColumns.findIndex(col =>
  col.column_name?.toLowerCase().startsWith("amount_")
);

const totalLabelIndex =
  firstAmountIndex > 0 ? firstAmountIndex - 1 : 0;

const resetFiltersState = () => {
  setFilters([]);
  setSearch("");
  setSearchColumnKey(null);
  setPage(1);
  setActiveDateFilter(null);

  const defaults = getCurrentMonth();
  setDateFilters(defaults);
};




    return (
        <div className="h-full flex flex-col">
            
            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800 truncate">
                    {report?.description || "Loading..."} {reportType === "detailed" ? "(Detailed)" : "(Summary)"}
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
  {paginatedGroupedRows.map(([groupName, groupRows]) => {
    const groupTotal = buildTotalRow(groupRows, visibleDetailedColumns);

    return (
      <React.Fragment key={groupName}>
        {/* GROUP HEADER */}
        <tr>
          <td
            colSpan={visibleDetailedColumns.length + 1}
            className="bg-gray-200 font-bold px-4 py-3"
          >
            {(displayNames?.[report?.group_by] ||
              report?.group_by ||
              "GROUP"
            ).toUpperCase()}
            {" : "}
            {groupName}
          </td>
        </tr>

        {/* GROUP ROWS */}
        {groupRows.map((row, i) => (
          <tr key={i}>
            <td className="px-4 py-3 border-b">
              {row._sn}
            </td>

            {visibleDetailedColumns.map((col) => (
              <td
                key={col.column_name}
                className={`px-4 py-3 border-b ${
                  isRightAligned(col)
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {getCellValue(row, col)}
              </td>
            ))}
          </tr>
        ))}

        {/* GROUP TOTAL */}
    <tr className="bg-gray-100 font-bold">
  <td></td>

  {visibleDetailedColumns.map((col, index) => {
    const isLabelColumn = index === firstAmountIndex - 1;

    return (
      <td
        key={col.column_name}
        className={`px-4 py-3 ${
          isRightAligned(col) ? "text-right" : "text-left"
        } ${isLabelColumn ? "font-bold" : ""}`}
      >
        {isLabelColumn
          ? "TOTAL"
          : isNumericColumn(col)
          ? formatAmount(groupTotal[col.column_name])
          : ""}
      </td>
    );
  })}
</tr>
      </React.Fragment>
    );
  })}

  {/* GRAND TOTAL - ONLY LAST PAGE */}
  {page === totalPages && (
    <tr className="bg-gray-100 font-bold">
  <td></td>

  {visibleDetailedColumns.map((col, index) => {
    const isLabelColumn = index === totalLabelIndex;

    return (
      <td
        key={col.column_name}
        className={`px-4 py-3 ${
          isRightAligned(col) ? "text-right" : "text-left"
        } ${isLabelColumn ? "font-bold" : ""}`}
      >
        {isLabelColumn
          ? "GRAND TOTAL"
          : isNumericColumn(col)
          ? formatAmount(grandTotalRow[col.column_name])
          : ""}
      </td>
    );
  })}
</tr>
  )}
</tbody>
      </table>
    </div>

  ) : (
    /* ================= SUMMARY ================= */
    <div className="overflow-x-auto">
      <table className="min-w-max w-full text-sm border-separate border-spacing-0">

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
      <>
        {/* ROWS */}
        {paginatedRows.map((row, i) => (
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
        ))}

        {/* ================= TOTAL ROW ================= */}
   <tr className="bg-gray-200 font-bold">

  {/* SN column */}
  <td className="px-4 py-3 text-center"></td>

  {columns.map((col, i) => {
    const total = filteredRows.reduce(
  (sum, r) => sum + parseNum(r?.[col.column_name]),
  0
);

    const isTotalLabelColumn = i === totalColIndex - 1;

    return (
      <td
        key={col.column_name}
        className={`px-4 py-3 ${
          isRightAligned(col) ? "text-right" : "text-left"
        } ${isTotalLabelColumn ? "text-right font-bold" : ""}`}
      >
        {isTotalLabelColumn
          ? "TOTAL"
          : isNumericColumn(col)
            ? formatAmount(total)
            : ""}
      </td>
    );
  })}

</tr>
      </>
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
{console.log("company sening to customize drawer", company)}
<CustomizeDrawer
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
/>

 <TableFiltersDrawer
  open={showFilters}
  onClose={() => setShowFilters(false)}
  onSearch={handleSearch}
  masterList={masterList}
  filters={filters}
  setFilters={setFilters}
  currencies={currencies}
  masterDataMap={masterDataMap}
  setMasterDataMap={setMasterDataMap}

/>



        </div>



    );
}