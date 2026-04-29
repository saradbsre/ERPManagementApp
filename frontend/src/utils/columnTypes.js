


// utils/columnTypes.js

export const mapDbTypeToUiType = (dbType) => {
  if (!dbType) return "text";

  const type = dbType.toLowerCase();

  // 🔢 Numeric types
  if (
    type.includes("int") ||
    type.includes("float") ||
    type.includes("double") ||
    type.includes("decimal") ||
    type.includes("number")
  ) {
    return "number";
  }

  // 📅 Date types
  if (
    type.includes("date") ||
    type.includes("time") ||
    type.includes("timestamp")
  ) {
    return "date";
  }

  // 🔤 Text types
  if (
    type.includes("char") ||
    type.includes("text") ||
    type.includes("string")
  ) {
    return "text";
  }

  // 📦 Foreign key / master / dropdown types
  if (
    type.includes("master") ||
    type.includes("enum") ||
    type.includes("select") ||
    type.includes("lookup")
  ) {
    return "select";
  }

  // fallback
  return "text";
};