function resolveCol(columns, keyword) {
  if (!columns || !keyword) return null;

  return columns.find(col =>
    col.toLowerCase().includes(keyword.toLowerCase())
  );
}

module.exports = { resolveCol };