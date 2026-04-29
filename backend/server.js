const express = require("express");
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
const fs = require("fs");
const path = require("path");
const PdfPrinter = require("pdfmake/src/printer");
require("./cron/sectionCron"); 

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api", userRoutes);

app.use("/api", sessionRoutes);

app.use("/api", dataRoutes);

app.use("/api", importRoutes);

app.use("/api", masterRoutes);

app.use("/api", dashboardRoutes);

app.use("/api", logsRoutes);

app.use("/api", require("./datainsert"));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const router = express.Router();
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

app.post("/api/pdf", async (req, res) => {
  try {
    const {
      rows = [],
      columns = [],
      userName = "Admin",
      moduleName = "",
    } = req.body;

    // ================= LOGO =================
    const logoPath = path.join(__dirname, "assets", "header.png");

    let logoBase64 = "";
    try {
      logoBase64 = fs.readFileSync(logoPath).toString("base64");
    } catch (err) {
      logoBase64 = "";
    }

    // ================= TABLE HEADER =================
    const tableBody = [];

    tableBody.push(
      columns.map((col) => ({
        text: col.display_name,
        style: "tableHeader",
        fillColor: "#dadadb",
        alignment: "left",
      }))
    );

    // ================= TABLE ROWS =================
    rows.forEach((row) => {
      tableBody.push(
        columns.map((col, i) => {
          const value = row[col.column_name] ?? "-";

          // first column left
          if (i === 0) {
            return { text: String(value), alignment: "left" };
          }

          // numeric columns right align
          const isNumber =
            col.column_name.toLowerCase().includes("amount") ||
            col.column_name.toLowerCase().includes("price") ||
            col.column_name.toLowerCase().includes("total") ||
            col.column_name.toLowerCase().includes("cost");

          if (isNumber) {
            return { text: String(value), alignment: "right" };
          }

          return { text: String(value), alignment: "center" };
        })
      );
    });

    // ================= PDF DOCUMENT =================
    const docDefinition = {
      pageSize: "A4",
      pageOrientation: "landscape",
      pageMargins: [30, 40, 30, 40],
      defaultStyle: { fontSize: 7, font: 'Tinos' },
      content: [
        // HEADER
        {
          columns: [
            logoBase64
              ? {
                  image: `data:image/png;base64,${logoBase64}`,
                  width: 120,
                }
              : {},

            {
              text: moduleName,
              alignment: "center",
              margin: [0, 20, 0, 10],
              fontSize: 14,
              bold: true,
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // TABLE
        {
          table: {
            headerRows: 1,
            widths: columns.map(() => "*"),
            body: tableBody,
          },

          layout: {
            fillColor: (rowIndex) =>
              rowIndex === 0 ? "#dadadb" : null,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
        },
      ],

      // FOOTER
      footer: (currentPage, pageCount) => ({
        margin: [20, 10],
        columns: [
          { text: `User: ${userName}`, fontSize: 8 },
          {
            text: `Page ${currentPage} / ${pageCount}`,
            alignment: "right",
            fontSize: 8,
          },
        ],
      }),

      styles: {
        tableHeader: {
          bold: true,
          fontSize: 9,
        },
      },
    };

    // ================= GENERATE PDF =================
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=report.pdf"
    );

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).send("PDF generation failed");
  }
});