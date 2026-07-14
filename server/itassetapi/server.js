 const { Router } = require("express");
const cors = require("cors");
require("dotenv").config();
const userRoutes = require("./routes/user");
const authRoutes = require("./routes/auth");
const sessionRoutes = require("./routes/session");
const dataRoutes = require("./routes/data");
const importRoutes = require("./routes/import");
const masterRoutes = require("./routes/master");
const dashboardRoutes = require("./routes/dashboard");
const logsRoutes = require("./routes/logs");
const reportRoutes = require("./routes/reports");
const paymentReqRoutes = require("./routes/paymentReq");
const profileRoutes = require("./routes/profile");
const pdfRoutes = require("./routes/pdf");
const fs = require("fs");
const path = require("path");
const PdfPrinter = require("pdfmake/src/printer");
const router = Router();
const cookieParser = require("cookie-parser");
const { authenticateToken } = require("././middleware/auth");
const { poolPromise } = require("./db/db"); 

require("./cron/sectionCron"); 

router.use(cookieParser());

// const app = express();

router.use(cors({
  origin: [
    "https://erpmanagementapp-frontend.onrender.com", "https://erp.binshabibgroup.ae",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
// router.use(router.json());

router.get("/db-status", async (req, res) => {
  try {
    const pool = await poolPromise;
    console.log("DB Connection Successful");
    // Simple query to check connection
    await pool.request().query("SELECT 1");
    res.json({ status: "connected" });
  } catch (err) {
    res.status(500).json({ status: "disconnected", error: err.message });
  }
});   //test

router.use("/auth", authRoutes);

router.use( authenticateToken, userRoutes);

router.use( sessionRoutes);

router.use( dataRoutes);

router.use( importRoutes);

router.use( masterRoutes);

router.use(dashboardRoutes);

router.use(logsRoutes);

router.use(reportRoutes);

router.use(paymentReqRoutes);

router.use(profileRoutes);

router.use("/pdf", pdfRoutes);

//router.use( require("./datainsert"));

const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });

const fonts = {
  Roboto: {
    normal: path.join(__dirname, 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
    bold: path.join(__dirname, 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
    italics: path.join(__dirname, 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf')
  },
   Tinos: {
    normal: path.join(__dirname, 'fonts/Tinos/Tinos-Regular.ttf'),
    bold: path.join(__dirname, 'fonts/Tinos/Tinos-Bold.ttf'),
    italics: path.join(__dirname, 'fonts/Tinos/Tinos-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts/Tinos/Tinos-BoldItalic.ttf')
  },
   Times: {
    normal: path.join(__dirname, 'fonts/times.ttf'),
   }
};
const printer = new PdfPrinter(fonts);

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB"); 
  // output: 14/05/2026
};

const getColumnWidth = (col) => {
  const name = (col?.column_name || "").toLowerCase();
  const type = (col?.data_type || "").toLowerCase();

  if (type === "date" || name.includes("date")) return 60;

  if (name.includes("currency")) return 40;
  if (name.includes("term")) return 50;
  if (name.includes("department")) return 80;

  if (name.includes("company")) return 180;
  if (name.includes("id")) return 50;
  if (name.includes("name")) return 120;
  if (name.includes("email")) return 150;
  if (name.includes("card")) return 70;

  // 🔥 IMPORTANT FIX
  if (name.includes("amount") || name.includes("price") || name.includes("total"))
    return 80;

  return 80; // default (NOT 40, 40 is too small in pdf)
};

const formatDateFilter = (dateStr) => {
  if (!dateStr) return "-";

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

router.post("/pdf", async (req, res) => {
  try {
    const {
      rows = [],
      columns = [],
      userName = "Admin",
      moduleName = "",
      companyName = "",
      groupBy = "service"
    } = req.body;

    const safeLower = (v) => (v || "").toString().toLowerCase();

    const now = new Date();

// Format Dubai time (UTC+4)
const dubaiTime = new Date(now.getTime());

let day = String(dubaiTime.getDate()).padStart(2, '0');
let month = String(dubaiTime.getMonth() + 1).padStart(2, '0');
let year = dubaiTime.getFullYear();

let hours = dubaiTime.getHours();
const minutes = String(dubaiTime.getMinutes()).padStart(2, '0');

const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12;
hours = hours ? hours : 12;
hours = String(hours).padStart(2, '0');

const downloadDate = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

    // ================= FORMAT DATE =================
    const formatDate = (value) => {
      if (!value) return "-";
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString("en-GB");
    };

    const isTotalColumn = (col) =>
      safeLower(col.column_name).includes("total");

    const isNumberColumn = (col) => {
      const n = safeLower(col.column_name);
      return (
        n.includes("amount") ||
        n.includes("price") ||
        n.includes("total") ||
        n.includes("vat")
      );
    };

    const maskCard = (value) => {
      const str = String(value || "");
      return str.length > 4 ? `**** **** **** ${str.slice(-4)}` : str;
    };

    // ================= FLATTEN GROUPS =================
    const flatRows = rows.flatMap(g => g.rows || []);

    // ================= CURRENCY COLUMNS =================
    const currencies = [...new Set(flatRows.map(r => r.currency).filter(Boolean))];

    const currencyColumns = currencies.map(cur => ({
      column_name: `amount_${cur.toLowerCase()}`,
      display_name: `Amount (${cur})`,
      data_type: "number",
      currency: cur,
      isDynamicCurrency: true
    }));

    const baseColumns = columns.filter(col =>
      col.column_name !== "amount" &&
      col.column_name !== "currency"
    );

    const allCols = [
      ...baseColumns,
      ...currencyColumns,
      ...columns.filter(c => c.column_name === "total_amount_aed")
    ];

    // ================= GROUP DATA =================
    const groupedRows = rows.reduce((acc, groupObj) => {
      const groupName = groupObj.group || "All Records";

      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(...(groupObj.rows || []));

      return acc;
    }, {});

    // ================= WIDTH SYSTEM =================
   const getColumnWidths = (cols) => {
  const widths = [];

  // S.No fixed small
  widths.push(12);

  cols.forEach((col) => {
    const n = safeLower(col.display_name);

    // DATE → small fixed
    if (n.includes("date")) return widths.push(30);

    // AMOUNT / TOTAL → small fixed
    if (n.includes("amount") || n.includes("total")) return widths.push(25);

    // SHORT FIELDS → medium
    if (n.includes("term")) return widths.push(25);
    if (n.includes("department")) return widths.push(40);
    if (n.includes("center")) return widths.push(40);
    if (n.includes("card") || n.includes("credit")) return widths.push(50);
    if (n.includes("types")) return widths.push(40);
    // 🚀 IMPORTANT: BIG TEXT COLUMNS → FLEX (THIS FIXES YOUR ISSUE)
    if (
      n.includes("company") ||
      n.includes("name") ||
      n.includes("description")
    ) {
      return widths.push("*");
    }

    // DEFAULT → flexible
    return widths.push(30);
  });

  return widths;
};

    // ================= GRAND TOTAL =================
    const grandTotals = {};
    allCols.forEach(c => {
      if (isTotalColumn(c)) {
        grandTotals[c.column_name] = 0;
      }
    });

    const content = [];

    // ================= HEADER =================
    content.push({
      text: `${companyName || ""}\n${moduleName || ""}`,
      alignment: "center",
      bold: true,
      fontSize: 14,
      margin: [0, 0, 0, 20]
    });

    // ================= TABLES =================
    Object.entries(groupedRows).forEach(([groupName, groupData]) => {

      const groupTotals = {};
      allCols.forEach(c => {
        if (isTotalColumn(c)) {
          groupTotals[c.column_name] = 0;
        }
      });

      const body = [];

      // ================= HEADER ROW =================
      body.push([
        { text: "S.No", bold: true },
        ...allCols.map(c => ({
          text: c.display_name || c.column_name,
          bold: true
        }))
      ]);

      // ================= DATA ROWS =================
      groupData.forEach((row, i) => {

        const rowCells = allCols.map(col => {
          let value = "";

          // dynamic currency
          if (col.isDynamicCurrency) {
            value = row.currency === col.currency ? row.amount : "";
          } else {
            value = row[col.column_name];
          }

          if (value && typeof value === "object") {
            value = value.value ?? value.label ?? "";
          }

          // DATE
          if (col.data_type === "date" || col.data_type === "datetime" || safeLower(col.column_name).includes("date")) {
            return {
              text: formatDate(value),
              alignment: "center",
              noWrap: false
            };
          }

          // CREDIT CARD
          if (
            safeLower(col.column_name).includes("card") ||
            safeLower(col.column_name).includes("credit")
          ) {
            const v = String(value || "");
            return {
              text: v.length > 4 ? `**** **** **** ${v.slice(-4)}` : v,
              alignment: "center",
              noWrap: false
            };
          }

          // NUMBER
          if (isNumberColumn(col)) {
            const num = Number(value || 0);

            return {
              text: isNaN(num) ? "-" : num.toFixed(2),
              alignment: "right",
              noWrap: false
            };
          }

          // TEXT (IMPORTANT: WRAP ENABLED)
          return {
            text: value ?? "-",
            alignment: "center",
            noWrap: false
          };
        });

        body.push([
          { text: i + 1, alignment: "center", noWrap: false },
          ...rowCells
        ]);

        // ================= GROUP TOTALS =================
        allCols.forEach(col => {
          if (isTotalColumn(col)) {
            const val = Number(row[col.column_name] || 0);

            groupTotals[col.column_name] =
              (groupTotals[col.column_name] || 0) + val;

            grandTotals[col.column_name] =
              (grandTotals[col.column_name] || 0) + val;
          }
        });
      });

      // ================= GROUP TOTAL ROW =================
      const totalRow = [
        { text: "TOTAL", bold: true, alignment: "right" }
      ];

      allCols.forEach(col => {
        if (!isTotalColumn(col)) {
          totalRow.push({ text: "" });
        } else {
          totalRow.push({
            text: (groupTotals[col.column_name] || 0).toFixed(2),
            bold: true,
            alignment: "right"
          });
        }
      });

      body.push(totalRow);

      content.push({
        text: groupName,
        bold: true,
        alignment: "center",
        margin: [0, 10, 0, 5]
      });

      content.push({
        table: {
          headerRows: 1,
          widths: getColumnWidths(allCols),
          body
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? "#eeeeee" : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2
        },
        margin: [0, 0, 0, 10]
      });
    });

    // ================= GRAND TOTAL =================
    const grandBody = [
      [
        { text: "GRAND TOTAL", bold: true, alignment: "right" },
        ...allCols.map(col => {
          if (!isTotalColumn(col)) return { text: "" };

          return {
            text: (grandTotals[col.column_name] || 0).toFixed(2),
            bold: true,
            alignment: "right"
          };
        })
      ]
    ];

    content.push({
      table: {
        widths: getColumnWidths(allCols),
        body: grandBody
      },
      layout: {
        fillColor: () => "#ddd",
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5
      },
      margin: [0, 20, 0, 0]
    });

    // ================= PDF DOC =================
    const docDefinition = {
      pageSize: "A4",
      pageOrientation: "landscape",
      pageMargins: [20, 30, 20, 30],

      defaultStyle: {
        fontSize: 5
      },

      content,
         footer: function (currentPage, pageCount) {
        return {
          margin: [40, 0, 50, 0],
          columns: [
            {
              width: 'auto',
              stack: [
                { text: `User: ${userName || 'Admin'} | Printed: Date/Time: ${downloadDate}`, alignment: 'left', fontSize: 8 }
              ]
            },
            { width: '*', text: '' },
            {
              width: 'auto',
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: 'right',
              fontSize: 8
            }
          ]
        };
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");

    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).send("PDF generation failed");
  }
});

router.post("/report-pdf", async (req, res) => {
  try {
    const {
      rows = [],
      columns = [],
      companyName = "",
      moduleName = "",
      reportType = "summary",
      filters = [],
      dateFilters = {},
      userName = "Admin"
    } = req.body;

    const safeLower = (v) => (v || "").toString().toLowerCase();

    const reportTypeLabel =
  reportType === "detailed"
    ? "Detailed"
    : reportType === "equivalent"
    ? "Equivalent"
    : "Summary";

const reportTitle = `${moduleName} (${reportTypeLabel})`;

    // ================= HELPERS =================
    const isNumericCol = (col) =>
      safeLower(col.column_name).includes("amount") ||
      safeLower(col.column_name).includes("total") ||
      safeLower(col.column_name).includes("cost") ||
      safeLower(col.column_name).includes("cr") ||
      safeLower(col.column_name).includes("bc");

    // convert ANY invalid / 0 / 0.00 / "-" to null
    const normalizeNumber = (v) => {
      const n = Number(v);
      if (!v || v === "-" || isNaN(n) || n === 0) return null;
      return n;
    };

    const formatValue = (col, value) => {
      if (safeLower(col.column_name).includes("date")) {
        const d = new Date(value);
        return isNaN(d.getTime()) ? (value ?? "-") : d.toLocaleDateString("en-GB");
      }

      if (isNumericCol(col)) {
        const n = normalizeNumber(value);
        return n === null ? "-" : n.toFixed(2);
      }

      return value ?? "-";
    };

  // ================= GROUPING =================
const isDetailed = reportType === "detailed";

const groupedRows = isDetailed
  ? rows.reduce((acc, g) => {
      acc[g.groupName || "UNKNOWN"] = g.rows || [];
      return acc;
    }, {})
  : { ALL: rows };

const now = new Date();

// Format Dubai time (UTC+4)
const dubaiTime = new Date(now.getTime());

let day = String(dubaiTime.getDate()).padStart(2, '0');
let month = String(dubaiTime.getMonth() + 1).padStart(2, '0');
let year = dubaiTime.getFullYear();

let hours = dubaiTime.getHours();
const minutes = String(dubaiTime.getMinutes()).padStart(2, '0');

const ampm = hours >= 12 ? 'PM' : 'AM';
hours = hours % 12;
hours = hours ? hours : 12;
hours = String(hours).padStart(2, '0');

const downloadDate = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

// ================= APPLIED FILTERS =================
const filterTable = [];

(filters || [])
  .filter(f => f?.master !== "dateFilters")
  .forEach(f => {
    filterTable.push([
      {
        text:
          f.master.charAt(0).toUpperCase() +
          f.master.slice(1),
        bold: true,
        fillColor: "#eeeeee"
      },
      {
        text: (f.values || [])
          .map(v => v.value)
          .join(", ")
      }
    ]);
  });

// ================= TABLE WIDTHS =================
const getWidths = () => {

  // SUMMARY / EQUIVALENT -> full width smart layout
  if (reportType === "summary" || reportType === "equivalent") {
    return [
      30, // S/N fixed

      ...columns.map(col => {
        const n = safeLower(col.display_name);

        // amount / numeric columns
        if (
          n.includes("amount") ||
          n.includes("total") ||
          n.includes("cost") ||
          n.includes("aed") ||
          n.includes("monthly") ||
          n.includes("yearly")
        ) {
          return 30;
        }

        // default text columns take remaining space
        return "*";
      })
    ];
  }

  // DETAILED (your existing logic)
  return [
    12,
    ...columns.map((c) => {
      const n = safeLower(c.display_name);

      if (n.includes("date")) return 40;
      if (n.includes("amount") || n.includes("total")) return 30;
      if (n.includes("company")) return "*";
      if (n.includes("vendors")) return "*";
      if (n.includes("products")) return "*";
      if (n.includes("term")) return 30;
      if (n.includes("department")) return 60;
      if (n.includes("center")) return 60;
      if (n.includes("card") || n.includes("credit")) return 60;


      return 80;
    })
  ];
};
const content = [];

// ================= HEADER =================
content.push(
  {
    text: companyName,
    alignment: "center",
    bold: true,
    fontSize: 15
  },
  {
    text: `${reportTitle} - ${formatDateFilter(dateFilters?.startDate)} to ${formatDateFilter(dateFilters?.endDate)}`,
    alignment: "center",
    bold: true,
    fontSize: 12,
    margin: [0, 2, 0, 6]
  },
);

// ================= FILTERS =================
if (filterTable.length) {
  content.push({
    text: "Applied Filters",
    bold: true,
    margin: [0, 0, 0, 5]
  });

  content.push({
    table: {
      widths: [120, "*"],
      body: filterTable
    },
    layout: {
      fillColor: row => (row % 2 === 0 ? "#f8f8f8" : null),
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5
    },
    margin: [0, 0, 0, 10]
  });
}

// ================= TOTAL TRACKERS =================
const grandTotals = {};

columns.forEach(col => {
  if (isNumericCol(col)) {
    grandTotals[col.column_name] = 0;
  }
});

const body = [];

// ================= HEADER ROW =================
body.push([
  {
    text: "S/N",
    bold: true,
    alignment: "center"
  },

  ...columns.map(col => ({
    text: col.display_name,
    bold: true,
    alignment: "center"
  }))
]);

// ================= DATA =================
Object.entries(groupedRows).forEach(([groupName, groupRows]) => {

  const groupTotals = {};

  columns.forEach(col => {
    if (isNumericCol(col)) {
      groupTotals[col.column_name] = 0;
    }
  });

  // Group header only for detailed
  if (isDetailed) {
    body.push([
      {
        text: groupName,
        bold: true,
        fillColor: "#eeeeee",
        colSpan: columns.length + 1,
        alignment: "left"
      },
      ...Array(columns.length).fill("")
    ]);
  }

  // Rows
  groupRows.forEach((row, index) => {

    body.push([
      {
        text: index + 1,
        alignment: "center"
      },

      ...columns.map(col => {

        const raw = row[col.column_name];

        if (isNumericCol(col)) {

          const num = normalizeNumber(raw);

          if (num !== null) {
            groupTotals[col.column_name] += num;
            grandTotals[col.column_name] += num;
          }

          return {
            text: num === null ? "-" : num.toFixed(2),
            alignment: "right"
          };
        }

        return {
          text: formatValue(col, raw),
          alignment: "left"
        };

      })
    ]);

  });

  // Group Total only for detailed
  if (isDetailed) {

    body.push([
      {
        text: "",
        border: [false, false, false, false]
      },

      ...columns.map((col, i) => {

        if (i === 0) {
          return {
            text: "TOTAL",
            bold: true,
            alignment: "right",
            fillColor: "#f1f5f9"
          };
        }

        if (isNumericCol(col)) {
          return {
            text:
              groupTotals[col.column_name] === 0
                ? "-"
                : groupTotals[col.column_name].toFixed(2),
            bold: true,
            alignment: "right",
            fillColor: "#f1f5f9"
          };
        }

        return {
          text: "",
          fillColor: "#f1f5f9"
        };

      })
    ]);

  }

});

// ================= GRAND TOTAL =================
if (isDetailed) {

  body.push([
    {
      text: "",
      border: [false, false, false, false]
    },

    ...columns.map((col, i) => {

      if (i === 0) {
        return {
          text: "GRAND TOTAL",
          bold: true,
          alignment: "right",
          fillColor: "#d9e1f2"
        };
      }

      if (isNumericCol(col)) {
        return {
          text:
            grandTotals[col.column_name] === 0
              ? "-"
              : grandTotals[col.column_name].toFixed(2),
          bold: true,
          alignment: "right",
          fillColor: "#d9e1f2"
        };
      }

      return {
        text: "",
        fillColor: "#d9e1f2"
      };

    })
  ]);

}

// ================= FINAL TABLE =================
content.push({
  table: {
    headerRows: 1,
    widths: getWidths(),
    body
  },
  layout: {
    fillColor: row => (row === 0 ? "#eeeeee" : null),
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 2,
    paddingBottom: () => 2
  }
});

    // ================= DOC =================
   const docDefinition = {
  pageSize: "A4",
  pageOrientation: reportType === "detailed" ? "landscape" : "portrait",
  pageMargins: [20, 20, 20, 20],
  defaultStyle: {
    fontSize: 7
  },
  content,
   footer: function (currentPage, pageCount) {
        return {
          margin: [40, 0, 50, 0],
          columns: [
            {
              width: 'auto',
              stack: [
                { text: `User: ${userName || 'Admin'} | Printed: Date/Time: ${downloadDate}`, alignment: 'left', fontSize: 8 }
              ]
            },
            { width: '*', text: '' },
            {
              width: 'auto',
              text: `Page ${currentPage} of ${pageCount}`,
              alignment: 'right',
              fontSize: 8
            }
          ]
        };
      },
};

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=report.pdf");

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("PDF generation failed");
  }
});

module.exports = router;


