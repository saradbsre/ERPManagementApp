import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (rows, columns, fileName = "report") => {

  // =========================
  // 1. BUILD DATA ROWS
  // =========================
  const tableData = rows.map((row, index) => {
    return [
      index + 1,
      ...columns.map(col => row[col] ?? "")
    ];
  });

  // =========================
  // 2. TOTAL ROW
  // =========================
  const totalRow = [];

  totalRow.push(""); // SNo blank

  let totalPlaced = false;

  columns.forEach(col => {

    const isTotalCol = col.toLowerCase().includes("cost");

    if (!isTotalCol) {
      totalRow.push("");
      return;
    }

    const sum = rows.reduce((acc, row) => {
      const val = Number(String(row[col] ?? "").replace(/,/g, ""));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    if (!totalPlaced) {
      totalRow.push(sum.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
      totalPlaced = true;
    } else {
      totalRow.push(
        sum.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      );
    }
  });

  tableData.push(totalRow);

  // =========================
  // 3. HEADER ROWS (COMPANY + MODULE)
  // =========================
  const company = localStorage.getItem("print_company") || "";
  const moduleName = fileName || "";

  const finalData = [];

  if (company) {
    finalData.push([company]);
    finalData.push([]);
  }

  if (moduleName) {
    finalData.push([moduleName]);
    finalData.push([]);
  }

  // =========================
  // 4. TABLE HEADER
  // =========================
  finalData.push([
    "SNo",
    ...columns
  ]);

  // =========================
  // 5. MERGE TABLE DATA
  // =========================
  finalData.push(...tableData);

  // =========================
  // 6. CREATE SHEET
  // =========================
  const worksheet = XLSX.utils.aoa_to_sheet(finalData);

  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  // =========================
  // 7. STYLE HEADER ROW
  // =========================
  const headerRowIndex = (company ? 3 : 1) + (moduleName ? 2 : 0);

  for (let C = 0; C <= range.e.c; C++) {
    const cell = XLSX.utils.encode_cell({
      r: headerRowIndex,
      c: C
    });

    if (!worksheet[cell]) continue;

    worksheet[cell].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2F75B5" } },
      alignment: { horizontal: "center" }
    };
  }

  // =========================
  // 8. STYLE TOTAL ROW
  // =========================
  const totalRowIndex = finalData.length - 1;

  for (let C = 0; C <= range.e.c; C++) {
    const cell = XLSX.utils.encode_cell({
      r: totalRowIndex,
      c: C
    });

    if (!worksheet[cell]) continue;

    worksheet[cell].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "F2F2F2" } }
    };
  }

  // =========================
  // 9. EXPORT
  // =========================
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true
  });

  const blob = new Blob([excelBuffer], {
    type: "application/octet-stream"
  });

  saveAs(blob, `${fileName}.xlsx`);
};