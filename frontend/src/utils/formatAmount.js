export const formatAmount = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  const num = Number(value);

  if (!isFinite(num) || num === 0) return "-";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};