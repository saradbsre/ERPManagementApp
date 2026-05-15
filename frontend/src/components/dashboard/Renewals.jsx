import React, { useEffect, useMemo, useState } from "react";
import { getAlertData } from "../../api/api";

export default function RenewalTimeline() {
  const [data, setData] = useState([]);

  // -----------------------------
  // FETCH DATA
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getAlertData();

        //console.log("API:", res);

        setData(res?.data?.data || []);
      } catch (err) {
        console.error(err);
        setData([]);
      }
    };

    fetchData();
  }, []);

  function getDisplayDate(dateStr) {
  const original = new Date(dateStr);
  const now = new Date();
  // If not current month/year, show with current month/year but same day
  if (
    original.getMonth() !== now.getMonth() ||
    original.getFullYear() !== now.getFullYear()
  ) {
    // Handle month overflow (e.g., 31st in a month with only 30 days)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = Math.min(original.getDate(), daysInMonth);
    return new Date(now.getFullYear(), now.getMonth(), day).toDateString();
  }
  // Otherwise, show the actual date
  return original.toDateString();
}

  // -----------------------------
  // FLATTEN DATA
  // -----------------------------
const flatData = useMemo(() => {
  return data.flatMap((master) => {
    // If master.alerts exists, use the old logic
    if (Array.isArray(master.alerts)) {
      return master.alerts.flatMap((alert) =>
        alert.data.map((item) => ({
          ...item,
          date_column: alert.date_column
        }))
      );
    }
    // If master.data exists, use the new logic
    if (Array.isArray(master.data)) {
      return master.data.map((item) => ({
        ...item,
        date_column: master.date_column
      }));
    }
    return [];
  });
}, [data]);

  // -----------------------------
  // PRIORITY LOGIC (SOFT COLORS)
  // -----------------------------
  const getPriority = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const diff = Math.ceil(
      (date - today) / (1000 * 60 * 60 * 24)
    );

    if (diff < 0) {
      return {
        label: "Overdue",
        bg: "bg-gray-100",
        border: "border-gray-300",
        text: "text-gray-500",
        bar: "bg-gray-400"
      };
    }

    if (diff === 0) {
      return {
        label: "Today",
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-600",
        bar: "bg-red-400"
      };
    }

    if (diff <= 2) {
      return {
        label: `${diff} days`,
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-600",
        bar: "bg-orange-400"
      };
    }

    if (diff <= 7) {
      return {
        label: `${diff} days`,
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        bar: "bg-yellow-400"
      };
    }

    return {
      label: "Upcoming",
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      bar: "bg-green-400"
    };
  };

  // -----------------------------
  // SORT BY NEAREST DATE
  // -----------------------------
  const sortedData = [...flatData].sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date)
  );

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="bg-white p-5 rounded-xl shadow">


      {/* LIST */}
      <div className="space-y-3 max-h-96 overflow-y-auto">

        {sortedData.length === 0 && (
          <p className="text-gray-400 text-sm">
            No upcoming renewals
          </p>
        )}

        {sortedData.map((item, i) => {
          const priority = getPriority(item.date);

          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-xl border transition hover:shadow-sm 
                ${priority.bg} ${priority.border}`}
            >

              {/* LEFT COLOR BAR */}
              <div
                className={`w-1.5 h-12 rounded ${priority.bar}`}
              />

              {/* CONTENT */}
              <div className="flex-1">

                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm">
                    {item.service_providers}
                  </p>

                  <span
                    className={`text-xs font-semibold ${priority.text}`}
                  >
                    {priority.label}
                  </span>
                </div>

               

                <p className="text-xs text-gray-400 mt-1">
                  {getDisplayDate(item.date)}
                </p>

              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}