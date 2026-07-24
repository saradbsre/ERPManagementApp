import React,{ useEffect, useState, useRef, useLayoutEffect, act, use, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import {  getModuleData, getMasterValues, getReportData, fetchMasters, getDisplayName, reportPdf, getYearlyExpiryReport, upsertCustomizedColumns ,getReportCustomizedColumns  } from "../../api/api";
import { openPrintWindow } from "../../utils/PrintHelper";
import logo from "../../assets/headero.png";
import TableFilters from "../filters/TableFilters";
import { applyFilters } from "../../utils/applyFilters";
import { reportToExcel } from "../../utils/export";
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
import { EyeIcon } from "@heroicons/react/24/outline";

import ShowHideColumnsPopup from "../tables/ShowHideColumnsPopup";
import { createPortal } from "react-dom";
import { Funnel, SearchX } from "lucide-react";
export default function ReportTable() {
    const { id } = useParams();
    //console.log("ReportTable ID:", id);
    const location = useLocation();
    //console.log("ReportTable Location State:", location.state);
    const [report, setReport] = useState(location.state?.report || null);
   // console.log("ReportTable report:", report);
    const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false);
    const [columns, setColumns] = useState([]);
   const [appliedFilters, setAppliedFilters] = useState([]);
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
    const currentModule =  null;
    const currentReport =  report?.report_id;
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
    const [yearFilter, setYearFilter] = useState("currentYear");
    const [pinnedColumns, setPinnedColumns] = useState([]);
    const [visibleColumnsState, setVisibleColumnsState] = useState([]);
    const [savedTableColumns, setSavedTableColumns] = useState([]);
const [showHidePopup, setShowHidePopup] = useState(false);
const [hidePopupColumn, setHidePopupColumn] = useState(null);
const [tempHideColumns, setTempHideColumns] = useState([]);
const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
const [columnOrder, setColumnOrder] = useState([]);
const snoRef = useRef(null);
const dragIndexRef = useRef(null);
const isYearlyReport =
  String(report?.report_id || "").toUpperCase() === "R011";
    const isSummary = report?.is_detailed === true;
   
const allowDetailed =
  report?.is_detailed === true || isYearlyReport;
    const [masters, setMasters] = useState([]);
    const [displayNames, setDisplayNames] = useState({});
    const groupBy = report?.group_by || null;
    
    const equivalentReportId = report?.eqnt_report;
const showEquivalent = report?.is_equivalent === true && equivalentReportId;

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

  // Do not rebuild columns for Yearly Detailed.
  // Backend already returns payment transaction module columns.
  if (isYearlyReport && reportType === "detailed") return;

  const dynamicCols = buildDynamicColumns(rows);
  setColumns(dynamicCols);

}, [displayNames, rows, isYearlyReport, reportType]);



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
const getYearRange = (type = "all") => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const format = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (!type || type === "all") {
    return {
      startDate: `${currentYear - 1}-01-01`,
      endDate: `${currentYear + 1}-12-31`,
    };
  }

  if (type === "lastYear") {
    return {
      startDate: `${currentYear - 1}-01-01`,
      endDate: `${currentYear - 1}-12-31`,
    };
  }

  if (type === "nextYear") {
    return {
      startDate: `${currentYear + 1}-01-01`,
      endDate: `${currentYear + 1}-12-31`,
    };
  }

  const currentMonthEnd = new Date(
    currentYear,
    now.getMonth() + 1,
    0
  );

  return {
    startDate: `${currentYear}-01-01`,
    endDate: format(currentMonthEnd),
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

const visibleColumns = useMemo(() => {
  if (!columns?.length) return [];

  if (!selectedColumns?.length) return columns;

  return columns.filter((col) =>
    selectedColumns.includes(col.column_name)
  );
}, [columns, selectedColumns]);


const visibleDetailedColumns = useMemo(() => {
  if (!visibleColumns?.length) return [];

  if (reportType !== "detailed") return visibleColumns;

  return visibleColumns.filter(
    (col) => col.column_name !== report?.group_by
  );
}, [visibleColumns, reportType, report]);


const getCurrentMonthRange = () => {
  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};



const handleExcel = async () => {
  console.log("Exporting to Excel...");

  const isDetailed =
    reportType === "detailed" && report?.is_detailed === true;

  const cols = isDetailed
    ? visibleDetailedColumns
    : columns;

  const moduleName = report?.description || "Report";

  const groups = isDetailed ? fullGroupedRows || [] : null;

  const exportRows = []; // ✅ NEW SAFE ARRAY
  let serialNo = 1;

  // ================= SUMMARY =================
  if (!isDetailed) {
    (rows || []).forEach((row) => {
      const newRow = {
        SNo: serialNo++
      };

      cols.forEach((col) => {
        newRow[col.display_name] = getCellValue(row, col);
      });

      exportRows.push(newRow); // ✅ FIXED
    });
  }

  // ================= DETAILED =================
  else {
    groups.forEach(([groupName, groupRows]) => {
      exportRows.push({
        SNo: "",
        Group: groupName,
        __type: "group_header"
      });

      groupRows.forEach((row) => {
        const newRow = {
          SNo: serialNo++,
          Group: groupName
        };

        cols.forEach((col) => {
          newRow[col.display_name] = getCellValue(row, col);
        });

        exportRows.push(newRow);
      });

      exportRows.push({
        SNo: "",
        Group: "",
        __type: "group_footer"
      });
    });
  }

  console.log("Final Excel rows:", exportRows);

  reportToExcel(
    exportRows,
    cols.map((c) => c.display_name),
    moduleName,
    groupBy,
    columns
  );
};


  




// useEffect(() => {
//   setPage(1);

//   if (id) {
//     loadReport(id, dateFilters);
//   }
// }, [id]);

useEffect(() => {
  const initReport = async () => {
    setPage(1);

    if (!id) return;

    if (isYearlyReport) {
      const allYearRange = getYearRange("all");

      setSearch("");
      setSearchColumnKey(null);
      setFilters([]);
      setAppliedFilters([]);

      setYearFilter("");
      setActiveDateFilter("");
      setDateFilters(allYearRange);

      setReportType("summary");

      await loadYearlyExpiryReport({
        selectedYearFilter: "all",
        selectedReportType: "summary",
        customDateFilters: allYearRange,
        customFilters: [],
      });

      return;
    }

    await loadReport(id, dateFilters);
  };

  initReport();
}, [id, isYearlyReport]);

const handleSearch = async (appliedFilters) => {
  try {
    setLoading(true);
    setPage(1);

    const payloadFilters = appliedFilters ?? filters ?? [];

    // =========================
    // YEARLY REPORT FILTER SEARCH
    // =========================
    if (isYearlyReport) {
      setFilters(payloadFilters || []);

      await loadYearlyExpiryReport({
        selectedYearFilter: activeDateFilter || yearFilter || "",
        selectedReportType: reportType,
        customDateFilters: dateFilters,
        customFilters: payloadFilters,
      });

      return;
    }

    // =========================
    // NORMAL REPORT FILTER SEARCH
    // =========================
    const reportId = report?.report_id || id;

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
    data = data.map(normalizeKeys);
    data = transformCurrencyRows(data);

    setRows(data);

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

const handleEquivalentReport = async () => {
  if (!report?.eqnt_report) return;

  try {
    setLoading(true);

    const reportId = report.eqnt_report;

    await loadReport(
      reportId,
      dateFilters,
      "equivalent"   // 👈 new mode
    );

    setReportType("equivalent");

  } catch (err) {
    console.error("Equivalent report load failed:", err);
  } finally {
    setLoading(false);
  }
};
     
const handleClear = async () => {
  try {
    setLoading(true);

    if (isYearlyReport) {
      const allYearRange = getYearRange("all");

      setSearch("");
      setSearchColumnKey(null);
      setFilters([]);
      setAppliedFilters([]);

      setYearFilter("");
      setActiveDateFilter("");
      setDateFilters(allYearRange);

      setReportType("summary");
      setPage(1);

      await loadYearlyExpiryReport({
        selectedYearFilter: "all",
        selectedReportType: "summary",
        customDateFilters: allYearRange,
        customFilters: [],
      });

      return;
    }

    const defaults = getCurrentMonth();

    setSearch("");
    setSearchColumnKey(null);
    setFilters([]);
    setAppliedFilters([]);
    setDateFilters(defaults);
    setActiveDateFilter("");
    setPage(1);

    await loadReport(id, defaults, reportType);
  } catch (err) {
    console.error("Clear failed:", err);
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

const formatPrintDate = (dateStr) => {
  if (!dateStr) return "";

  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

 const isNumeric = (key) =>
      key?.toLowerCase().includes("cr") ||
      key?.toLowerCase().includes("bc") ||
      key?.toLowerCase().includes("cost") ||
      key?.toLowerCase().includes("total") ||
      key?.toLowerCase().includes("amount");

    const dataRows = rows || [];
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

const moduleName = report?.description || "Report";
    const formattedTime = getFormattedDateTime();


    const fromDate = formatPrintDate(dateFilters.startDate);
    const toDate = formatPrintDate(dateFilters.endDate);
    

    
  const isDetailed =
    reportType === "detailed" && allowDetailed;
  const isEquivalent =
    reportType === "equivalent" && report?.is_equivalent === true;

  const reportTypeLabel = isEquivalent
    ? "Equivalent"
    : isDetailed
    ? "Detailed"
    : "Summary";

  const reportTitle = `${moduleName} ${reportTypeLabel} (${fromDate} to ${toDate})`;
  const getColumnWidth = (col) => {
  const name = (col.column_name || "").toLowerCase();

  if ( name.includes("com_code") ) return "160px";

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
    return "33px";
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

const handlePrint = () => {
  const printWindow = window.open("", "", "width=1200,height=900");
  if (!printWindow) return;

  const reportTitle = getReportTitle();
  const tableHtml = reportType === "detailed" && allowDetailed
    ? generateDetailedTable()
    : generateSummaryTable();
  const approvalHtml = generateApprovalHtml();
  const filterHtml = generateFilterHtml();
  const blankSpaceHtml = generateBlankSpaceHtml();
  const UserNameFormatted = activeUserName.charAt(0).toUpperCase() + activeUserName.slice(1).toLowerCase();
  const printedDate = getFormattedDateTime();

  printWindow.document.write(`
    <html>
      <head>
        ${getPrintStyles()}
      </head>
      <body>
        ${generateHeader(reportTitle)}
        ${tableHtml}
        ${approvalHtml}
        ${filterHtml}
        ${blankSpaceHtml}
         <script>
        (function () {
          const style = document.createElement('style');
          style.textContent = \`
            @media print {
              @page {
                
                @bottom-left {
                  content: "User: ${UserNameFormatted} | Printed: ${printedDate}";
                  font-size: 10px;
                  margin-bottom: 20mm;
                }
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 10px;
                  margin-bottom: 20mm;
                }
              }
            }\`;
          document.head.appendChild(style);
        })();

        window.onload = function() {
          window.focus();
          window.print();
        }
      </script>
      </body>
    </html>
  `);

  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
};

const getReportTitle = () => {
  const moduleName = report?.description || "Report";

  const fromDate = formatPrintDate(dateFilters.startDate);
  const toDate = formatPrintDate(dateFilters.endDate);

  const isDetailed =
    reportType === "detailed" && allowDetailed;

  const isEquivalent =
    reportType === "equivalent" && report?.is_equivalent;

  const type = isEquivalent
    ? "Equivalent"
    : isDetailed
    ? "Detailed"
    : "Summary";

  return `${moduleName} ${type} (${fromDate} to ${toDate})`;
};

const generateSummaryTable = () => {
  const totalRow = buildGroupTotal(rows, columns);

  return `
    <table>
      <tbody>
        <tr>
          <th class = "sno-col">S/N</th>
          ${columns
            .map(
              (c) => `
                <th class="${isRightAligned(c) ? "text-right" : "text-left"}">
                  ${c.display_name}
                </th>
              `
            )
            .join("")}
        </tr>

        ${rows
          .map(
            (row, i) => `
              <tr>
                <td style="text-align:center">${i + 1}</td>

                ${columns
                  .map(
                    (c) => `
                      <td class="${isRightAligned(c) ? "text-right" : "text-left"}">
                        ${getCellValue(row, c)}
                      </td>
                    `
                  )
                  .join("")}
              </tr>
            `
          )
          .join("")}

        <tr style="font-weight:bold;background:#e5e7eb;">
          <td></td>

          ${columns
            .map((c, i) => {
              const total = totalRow[c.column_name];

              const isLabel =
                i ===
                columns.findIndex((x) =>
                  x.column_name.toLowerCase().includes("amount")
                ) - 1;

              return `
                <td class="text-right">
                  ${
                    isLabel
                      ? "TOTAL"
                      : isNumeric(c.column_name)
                      ? formatAmount(total)
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
};

const generateDetailedTable = () => {
  const isR011 = report?.report_id === "R011";
  //console.log("visible colmns",yearlyVisibleColumns)
  const grandTotal = buildTotalRow(rows || [], yearlyVisibleColumns);

const firstAmountIndex = yearlyVisibleColumns.findIndex((c) => {
  const name = (c.column_name || "").toLowerCase();

  return (
    name.includes("amount") ||
    name.includes("price") ||
    name.includes("total")
  );
});

const totalLabelIndex =
  firstAmountIndex > 0 ? firstAmountIndex - 1 : yearlyVisibleColumns.length - 1;
  return `
    <table>
      <thead>
        <tr>
          <th style="width:20px; min-width:20px; max-width:20px;">S/N</th>
          ${yearlyVisibleColumns
            .map(
              (col) => `
                <th class="${isRightAligned(col) ? "text-right" : "text-left"}" style="width:${getColumnWidth(col)}">
                  ${col.display_name}
                </th>
              `
            )
            .join("")}
        </tr>
      </thead>

      <tbody>

        ${
          isR011
            ? `
              ${rows
                .map(
                  (row, i) => `
                    <tr>
                      <td style="text-align:center">${i + 1}</td>

                      ${yearlyVisibleColumns
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
            : fullGroupedRows
                .map(([groupName, groupRows]) => {
                  const groupTotal = buildTotalRow(
                    groupRows,
                    yearlyVisibleColumns
                  );

                  return `
                    <tr>
                      <td colspan="${yearlyVisibleColumns.length + 1}"
                          style="background:#e5e7eb;font-weight:bold;">
                        ${(
                          displayNames[report?.group_by] ||
                          report?.group_by ||
                          "GROUP"
                        ).toUpperCase()} :
                        ${groupName}
                      </td>
                    </tr>

                    ${groupRows
                      .map(
                        (row, i) => `
                          <tr>
                            <td style="text-align:center">${i + 1}</td>

                            ${yearlyVisibleColumns
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

                    <tr style="font-weight:bold;background:#f1f5f9;">
                      <td></td>

                      ${yearlyVisibleColumns
                        .map((col, index) => {
                          const isLabel = index === totalLabelIndex;

                          return `
                            <td class="text-right">
                              ${
                                isLabel
                                  ? "TOTAL"
                                  : isNumericColumn(col)
                                  ? formatAmount(groupTotal[col.column_name])
                                  : ""
                              }
                            </td>
                          `;
                        })
                        .join("")}
                    </tr>
                  `;
                })
                .join("")
        }

        <tr style="font-weight:bold;background:#e5e7eb;">
          <td></td>

          ${yearlyVisibleColumns
            .map((col, index) => {
              const isLabel = index === totalLabelIndex;

              return `
                <td class="text-right">
                  ${
                    isLabel
                      ? isR011
                        ? "TOTAL"
                        : "GRAND TOTAL"
                      : isNumericColumn(col)
                      ? formatAmount(grandTotal[col.column_name])
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
};

const generateHeader = (reportTitle) => `
<div class="report-page">
<div class="print-shell">
<div class="print-shell-header">
<div class="report-header">
  <div class="report-header-text">
    <h1 class="company-name">
      ABDULWAHED BIN SHABIB GROUP
    </h1>

    <h2 class="report-title">
      ${reportTitle}
    </h2>
  </div>
</div>
</div>
</div>
</div>
`;

const generateFilterHtml = () => {
  const appliedFilters = (filters || []).filter(
    (f) => f.master !== "dateFilters" && f.values?.length
  );

  if (appliedFilters.length === 0) return "";

  return `
    <div style="margin-top:15px;font-size:10px;">
      <div style="font-weight:bold;margin-bottom:6px;">
        Applied Filters
      </div>

      ${appliedFilters
        .map((f) => {
          const master = masterDataMap[f.master];

          const displayValues = (f.values || []).map((code) => {
            if (!master?.data) return code;

            const match = master.data.find(
              (item) => item.key === code
            );

            return match ? match.value : code;
          });

          return `
            <div style="margin-bottom:3px;">
              <span style="font-weight:bold;">
                ${f.master.charAt(0).toUpperCase() + f.master.slice(1)}:
              </span>
              ${displayValues.join(", ")}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
};

const generateApprovalHtml = () => `
<div class="print-footer-area" style="padding-top:10px;">
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
            <div class="approval-content">
              <div>${activeUserName ? activeUserName.toUpperCase() : "-"}</div>
              <div class="approval-dept">IT DEPARTMENT</div>
            </div>
          </td>

          <td>
            <div class="approval-content">
              <div>SARAD N.V / AKBAR J.J</div>
              <div class="approval-dept">IT DEPARTMENT</div>
            </div>
          </td>

          <td>
            <div class="approval-content">
              <div></div>
              <div class="approval-dept">ACCOUNTS</div>
            </div>
          </td>

          <td>
            <div class="approval-content">
              <div>MR KUMAR</div>
              <div class="approval-dept">FINANCE MANAGER</div>
            </div>
          </td>

          <td>
            <div class="approval-content">
              <div>MR SHABIB</div>
              <div class="approval-dept">FOUNDER & CEO</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
`;

const generateBlankSpaceHtml = () => `
  <div class="blank-space">
    *** SPACE INTENTIONALLY LEFT BLANK ***
  </div>
`;

const getPrintStyles = () => `
<style>

@page{
  ${
    reportType === "detailed" && allowDetailed
      ? "size:A4 landscape;"
      : "size:A4 portrait;"
  }
   margin: 8mm 7mm 10mm 7mm;
}

 body {
      font-family: "Times New Roman", serif;
      color: #1f2933;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 9px;
    }

  table {
   width: calc(100% - 2px);
  margin: 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
    border-left: 1px solid #ccc;
  border-right: 1px solid #ccc;
  margin-bottom: 4px;
  
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
      padding: 4px 2px !important;
      font-size: 8px;
      text-align: center;
      vertical-align: middle;
      line-height: 1.2;
      word-break: break-word;
    }

    tbody  {
      background: #f8fafc;
    } 

.text-right{
    text-align:right;
}

.text-left{
    text-align:left;
}
    
 .sno-col {
      width: 20px !important;
      font-weight: bold;
    }
.report-header {
  border: 1px solid #1f2937;
  border-radius: 6px;
  padding: 6px 10px;
  background: #fff;

  display: flex;
  justify-content: center;
  align-items: center;

  min-height: 60px;
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
  margin: 3px 0 0;
  text-transform: uppercase;
  white-space: nowrap;
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
  
  padding: 0 !important;
  background: #ffffff !important;
}

.print-shell-header {
  padding-bottom: 3px !important;
}

.report-page {
  width: 100%;
  min-height: auto;
  position: relative;
  padding: 4px 0 10px 0 !important;
  page-break-after: avoid;
  break-after: avoid;
}
.report-header-text {
  text-align: center;
  padding: 0 20px;
}

.approval-title {
  background: #e5e7eb;
  color: #111827;
  text-align: left !important;
  font-size: 8px;
  font-weight: bold;
  padding-left: 4px !important;
  border: 1px solid #111827;
}

.approval-table td {
  height: 100px !important;
  border: 1px solid #111827;
  padding: 0 !important;
  text-align: center;
  vertical-align: bottom !important;
}

.approval-content {
  padding-bottom: 8px;
  font-size: 8px;
  font-weight: bold;
}

.approval-dept {
  margin-top: 3px !important;
  font-size: 8px;
  color: #4b5563;
  font-weight: bold;
}
  .blank-space {
    display: block;
    text-align: center;
    font-size: 10px;
    font-weight: bold;
    margin: 10px 0;
}
</style>
`;

const handlePdf = async () => {
  try {
    const isDetailed =
      reportType === "detailed" && report?.is_detailed === true;

    const moduleName = report?.description || "Report";

    // ================= BASE DATA =================
    const rowsData = filteredRows.map(normalizeKeys);
    const transformedRows = transformCurrencyRows(rowsData);

    const cols = isDetailed
      ? visibleDetailedColumns
      : columns;

    // ================= FILTERS =================
    const pdfFilters = (filters || []).filter(
      (f) => f?.master !== "dateFilters"
    );

    const pdfDateFilters = {
      startDate: dateFilters.startDate,
      endDate: dateFilters.endDate,
    };

    let payload;

    // ================= SUMMARY / EQUIVALENT =================
    if (!isDetailed) {
      payload = {
        rows: transformedRows,
        columns: cols,
        moduleName,
        reportType,
        filters: pdfFilters,
        dateFilters: pdfDateFilters,
        userName : activeUserName || "",
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
          _sn: idx + 1,
        })),
      }));

      payload = {
        rows: grouped,
        columns: cols,
        moduleName,
        reportType,
        groupBy,
        filters: pdfFilters,
        dateFilters: pdfDateFilters,
      };
    }

    // ================= REPORT ID =================
    const reportId =
      reportType === "equivalent" && report?.eqnt_report
        ? report.eqnt_report
        : report?.report_id || id;

    // ================= API CALL =================
    const res = await reportPdf(
      reportId,
      activeUserEmail,
      payload
    );

    // ================= DOWNLOAD =================
    const url = window.URL.createObjectURL(
      new Blob([res.data], { type: "application/pdf" })
    );

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





// const handleQuickDateChange = (value) => {
//   setActiveDateFilter(value);

//   const range = getDateRange(value);

//   if (range) {
//     setDateFilters(range);
//   }
// };

const handleQuickDateChange = async (value) => {
  setActiveDateFilter(value);

  if (isYearlyReport) {
    const range = getYearRange(value || "all");

    setYearFilter(value || "");
    setDateFilters(range);
    setPage(1);

    await loadYearlyExpiryReport({
      selectedYearFilter: value || "all",
      selectedReportType: reportType,
      customDateFilters: range,
      customFilters: filters,
    });

    return;
  }

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
      !key.startsWith("amount_") &&
      key !== "monthly_amount_aed" &&
      key !== "yearly_amount_aed"
  );
const yearlyDisplayNames = {
  expiry_year: "Year",
  date: "Invoice Date",
  expiry_date: "Expiry Date",
  invoice_number: "Invoice No",
  com_code: "Company",
  vend_code: "Vendor",
  prd_code: "Product",
  prdtype_code: "Product Type",
  plan_code: "Plan",
  dep_code: "Department",
  dv_code: "Cost Center",
  billcycle_code: "Billing Cycle",
  curr_code: "Currency",
  amount: "Amount",
  vat_amount: "VAT Amount",
  total_amount: "Total Amount",
  total_amount_aed: "Total Amount AED",
  prf_num: "PRF No",
  remarks: "Remarks",
};
  const normalCols = baseKeys.map((key) => ({
    column_name: key,
   display_name: yearlyDisplayNames[key] || displayNames?.[key] || key
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
      display_name: isYearlyReport
  ? "Total Amount AED"
  : displayNames?.total_amount_aed || "Total Amount (AED)"
    });
  }

  if (
    firstRow.hasOwnProperty("monthly_amount_aed") ||
    firstRow.hasOwnProperty("Monthly_Amount_AED")
  ) {
    totalCols.push({
      column_name: "monthly_amount_aed",
      display_name: displayNames?.monthly_amount_aed || "Monthly Amount (AED)"
    });
  }

  if (
    firstRow.hasOwnProperty("yearly_amount_aed") ||
    firstRow.hasOwnProperty("Yearly_Amount_AED")
  ) {
    totalCols.push({
      column_name: "yearly_amount_aed",
      display_name: displayNames?.yearly_amount_aed || "Yearly Amount (AED)"
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
  const name = (col.column_name || "").toLowerCase();

  // ================= TOTAL ROW =================
  if (isTotalRow) {
    if (
      name.startsWith("cr") ||
      name.startsWith("bc") ||
      name.includes("amount") ||
      name.includes("price") ||
      name.includes("total") ||
      name.includes("aed")
    ) {
      return formatAmount(value);
    }

    // Don't mask payment method in total row
    if (name.includes("paymentmethod")) {
      return value ?? "-";
    }

    return value ?? "-";
  }

  // ================= DATE =================
  if (
    name.includes("date") ||
    name.includes("podate") ||
    name.includes("start") ||
    name.includes("end")
  ) {
    return formatDate(value) ?? "-";
  }

  // ================= NUMERIC COLUMNS =================
  if (
    name.startsWith("cr") ||
    name.startsWith("bc") ||
    name.includes("amount") ||
    name.includes("price") ||
    name.includes("total") ||
    name.includes("aed")
  ) {
    return formatAmount(value);
  }

  // ================= PAYMENT METHOD =================
  if (name.includes("paymentmethod")) {
    return value ? `**** ${value.slice(-4)}` : "-";
  }

  // ================= CUSTOM LABELS =================
  if (name.includes("monthly_amount_aed")) {
    return "Monthly Amount (AED)";
  }

  if (name.includes("yearly_amount_aed")) {
    return "Yearly Amount (AED)";
  }

  // ================= DEFAULT =================
  return value ?? "-";
};


const handleReportTypeChange = async (type) => {
  if (type === reportType) return;

  setReportType(type);
  setPage(1);

  if (isYearlyReport) {
    await loadYearlyExpiryReport({
      selectedYearFilter: activeDateFilter || yearFilter || "currentYear",
      selectedReportType: type, // important
      customDateFilters: dateFilters,
      customFilters: filters,
    });

    return;
  }

  await loadReport(id, dateFilters, type);
};

const loadYearlyExpiryReport = async ({
  selectedYearFilter = yearFilter,
  selectedReportType = reportType,
  customDateFilters = null,
  customFilters = filters,
} = {}) => {
  try {
    setLoading(true);

const params = {
  activeUserEmail,
  reportType: selectedReportType,
  yearFilter: selectedYearFilter,
  search,
  filters: JSON.stringify(customFilters || []),
};  

    if (customDateFilters) {
      params.dateFilters = JSON.stringify({
        date: {
          startDate: customDateFilters.startDate,
          endDate: customDateFilters.endDate,
        },
      });
    }

    const res = await getYearlyExpiryReport(params);

    let data = res.data?.rows || [];
    data = data.map(normalizeKeys);

    setRows(data);

    // =========================
    // YEARLY DETAILED
    // Use backend module_columns from module_id = 12
    // =========================
    if (selectedReportType === "detailed") {
      const apiColumns = res.data?.columns || [];

      const activeColumns = apiColumns.filter(
        (c) => c.is_active !== false
      );

      setColumns(activeColumns);

      const defaultVisible = activeColumns.map((c) => c.column_name);
      setSelectedColumns(defaultVisible);
    }

    // =========================
    // YEARLY SUMMARY
    // Build Year + Total Amount AED columns
    // =========================
    else {
      const dynamicCols = buildDynamicColumns(data);

      setColumns(dynamicCols);

      const defaultVisible = dynamicCols.map((c) => c.column_name);
      setSelectedColumns(defaultVisible);
    }

    if (res.data?.startDate && res.data?.endDate) {
      setDateFilters({
        startDate: res.data.startDate,
        endDate: res.data.endDate,
      });
    }

    setPage(1);
  } catch (err) {
    console.error("Yearly expiry report failed:", err);
    setRows([]);
    setColumns([]);
  } finally {
    setLoading(false);
  }
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

// const applyDateFilter = async () => {
//   try {
//     setLoading(true);
//     setPage(1);

//     const reportId = report?.report_id || id;

//     await loadReport(
//       reportId,
//       dateFilters,
//       reportType
//     );

//   } catch (err) {
//     console.error(err);
//   } finally {
//     setLoading(false);
//   }
// };


const applyDateFilter = async () => {
  try {
    setLoading(true);
    setPage(1);

    if (isYearlyReport) {
      setYearFilter("");
      setActiveDateFilter("");

      await loadYearlyExpiryReport({
        selectedYearFilter: "",
        selectedReportType: reportType,
        customDateFilters: dateFilters,
      });

      return;
    }

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

const yearlyVisibleColumns = useMemo(() => {
  if (!columns?.length) return [];

  // If nothing is saved, show all columns
  if (!visibleColumnsState?.length) return columns;

  return visibleColumnsState
    .map((name) => columns.find((c) => c.column_name === name))
    .filter(Boolean);
}, [columns, visibleColumnsState]);

useEffect(() => {
  setTempHideColumns(
    yearlyVisibleColumns.map((c) => c.column_name)
  );
}, [yearlyVisibleColumns]);

const yearlyDetailedColumns = useMemo(() => {
  if (!yearlyVisibleColumns?.length) return [];

  return yearlyVisibleColumns.filter(
    (col) => col.column_name !== report?.group_by
  );
}, [yearlyVisibleColumns, report]);


const openColumnPopup = () => {
  const rect = snoRef.current?.getBoundingClientRect();

  if (!rect) return;

  setMenuPosition({
    top: rect.bottom + 5,
    left: rect.left,
  });

  setHidePopupColumn("__sno__");

  setTempHideColumns(
    yearlyVisibleColumns?.length
      ? yearlyVisibleColumns.map((c) => c.column_name)
      : columns.map((c) => c.column_name)
  );

  setShowHidePopup(true);
};

const handleDragStart = (colName) => {
  dragIndexRef.current = colName;
};

const handleDrop = (dropColName) => {
  const dragColName = dragIndexRef.current;

  if (!dragColName || dragColName === dropColName) return;

  setSelectedColumns((prev) => {
    const current =
      prev?.length > 0 ? [...prev] : columns.map((c) => c.column_name);

    const dragIndex = current.indexOf(dragColName);
    const dropIndex = current.indexOf(dropColName);

    if (dragIndex === -1 || dropIndex === -1) return current;

    const [removed] = current.splice(dragIndex, 1);
    current.splice(dropIndex, 0, removed);

    return current;
  });

  dragIndexRef.current = null;
};

const saveColumnSelection = async (selectedCols = []) => {
  try {
    const columnSettings = {
      visibleColumns: selectedCols,
      pinnedColumns: pinnedColumns || [],
    };

    await upsertCustomizedColumns(
      currentModule,
      activeUserEmail,
      columnSettings,
      currentReport
    );

    // ✅ UPDATE UI IMMEDIATELY (NO REFRESH NEEDED)
    setVisibleColumnsState(selectedCols);

    setSelectedColumns(selectedCols);
    setSavedTableColumns(selectedCols);
    

  } catch (err) {
    console.error("Failed to save customized columns:", err);
  }
};

const fetchCustomizedColumns = async () => {
  try {
    const res = await getReportCustomizedColumns(
      currentReport,
      activeUserEmail,
      currentModule,
    );

    const savedColumns = res?.data?.data?.columns;
    
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
  const init = async () => {
    const res = await fetchCustomizedColumns();

    setVisibleColumnsState(res?.visibleColumns || []);
    setPinnedColumns(res?.pinnedColumns || []);
  };

  init();
}, [id, activeUserEmail]);

            const NoRecordsRow = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className="p-0" style={{ padding: "20px 0px 0px 89px" }}>
      <div className="h-[120px] flex flex-col items-left justify-left text-left bg-white">
        

        <div className="text-sm font-semibold text-gray-600">
          No records found
        </div>

       
      </div>
    </td>
  </tr>
);
    return (
        <div className="h-full flex flex-col">
            
            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-4">

                <h1 className="text-xl font-semibold text-gray-800 truncate">
                    {report?.description || "Loading..."}{" "}
                    {reportType === "detailed"
                      ? "(Detailed)"
                      : reportType === "equivalent"
                      ? "(Equivalent)"
                      : "(Summary)"}
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

              {/* <button
                onClick={() => setShowCustomizeDrawer(true)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white 
                          hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition"
              >
                Customize
              </button> */}

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
               {isYearlyReport ? (
  <>
    <option value="">Quick Range</option>
    <option value="lastYear">Last Year</option>
    <option value="currentYear">Current Year</option>
    <option value="nextYear">Next Year</option>
  </>
) : (
  <>
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
  </>
)}
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

           <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl shadow-sm">

  <button
   
  onClick={() => handleReportTypeChange("summary")}
  disabled={!allowDetailed}
    className={`
      px-4 py-1.5 text-sm font-medium rounded-lg transition-all
      ${
        reportType === "summary"
          ? "bg-white text-blue-600 shadow"
          : "text-gray-600 hover:text-gray-900"
      }
      ${!allowDetailed ? "opacity-40 cursor-not-allowed" : ""}
    `}
  >
    Summary
  </button>

<button
  onClick={() => handleReportTypeChange("detailed")}
  disabled={!allowDetailed}
    className={`
      px-4 py-1.5 text-sm font-medium rounded-lg transition-all
      ${
        reportType === "detailed"
          ? "bg-white text-blue-600 shadow"
          : "text-gray-600 hover:text-gray-900"
      }
     ${!allowDetailed ? "opacity-40 cursor-not-allowed" : ""}
    `}
  >
    Detailed
  </button>

  {showEquivalent && (
    <button
      onClick={() => handleEquivalentReport()}
      className={`
        px-4 py-1.5 text-sm font-medium rounded-lg transition-all
        ${
          reportType === "equivalent"
            ? "bg-white text-blue-600 shadow"
            : "text-gray-600 hover:text-blue-600"
        }
      `}
    >
      Equivalent
    </button>
  )}
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
) : reportType === "detailed" && allowDetailed ? (
  <div className="overflow-auto max-h-[calc(100vh-260px)]">
    <table className="min-w-max w-full text-sm border-separate border-spacing-0">
      <thead className="bg-gray-100 text-gray-700 text-xs uppercase sticky top-0 z-10">
        <tr>
          <th
            ref={snoRef}
            onClick={openColumnPopup}
            className="group relative px-4 py-3 border-b text-left sticky left-0 z-40 bg-gray-100 w-16 min-w-16 border-r border-gray-200 cursor-pointer"
          >
            <span className="group-hover:opacity-0 transition">
              S.No
            </span>

            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-gray-500">
              <EyeIcon className="w-6 h-6" />
            </span>
          </th>

          {yearlyDetailedColumns.map((col) => (
            <th
              key={col.column_name}
              draggable
              onDragStart={() => handleDragStart(col.column_name)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.column_name)}
              className={`px-4 py-3 border-b relative select-none cursor-move ${
                isRightAligned(col) ? "text-right" : "text-left"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>{col.display_name}</span>
                <span className="text-gray-400">▾</span>
              </div>
            </th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y">
        {paginatedGroupedRows.length === 0 ? (
         <NoRecordsRow colSpan={yearlyDetailedColumns.length + 1} />
        ) : (
          paginatedGroupedRows.map(([groupName, groupRows]) => {
            const groupTotal = buildTotalRow(
              groupRows,
              yearlyDetailedColumns
            );




            return (
              <React.Fragment key={groupName}>
                {report?.group_by && (
                  <tr>
                    <td
                      colSpan={yearlyDetailedColumns.length + 1}
                      className="bg-gray-100 px-5 py-3 font-bold text-gray-800"
                    >
                      GROUP : {groupName}
                    </td>
                  </tr>
                )}

                {groupRows.map((row, i) => (
                  <tr
                    key={row.id ?? i}
                    className="group hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-20 bg-white group-hover:bg-gray-50 w-16 min-w-16 border-r border-gray-200">
                      {row._sn || i + 1}
                    </td>

                    {yearlyDetailedColumns.map((col) => (
                      <td
                        key={col.column_name}
                        className={`px-4 py-3 whitespace-nowrap border-b ${
                          isRightAligned(col) ? "text-right" : "text-left"
                        }`}
                      >
                        {getCellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}

                <tr className="bg-gray-100 font-bold">
                  <td></td>

                  {yearlyDetailedColumns.map((col, index) => {
                    const isLabelColumn = index === totalLabelIndex;

                    return (
                      <td
                        key={col.column_name}
                        className={`px-4 py-3 ${
                          isRightAligned(col) ? "text-right" : "text-left"
                        }`}
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
          })
        )}

        {/* {page === totalPages && paginatedGroupedRows.length > 0 && (
          <tr className="bg-gray-200 font-bold">
            <td></td>

            {yearlyDetailedColumns.map((col, index) => {
              const isLabelColumn = index === totalLabelIndex;

              return (
                <td
                  key={col.column_name}
                  className={`px-4 py-3 ${
                    isRightAligned(col) ? "text-right" : "text-left"
                  }`}
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
        )} */}
      </tbody>
    </table>

    {showHidePopup && hidePopupColumn === "__sno__" &&
      createPortal(
        <div
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999,
          }}
        >
          {console.log("Rendering ShowHideColumnsPopup with columns:", yearlyVisibleColumns.map((c) => c.column_name))}
          {console.log("Temp hide columns:", tempHideColumns)}
          <ShowHideColumnsPopup
            columns={columns}
            tempHideColumns={tempHideColumns}
            setTempHideColumns={setTempHideColumns}
            onCancel={() => {
              setShowHidePopup(false);
              setHidePopupColumn(null);
            }}
            onSave={ async (selectedColumnsFromDrag) => {
              setSelectedColumns(selectedColumnsFromDrag);
              setTempHideColumns(selectedColumnsFromDrag);
              await saveColumnSelection(selectedColumnsFromDrag);
              setShowHidePopup(false);
              setHidePopupColumn(null);
            }}
          />
        </div>,
        document.body
      )}
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
     <NoRecordsRow colSpan={columns.length + 1} />
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
