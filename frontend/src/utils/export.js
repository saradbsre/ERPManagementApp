import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (rows, columns, fileName = "report") => {
  // 1. convert data into flat array
  const data = rows.map(row => {
    const obj = {};

    columns.forEach(col => {
      obj[col.display_name] = row[col.column_name] ?? "";
    });

    return obj;
  });

  // 2. create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 3. create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // 4. generate buffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  // 5. save file
  const blob = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(blob, `${fileName}.xlsx`);
};