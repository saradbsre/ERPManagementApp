import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportToExcel = async (
  groups,
  columns,
  moduleName,
  groupBy,
  originalColumns
) => {

  const safeLower = (v) => (v || "").toString().toLowerCase();

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB");
  };

  const maskCard = (value) => {
    const str = String(value || "");
    return str.length > 4
      ? `**** **** **** ${str.slice(-4)}`
      : str;
  };

  const isTotalColumn = (col) =>
    safeLower(col).includes("total");

  const borderStyle = () => ({
    top: { style: "thin", color: { argb: "D9D9D9" } },
    left: { style: "thin", color: { argb: "D9D9D9" } },
    bottom: { style: "thin", color: { argb: "D9D9D9" } },
    right: { style: "thin", color: { argb: "D9D9D9" } }
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Report");

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const headerStyle = {
    font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "305496" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: borderStyle()
  };

  const totalStyle = {
    font: { bold: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "F2F2F2" } },
    alignment: { horizontal: "right" },
    border: borderStyle()
  };

  const grandStyle = {
    font: { bold: true, size: 12 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD966" } },
    alignment: { horizontal: "right" },
    border: borderStyle()
  };

  const company = localStorage.getItem("print_company") || "";

  let currentRow = 1;

  // =========================
  // COMPANY
  // =========================
  if (company) {
    worksheet.mergeCells(currentRow, 1, currentRow, columns.length + 1);
    const cell = worksheet.getCell(currentRow, 1);
    cell.value = company;
    cell.font = { bold: true, size: 20 };
    cell.alignment = { horizontal: "center" };
    currentRow += 2;
  }

  // =========================
  // TITLE
  // =========================
  if (moduleName) {
    worksheet.mergeCells(currentRow, 1, currentRow, columns.length + 1);
    const cell = worksheet.getCell(currentRow, 1);
    cell.value = moduleName;
    cell.font = { bold: true, size: 16, color: { argb: "1F4E79" } };
    cell.alignment = { horizontal: "center" };
    currentRow += 2;
  }

  // =========================
  // MAP ORIGINAL COLUMNS (IMPORTANT FIX)
  // =========================
  const columnMap = {};
  (originalColumns || []).forEach(col => {
    columnMap[col.display_name] = col;
  });

  // FILTER ONLY SELECTED COLUMNS (THIS IS YOUR KEY FIX)
  const exportColumns = (columns || [])
    .map(name => columnMap[name])
    .filter(Boolean);

  const grandTotals = {};

  // =========================
  // GROUP LOOP
  // =========================
  groups.forEach((group) => {

    const rows = group.rows || [];

    // GROUP HEADER
    worksheet.mergeCells(currentRow, 1, currentRow, exportColumns.length + 1);

    const groupCell = worksheet.getCell(currentRow, 1);
    groupCell.value = group.group;
    groupCell.font = { bold: true, size: 14 };
    groupCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "D9E1F2" }
    };
    groupCell.alignment = { horizontal: "center" };

    currentRow += 2;

    // =========================
    // HEADER ROW
    // =========================
    const headerValues = [
      "SNo",
      ...exportColumns.map(c => c.display_name)
    ];

    const headerRow = worksheet.addRow(headerValues);

    headerRow.eachCell(cell => {
      cell.style = headerStyle;
    });

    currentRow++;

    const groupTotals = {};

    exportColumns.forEach(col => {
      if (isTotalColumn(col.column_name)) {
        groupTotals[col.column_name] = 0;
        grandTotals[col.column_name] =
          grandTotals[col.column_name] || 0;
      }
    });

    // =========================
    // ROWS
    // =========================
    rows.forEach((row, index) => {

      const rowValues = [
        index + 1,
        ...exportColumns.map(col => {

          const key = col.column_name;
          let value = row?.[key];

          // object
          if (value && typeof value === "object") {
            value = value?.value ?? value?.label ?? "";
          }

          // date
          if (col.data_type === "date") {
            value = formatDate(value);
          }

          // credit card
          if (
            safeLower(key).includes("card") ||
            safeLower(key).includes("credit")
          ) {
            value = maskCard(value);
          }

          return value ?? "";
        })
      ];

      const excelRow = worksheet.addRow(rowValues);

      excelRow.eachCell(cell => {
        cell.border = borderStyle();
        cell.alignment = { horizontal: "center" };
      });

      // totals
      exportColumns.forEach(col => {
        if (isTotalColumn(col.column_name)) {
          const val = Number(row?.[col.column_name] || 0);

          groupTotals[col.column_name] =
            (groupTotals[col.column_name] || 0) + val;

          grandTotals[col.column_name] =
            (grandTotals[col.column_name] || 0) + val;
        }
      });

      currentRow++;
    });

    // =========================
    // GROUP TOTAL
    // =========================
    const totalRow = worksheet.addRow([]);

    totalRow.getCell(1).value = "TOTAL";
    totalRow.getCell(1).style = totalStyle;

    exportColumns.forEach((col, idx) => {
      const cell = totalRow.getCell(idx + 2);

      if (isTotalColumn(col.column_name)) {
        cell.value = groupTotals[col.column_name] || 0;
        cell.numFmt = "#,##0.00";
      }

      cell.style = totalStyle;
    });

    currentRow += 2;
  });

  // =========================
  // GRAND TOTAL
  // =========================
  const grandRow = worksheet.addRow([]);

  grandRow.getCell(1).value = "GRAND TOTAL";
  grandRow.getCell(1).style = grandStyle;

  exportColumns.forEach((col, idx) => {
    const cell = grandRow.getCell(idx + 2);

    if (isTotalColumn(col.column_name)) {
      cell.value = grandTotals[col.column_name] || 0;
      cell.numFmt = "#,##0.00";
    }

    cell.style = grandStyle;
  });

  // =========================
  // EXPORT
  // =========================
  const buffer = await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    `${moduleName || "report"}.xlsx`
  );
};