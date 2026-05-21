export const isNumericColumn = (key = "") => {
  const k = key.toLowerCase();

  return (
    k.includes("amount") ||
    k.includes("cost") ||
    k.includes("price") ||
    k.includes("total") ||
    k.includes("amt") 
  );
};

export const handleNumericInput = (value) => {
  // allow only numbers + one decimal point
  return value.replace(/[^0-9.]/g, "")
              .replace(/(\..*)\./g, "$1");
};