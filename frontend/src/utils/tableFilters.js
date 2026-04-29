export const applyTableFilters = (rows, filters, columns) => {
  if (!rows || !rows.length) return [];

  return rows.filter((row) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;

      const col = columns.find(c => c.column_name === key);
      if (!col) return true;

      const cellValue = String(row[key] ?? "").toLowerCase();
      const filterValue = String(value).toLowerCase();

      return cellValue.includes(filterValue);
    });
  });
};