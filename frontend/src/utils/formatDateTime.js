export  const formatDateTime = (dateStr) => {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
};