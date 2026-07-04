export const isAmountField = (key = "") => {
  const k = key.toLowerCase();
//   console.log("Checking if amount field:", key);
  const result = (
    k.includes("amount") ||
    k.includes("amt") ||
    k.includes("cost") ||
    k.includes("price")
  );
//   console.log("Is amount field:", key, result);
  return result;
  
};

export const isTotalField = (key = "") => {
  const k = key.toLowerCase();
  return k.includes("total");
};

export const hasAnyAmountValue = (row = {}, columns = []) => {
   // console.log("Checking for amount values in row:", row);
  return columns.some(col => {
    if (!isAmountField(col.column_name)) return false;
    // console.log("Checking amount field:", col.column_name, "Value:", row[col.column_name]);
    return row[col.column_name];
  });
};