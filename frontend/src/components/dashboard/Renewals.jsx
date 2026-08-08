import React, { useEffect, useMemo, useState } from "react";
import { getAlertData, getMasterData } from "../../api/api";
import Loader from "../Loader";

export default function RenewalTimeline() {
  const [data, setData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("today");
  const activeUserEmail = JSON.parse(localStorage.getItem("user"))?.email || "";
  const [serviceProviderMap, setServiceProviderMap] = useState({});
  const [loading, setLoading] = React.useState(true);

  
const fetchAlerts = async (filter = "today") => {
  setLoading(true);

  try {
    const res = await getAlertData(activeUserEmail, filter);
    setData(res?.data?.data || []);
  } catch (err) {
    console.error(err);
    setData([]);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchAlerts(selectedFilter);
}, [selectedFilter]);

  // -----------------------------
  // DISPLAY DATE
  // -----------------------------
  function getDisplayDate(dateStr) {
    if (!dateStr) return "-";

    const date = new Date(dateStr);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  // -----------------------------
  // PRIORITY
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
        label: "Expired",
        bg: "bg-gray-100",
        border: "border-gray-300",
        text: "text-gray-500",
        bar: "bg-gray-400",
      };
    }

    if (diff === 0) {
      return {
        label: "Today",
        // bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-600",
        bar: "bg-red-400",
      };
    }

    if (diff === 1) {
      return {
        label: "Tomorrow",
        // bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-600",
        bar: "bg-orange-400",
      };
    }

    if (diff <= 7) {
      return {
        label: `${diff} Days`,
        // bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        bar: "bg-yellow-400",
      };
    }

    return {
      label: "Upcoming",
      // bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-600",
      bar: "bg-green-400",
    };
  };

  // -----------------------------
  // SORT DATA
  // -----------------------------
  const sortedData = useMemo(() => {
    return [...data].sort(
      (a, b) =>
        new Date(a.expiry_date) - new Date(b.expiry_date)
    );
  }, [data]);

 if (loading) {
    return (
      <div className="pt-50  items-center justify-center min-h-screen">
        <Loader type="orbit" />
      </div>
    );
  }
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl  w-full h-96 overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">

        <h2 className="text-[15px] font-semibold text-gray-800">
          Renewal Alerts
        </h2>

        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm text-[12px]"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="this_week">This Week</option>
          <option value="next_week">Next Week</option>
          <option value="next_month">Next Month</option>
        </select>

      </div>

      {/* LIST */}
      <div className="space-y-3 max-h-75 overflow-y-auto">

        {sortedData.length === 0 && (
          <p className="text-gray-400 text-[12px] text-center mt-10">
            No upcoming renewals
          </p>
        )}

        {sortedData.map((item, index) => {
          const priority = getPriority(item.expiry_date);

          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-xl border transition hover:shadow-sm
              ${priority.bg} ${priority.border}`}
            >
              {/* LEFT BAR */}
              <div
                className={`w-1.5 h-12 rounded ${priority.bar}`}
              />

              {/* CONTENT */}
              <div className="flex-1">

                <div className="flex justify-between items-center">

                  <p className="font-medium text-[12px] text-gray-800">
                    { item.product_name}
                  </p>

                  <span
                    className={`text-[12px] font-semibold ${priority.text}`}
                  >
                    {priority.label}
                  </span>

                </div>
                <div className="flex justify-between items-center">
                <p className="text-[12px] text-gray-500 mt-1">
                  {getDisplayDate(item.expiry_date)}
                </p>
                   <span
                    className={`text-[12px] font-semibold`}
                  >
                    { item.currency_name} {Number(item.total_amount_aed || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}