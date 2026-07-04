export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getDateRange = (type) => {
  const today = new Date();

  let startDate = "";
  let endDate = "";

  switch (type) {
    case "today":
      startDate = formatDate(today);
      endDate = formatDate(today);
      break;

    case "yesterday": {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);

      startDate = formatDate(d);
      endDate = formatDate(d);
      break;
    }

    case "tomorrow": {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);

      startDate = formatDate(d);
      endDate = formatDate(d);
      break;
    }

    case "thisWeek": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());

      startDate = formatDate(start);
      endDate = formatDate(today);
      break;
    }

    case "lastWeek": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay() - 7);

      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      startDate = formatDate(start);
      endDate = formatDate(end);
      break;
    }

    case "thisMonth":
      startDate = formatDate(
        new Date(today.getFullYear(), today.getMonth(), 1)
      );
      endDate = formatDate(today);
      break;

    case "lastMonth":
      startDate = formatDate(
        new Date(today.getFullYear(), today.getMonth() - 1, 1)
      );
      endDate = formatDate(
        new Date(today.getFullYear(), today.getMonth(), 0)
      );
      break;

    case "thisYear":
      startDate = formatDate(
        new Date(today.getFullYear(), 0, 1)
      );
      endDate = formatDate(today);
      break;

    case "lastYear":
      startDate = formatDate(
        new Date(today.getFullYear() - 1, 0, 1)
      );
      endDate = formatDate(
        new Date(today.getFullYear() - 1, 11, 31)
      );
      break;

    case "last7Days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);

      startDate = formatDate(start);
      endDate = formatDate(today);
      break;
    }

    case "last30Days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);

      startDate = formatDate(start);
      endDate = formatDate(today);
      break;
    }

    default:
      return null;
  }

  return { startDate, endDate };
};