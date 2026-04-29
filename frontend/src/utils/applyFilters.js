export const applyFilters = (rows, filters, columns = []) => {
  if (!filters.length) return rows;

  return rows.filter(row => {

    return filters.every(filter => {

      // ================= CURRENCY FILTER =================
      if (filter.master === "currency") {

        // if no currency selected → don't filter
        if (!filter.values || filter.values.length === 0) {
          return true;
        }

        // check if ANY selected currency column exists in schema
        return filter.values.some(currency => {
          const cur = currency.toLowerCase();

          return columns.some(col => {
            const colName = col.column_name.toLowerCase();

            // ❌ skip total columns
            if (colName.includes("total")) return false;

            // ✔ match currency column name
            if (colName.includes(cur)) {
              const value = row[col.column_name];

              // ✔ column exists (value can be empty or filled)
              return value !== null && value !== undefined;
            }

            return false;
          });
        });
      }

      // ================= NORMAL FILTER =================
      const column = columns.find(c => c.master === filter.master);

      if (!column) return true;

      const cellValue = String(row[column.column_name] || "")
        .toLowerCase()
        .trim();

      return filter.values.length === 0
        ? true
        : filter.values.some(val =>
            cellValue.includes(val.toLowerCase().trim())
          );
    });

  });
};