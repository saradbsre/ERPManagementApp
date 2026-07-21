import React, { useEffect, useMemo, useState } from "react";
import { getAlertData, getMasterData } from "../../api/api";

export default function RenewalTimeline() {
  const [data, setData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("today_tomorrow");
  const activeUserEmail = JSON.parse(localStorage.getItem("user"))?.email || "";
  const [serviceProviderMap, setServiceProviderMap] = useState({});
  const [currencyMap, setCurrencyMap] = useState({});

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [productsRes, currencyRes] = await Promise.all([
          getMasterData("products", activeUserEmail),
          getMasterData("currency", activeUserEmail),
        ]);

        // -----------------------------
        // PRODUCTS
        // -----------------------------
        const productRows = Array.isArray(productsRes?.data)
          ? productsRes.data
          : [];

        const productMap = {};

        productRows.forEach((row) => {
          const codeKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("prd_code")
            ) || "prd_code";

          const nameKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("prd_name")
            ) || "prd_name";

          if (row[codeKey]) {
            productMap[row[codeKey]] = row[nameKey];
          }
        });

        setServiceProviderMap(productMap);

        // -----------------------------
        // CURRENCY
        // -----------------------------
        const currencyRows = Array.isArray(currencyRes?.data)
          ? currencyRes.data
          : [];

        const currMap = {};

        currencyRows.forEach((row) => {
          const codeKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("curr_code")
            ) || "curr_code";

          const nameKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("currency_name")
            ) ||
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("curr_name")
            ) ||
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("currency")
            );

          if (row[codeKey]) {
            currMap[row[codeKey]] = row[nameKey];
          }
        });

        setCurrencyMap(currMap);

      } catch (err) {
        console.error(err);
      }
    };

    loadMasters();
  }, [activeUserEmail]);
  const fetchAlerts = async (filter = "today_tomorrow") => {
    try {
      const res = await getAlertData(filter);
      setData(res?.data?.data || []);
    } catch (err) {
      console.error(err);
      setData([]);
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
        label: "Overdue",
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

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl  w-full h-96 overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">

        <h2 className="text-lg font-semibold text-gray-800">
          Renewal Alerts
        </h2>

        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm text-sm"
        >
          <option value="today_tomorrow">Today & Tomorrow</option>
          <option value="this_week">This Week</option>
          <option value="next_week">Next Week</option>
          <option value="next_month">Next Month</option>
        </select>

      </div>

      {/* LIST */}
      <div className="space-y-3 max-h-75 overflow-y-auto">

        {sortedData.length === 0 && (
          <p className="text-gray-400 text-sm">
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

                  <p className="font-medium text-sm text-gray-800">
                    {serviceProviderMap[item.prd_code] || item.prd_code}
                  </p>

                  <span
                    className={`text-xs font-semibold ${priority.text}`}
                  >
                    {priority.label}
                  </span>

                </div>
                <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 mt-1">
                  {getDisplayDate(item.expiry_date)}
                </p>
                   <span
                    className={`text-xs font-semibold`}
                  >
                    {currencyMap[item.curr_code] || item.curr_code} {Number(item.total_amount_aed || 0).toFixed(2)}
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