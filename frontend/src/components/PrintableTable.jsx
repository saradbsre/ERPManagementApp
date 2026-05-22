import { formatDate } from "../utils/formatDate";

const PrintableTable = ({
  columns,
  finalRows,
  printModuleName,
  module,
  groupBy = "service" // 👈 new prop with default

}) => {
 // console.log("Rendering PrintableTable with columns:", columns);
  // =========================
  // GROUP DATA
  // =========================
 // console.log("groupBy value in PrintableTable:", groupBy);
  const getGroupKey = (row, groupBy = "service") => {

  const normalize = (v) =>
    String(v || "")
      .replace(/^product\s*types?:?\s*/i, "") // removes "Product Types:"
      .trim();
  if (groupBy === "terms") {
    return normalize(
      row.term?.value ||
      row.term ||
      "UNKNOWN"
    );
  }

  // console.log("Row in getGroupKey:", row);
  // console.log("GroupBy in getGroupKey:", groupBy);

  // DEFAULT → PRODUCT TYPES
  return normalize(
    row.product_types?.value ||
    row.product_types ||
    "UNKNOWN"
  );
 
};
const groupedRows = finalRows.reduce((acc, row) => {

  const key = getGroupKey(row, groupBy); // 👈 dynamic

  if (!acc[key]) acc[key] = [];

  acc[key].push(row);

  return acc;

}, {});

  // =========================
  // HELPERS
  // =========================
  const toNumber = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    const n = Number(String(val).replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  };

  const isDate = (col) =>
    (col.data_type|| '')?.toLowerCase() === "date" ||  (col.data_type|| '').toLowerCase().includes("datetime");
 // console.log("Columns with data types:", columns.map(c => ({ name: c.column_name, type: c.data_type })));
  const isDecimal = (col) =>
    col.data_type?.toLowerCase() === "decimal";

 
  // =========================
  // CURRENCY LOGIC
  // =========================
  const currencies = [
    ...new Set(
      finalRows.map(r => r.currency).filter(Boolean)
    )
  ];

  const normalCols = columns.filter(c => {
    const name = c.column_name.toLowerCase();
    return name !== "amount" && name !== "currency" && !name.includes("total");
  });
  
  const totalCols = columns.filter(c=>{
    const name = c.column_name.toLowerCase();
    return name.includes("total");
  })
  const currencyCols = currencies.map(cur => ({
    column_name: `amount_${cur.toLowerCase()}`,
    display_name: `AMOUNT (${cur.toUpperCase()})`,
    currency: cur,
    isDynamicCurrency: true
  }));

  const sortedCols = [
    ...normalCols,
    ...currencyCols,
    ...totalCols
  ];

  // =========================
  // GRAND TOTAL INIT
  // =========================
  const grandTotals = {};

   const firstNumberIndex = sortedCols.findIndex(isDecimal);


  // =========================
  // RENDER
  // =========================
  return (
    <div style={{ padding: 10, fontFamily: "Times New Roman" }}>

      {/* COMPANY */}
      <h1 style={{ textAlign: "center", margin: 0 }}>
        {localStorage.getItem("print_company")}
      </h1>

      {/* MODULE */}
      <h2 style={{ textAlign: "center", margin: 0, marginTop: 5 }}>
        {printModuleName?.trim() || module?.display_name}
      </h2>

      {/* ================= GROUPS ================= */}
      {Object.entries(groupedRows).map(([serviceType, rows]) => {

        const groupTotals = {};

        // ================= GROUP TOTAL CALC =================
        sortedCols.forEach(col => {

          if ( isDecimal(col)) {

            groupTotals[col.column_name] = rows.reduce((sum, row) => {

              let value = "";

             
                const raw = row[col.column_name];
                value = typeof raw === "object" ? raw?.value : raw;
              

              return sum + toNumber(value);

            }, 0);

            grandTotals[col.column_name] =
              (grandTotals[col.column_name] || 0) +
              groupTotals[col.column_name];
          }
        });

        return (
          <div key={serviceType} style={{ marginTop: 20 }}>

            {/* SERVICE TYPE */}
            <h3 style={{ textAlign: "center", marginBottom: 10 }}>
              {serviceType}
            </h3>

            {/* TABLE */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 10
              }}
            >

              {/* HEADER */}
              <thead>
                <tr>
                  <th style={{ border: "1px solid #000", padding: 2, textAlign: "center" }}>
                    S.No
                  </th>

                  {sortedCols.map(col => (
                    <th
                      key={col.column_name}
                      style={{
                        border: "1px solid #000",
                        padding: 3,
                        textAlign: isDecimal(col) || col.isDynamicCurrency ? "right" : "center"
                      }}
                    >
                      {col.display_name}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* BODY */}
              <tbody>

                {rows.map((row, index) => (
                  <tr key={index}>

                    {/* SNO */}
                    <td style={{ border: "1px solid #000", textAlign: "center", padding: 5 }}>
                      {index + 1}
                    </td>

                    {/* DATA */}
                    {sortedCols.map(col => {

                      let value = "";

                      // CURRENCY COLUMN
                      if (col.isDynamicCurrency) {
                        value = row.currency === col.currency ? row.amount : "";
                      } else {
                        const raw = row[col.column_name];
                        value = typeof raw === "object" ? raw?.value : raw;
                      }

                      // CREDIT CARD MASK
                      if (col.master === "credit_card") {
                        const last4 = String(value || "").slice(-4);
                        value = `**** **** **** ${last4}`;
                      }

                      // DATE FORMAT
                      if (isDate(col)) {
                        value = value ? formatDate(value) : "-";
                      }

                      return (
                        <td
                          key={col.column_name}
                          style={{
                            border: "1px solid #000",
                            padding: 3,
                            textAlign: isDecimal(col) || col.isDynamicCurrency ? "right" : "center"
                          }}
                        >
                          {value || "-"}
                        </td>
                      );
                    })}

                  </tr>
                ))}

                {/* ================= GROUP TOTAL ================= */}
               <tr style={{ fontWeight: "bold", background: "#f5f5f5" }}>

  {/* S.No empty */}
  <td style={{ border: "1px solid #000" }} />

  {/* TOTAL label spans until first numeric column */}
  <td
    colSpan={firstNumberIndex}
    style={{ border: "1px solid #000", textAlign: "right", padding: 3 }}
  >
    TOTAL
  </td>

  {/* numeric columns only */}
  {sortedCols.slice(firstNumberIndex).map(col => {

    if (!isDecimal(col)) {
      return null;
    }

    return (
      <td
        key={col.column_name}
        style={{
          border: "1px solid #000",
          textAlign: "right",
          padding: 3
        }}
      >
        {(groupTotals[col.column_name] || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
      </td>
    );
  })}

</tr>

              </tbody>
            </table>

          </div>
        );
      })}

      {/* ================= GRAND TOTAL ================= */}
      <table style={{ width: "100%", marginTop: 30, borderCollapse: "collapse" }}>
  <tbody>

    <tr style={{ fontWeight: "bold", background: "#ddd" }}>

      {/* empty S.No column */}
      <td style={{ border: "1px solid #000" }} />

      {/* GRAND TOTAL label spans non-numeric columns */}
      <td
        colSpan={firstNumberIndex}
        style={{
          border: "1px solid #000",
          textAlign: "right",
          padding: 5
        }}
      >
        GRAND TOTAL
      </td>

      {/* numeric columns only */}
      {sortedCols.slice(firstNumberIndex).map(col => {

        if (!isDecimal(col)) return null;

        return (
          <td
            key={col.column_name}
            style={{
              border: "1px solid #000",
              textAlign: "right",
              padding: 5
            }}
          >
            {(grandTotals[col.column_name] || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </td>
        );
      })}

    </tr>

  </tbody>
</table>

    </div>
  );
};

export default PrintableTable;