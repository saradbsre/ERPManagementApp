import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (rows, columns, fileName = "report", moduleName ) => {

  const safeLower = (v) => (v || "").toLowerCase();
  console.log("moduleName in exportToExcel:", moduleName);
  // =========================
  // HELPERS
  // =========================
  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB");
  };

  const maskCard = (value) => {
    const str = String(value || "");
    return str.length > 4 ? "**** **** **** " + str.slice(-4) : str;
  };

  const isTotalColumn = (col) =>
    safeLower(col).includes("total");

  const getServiceType = (row) => {
    let val =
      row["Service Types"] ||
      row["service_types"]?.value ||
      row["service_types"] ||
      "UNKNOWN";

    return String(val)
      .replace(/^service\s*types?:?\s*/i, "")
      .trim();
  };

  // =========================
  // GROUP DATA
  // =========================
  const grouped = rows.reduce((acc, row) => {
    const key = getServiceType(row);
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const grandTotals = {};
  columns.forEach(col => {
    if (isTotalColumn(col)) {
      grandTotals[col] = 0;
    }
  });

  const finalData = [];

  const company = localStorage.getItem("print_company") || "";

  // =========================
  // HEADER SECTION (DESIGNED)
  // =========================
  if (company) {
    finalData.push([{ v: company, s: { font: { bold: true, sz: 20 }, alignment: { horizontal: "center" } } }]);
    finalData.push([]);
  }

  if (fileName) {
    finalData.push([{ v: fileName, s: { font: { bold: true, sz: 16, color: { rgb: "1F4E79" } }, alignment: { horizontal: "center" } } }]);
    finalData.push([]);
  }

  // =========================
  // GROUPS
  // =========================
  Object.entries(grouped).forEach(([serviceType, groupRows]) => {

    const groupTotals = {};
    columns.forEach(col => {
      if (isTotalColumn(col)) {
        groupTotals[col] = 0;
      }
    });

    // SERVICE TYPE TITLE (CENTER)
    finalData.push([
      {
        v: `Service Type: ${serviceType}`,
        s: {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: "center" },
          fill: { fgColor: { rgb: "D9E1F2" } }
        }
      }
    ]);

    finalData.push([]);

    // HEADER ROW (BLUE STYLE)
    finalData.push([
      { v: "SNo", s: headerStyle() },
      ...columns.map(c => ({ v: c, s: headerStyle() }))
    ]);

    // ROWS
    groupRows.forEach((row, index) => {

      const rowData = [
        { v: index + 1, s: cellStyleCenter() },

        ...columns.map(col => {

          const colName = safeLower(col);
          let value = row[col] ?? "";

          if (colName.includes("date")) {
            value = formatDate(value);
          }

          if (colName.includes("card") || colName.includes("credit")) {
            value = maskCard(value);
          }

          const isNum = isTotalColumn(col);

          return {
            v: value,
            s: isNum ? cellStyleRight() : cellStyleCenter()
          };
        })
      ];

      finalData.push(rowData);

      // TOTALS
      columns.forEach(col => {
        if (isTotalColumn(col)) {
          const val = Number(String(row[col] || 0).replace(/,/g, ""));
          const clean = isNaN(val) ? 0 : val;

          groupTotals[col] += clean;
          grandTotals[col] += clean;
        }
      });
    });

    // GROUP TOTAL ROW
    finalData.push([
      { v: "TOTAL", s: totalStyle() },
      ...columns.map(col => ({
        v: isTotalColumn(col) ? groupTotals[col].toFixed(2) : "",
        s: totalStyleRight()
      }))
    ]);

    finalData.push([]);
  });

  // =========================
  // GRAND TOTAL
  // =========================
  finalData.push([
    { v: "GRAND TOTAL", s: grandStyle() },
    ...columns.map(col => ({
      v: isTotalColumn(col) ? grandTotals[col].toFixed(2) : "",
      s: grandStyleRight()
    }))
  ]);

  // =========================
  // WORKBOOK
  // =========================
  const ws = XLSX.utils.aoa_to_sheet(finalData);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  const excelBuffer = XLSX.write(wb, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true
  });

  saveAs(new Blob([excelBuffer]), `${fileName}.xlsx`);
};

// =========================
// STYLES
// =========================
const headerStyle = () => ({
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: "305496" } },
  alignment: { horizontal: "center" }
});

const cellStyleCenter = () => ({
  alignment: { horizontal: "center" }
});

const cellStyleRight = () => ({
  alignment: { horizontal: "right" }
});

const totalStyle = () => ({
  font: { bold: true },
  fill: { fgColor: { rgb: "F2F2F2" } }
});

const totalStyleRight = () => ({
  font: { bold: true },
  alignment: { horizontal: "right" }
});

const grandStyle = () => ({
  font: { bold: true, sz: 12 },
  fill: { fgColor: { rgb: "FFD966" } }
});

const grandStyleRight = () => ({
  font: { bold: true },
  alignment: { horizontal: "right" }
});