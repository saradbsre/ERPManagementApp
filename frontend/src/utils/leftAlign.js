export const getAlignClass = (key) => {
  if (!key) return "text-left"; // ✅ safety check

  const k = String(key).toLowerCase(); // ✅ force string

  if (
    k.includes("amt") ||
    k.includes("amount") ||
    k.includes("rate") ||
    k.includes("cost") ||
    k.includes("price") ||
    k.includes("total")
  ) {
    return "text-right";
  }

  return "text-left";
};