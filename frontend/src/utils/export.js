import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportToExcel = async (
  rows,
  columns,
  moduleName,
  groupBy = "service"
) => {

 // console.log("Exporting to Excel with groupBy:", groupBy);

  // =========================
  // HELPERS
  // =========================

  const safeLower = (v) => (v || "").toLowerCase();

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

  const getGroupKey = (row, groupBy) => {
  if (!groupBy) return "ALL";

  if (groupBy === "service") {
    return (
      row["Service Types"] ||
      row["service_types"]?.value ||
      row["service_types"] ||
      "UNKNOWN"
    );
  }

  if (groupBy === "terms") {
    return (
      row["Term"] ||
      row["term"] ||
      "UNKNOWN"
    );
  }

  return row[groupBy] || "UNKNOWN";
};

  // =========================
  // GROUP DATA
  // =========================

const grouped = rows.reduce((acc, row) => {

  const key = getGroupKey(row, groupBy);

  if (!acc[key]) acc[key] = [];

  acc[key].push(row);

  return acc;

}, {});

  // =========================
  // WORKBOOK
  // =========================

  const workbook = new ExcelJS.Workbook();

  const worksheet = workbook.addWorksheet("Report");

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1
    }
  ];

  // =========================
  // STYLES
  // =========================

  const headerStyle = {
    font: {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "305496" }
    },
    alignment: {
      horizontal: "center",
      vertical: "middle"
    },
    border: borderStyle()
  };

  const totalStyle = {
    font: {
      bold: true
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F2F2F2" }
    },
    alignment: {
      horizontal: "right"
    },
    border: borderStyle()
  };

  const grandStyle = {
    font: {
      bold: true,
      size: 12
    },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD966" }
    },
    alignment: {
      horizontal: "right"
    },
    border: borderStyle()
  };

  // =========================
  // COMPANY TITLE
  // =========================

  const company =
    localStorage.getItem("print_company") || "";

  let currentRow = 1;

  if (company) {

    worksheet.mergeCells(
      currentRow,
      1,
      currentRow,
      columns.length + 1
    );

    const companyCell =
      worksheet.getCell(currentRow, 1);

    companyCell.value = company;

    companyCell.font = {
      bold: true,
      size: 20
    };

    companyCell.alignment = {
      horizontal: "center"
    };

    currentRow += 2;
  }

  // =========================
  // REPORT TITLE
  // =========================

  if (moduleName) {

    worksheet.mergeCells(
      currentRow,
      1,
      currentRow,
      columns.length + 1
    );

    const titleCell =
      worksheet.getCell(currentRow, 1);

    titleCell.value = moduleName;

    titleCell.font = {
      bold: true,
      size: 16,
      color: {
        argb: "1F4E79"
      }
    };

    titleCell.alignment = {
      horizontal: "center"
    };

    currentRow += 2;
  }

  // =========================
  // GRAND TOTALS
  // =========================

  const grandTotals = {};

  columns.forEach((col) => {

    if (isTotalColumn(col)) {
      grandTotals[col] = 0;
    }

  });

  // =========================
  // GROUPS
  // =========================

  Object.entries(grouped).forEach(
    ([serviceType, groupRows]) => {

      // =========================
      // GROUP TITLE
      // =========================

      worksheet.mergeCells(
        currentRow,
        1,
        currentRow,
        columns.length + 1
      );

      const groupCell =
        worksheet.getCell(currentRow, 1);

      groupCell.value =
        `${serviceType}`;

      groupCell.font = {
        bold: true,
        size: 14
      };

      groupCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "D9E1F2"
        }
      };

      groupCell.alignment = {
        horizontal: "center"
      };

      currentRow += 2;

      // =========================
      // HEADER
      // =========================

      const headerRow = worksheet.getRow(currentRow);

      const headerValues = [
        "SNo",
        ...columns
      ];

      headerValues.forEach((val, idx) => {

        const cell =
          headerRow.getCell(idx + 1);

        cell.value = val;

        cell.style = headerStyle;
      });

      headerRow.height = 22;

      currentRow++;

      // =========================
      // GROUP TOTALS
      // =========================

      const groupTotals = {};

      columns.forEach((col) => {

        if (isTotalColumn(col)) {
          groupTotals[col] = 0;
        }

      });

      // =========================
      // DATA ROWS
      // =========================

      groupRows.forEach((row, index) => {

        const excelRow =
          worksheet.getRow(currentRow);

        // SNO
        excelRow.getCell(1).value =
          index + 1;

        excelRow.getCell(1).alignment = {
          horizontal: "center"
        };

        excelRow.getCell(1).border =
          borderStyle();

        columns.forEach((col, colIndex) => {

          const cell =
            excelRow.getCell(colIndex + 2);

          let value =
            row[col] ??
            row[safeLower(col)] ??
            "";

          // DATE
          if (
            safeLower(col).includes("date")
          ) {
            value = formatDate(value);
          }

          // CREDIT CARD
          if (
            safeLower(col).includes("card") ||
            safeLower(col).includes("credit")
          ) {
            value = maskCard(value);
          }

          // TOTALS
          if (isTotalColumn(col)) {

            const num = Number(
              String(value || 0).replace(
                /,/g,
                ""
              )
            );

            const clean =
              isNaN(num) ? 0 : num;

            groupTotals[col] += clean;

            grandTotals[col] += clean;

            cell.value = clean;

            cell.numFmt = "#,##0.00";

            cell.alignment = {
              horizontal: "right"
            };

          } else {

            cell.value = value;

            cell.alignment = {
              horizontal: "center"
            };
          }

          cell.border = borderStyle();

        });

        currentRow++;
      });

      // =========================
      // GROUP TOTAL ROW
      // =========================

      const totalRow =
        worksheet.getRow(currentRow);

      totalRow.getCell(1).value =
        "TOTAL";

      totalRow.getCell(1).style =
        totalStyle;

      columns.forEach((col, idx) => {

        const cell =
          totalRow.getCell(idx + 2);

        if (isTotalColumn(col)) {

          cell.value =
            groupTotals[col];

          cell.numFmt = "#,##0.00";
        }

        cell.style = totalStyle;
      });

      currentRow += 2;
    }
  );

  // =========================
  // GRAND TOTAL ROW
  // =========================

  const grandRow =
    worksheet.getRow(currentRow);

  grandRow.getCell(1).value =
    "GRAND TOTAL";

  grandRow.getCell(1).style =
    grandStyle;

  columns.forEach((col, idx) => {

    const cell =
      grandRow.getCell(idx + 2);

    if (isTotalColumn(col)) {

      cell.value =
        grandTotals[col];

      cell.numFmt = "#,##0.00";
    }

    cell.style = grandStyle;
  });

  // =========================
  // AUTO WIDTH
  // =========================

  worksheet.columns.forEach((column) => {
  let maxLength = 10;
  column.eachCell({ includeEmpty: true }, (cell) => {
    let cellValue = cell.value;
    if (cellValue?.richText) {
      cellValue = cellValue.richText.map((t) => t.text).join("");
    }
    const text = cellValue ? String(cellValue) : "";
    // For multi-line cells, consider the longest line
    const lines = text.split("\n");
    lines.forEach(line => {
      maxLength = Math.max(maxLength, line.length);
    });
  });
  column.width = Math.min(maxLength + 1, 15);
});

  // =========================
  // EXPORT
  // =========================

  const buffer =
    await workbook.xlsx.writeBuffer();

  saveAs(
    new Blob([buffer]),
    `${moduleName}.xlsx`
  );
};

// =========================
// BORDER
// =========================

function borderStyle() {

  return {
    top: {
      style: "thin",
      color: { argb: "D9D9D9" }
    },
    left: {
      style: "thin",
      color: { argb: "D9D9D9" }
    },
    bottom: {
      style: "thin",
      color: { argb: "D9D9D9" }
    },
    right: {
      style: "thin",
      color: { argb: "D9D9D9" }
    }
  };
}