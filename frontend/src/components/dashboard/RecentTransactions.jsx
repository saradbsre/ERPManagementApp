import React, { useEffect, useMemo, useState } from "react";
import { getRecentTransactions } from "../../api/api";

export default function RecentTransactions() {
  const [data, setData] = useState([]);

  // -----------------------------
  // FETCH
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getRecentTransactions();
        setData(res?.data?.data || []);
      } catch (err) {
        console.error(err);
        setData([]);
      }
    };

    fetchData();
  }, []);

  // -----------------------------
  // FLATTEN DATA
  // -----------------------------
  const transactions = useMemo(() => {
    return data.flatMap((master) =>
      master.alerts.flatMap((alert) =>
        alert.data.map((item) => ({
          ...item,
          date_column: alert.date_column
        }))
      )
    );
  }, [data]);

  // -----------------------------
  // FORMAT DATE
  // -----------------------------
  const formatDate = (date) =>
    new Date(date).toLocaleDateString();

  // -----------------------------
  // COLOR BY VALUE
  // -----------------------------
  const getColor = (amount) => {
    if (!amount) return "bg-gray-50 border-gray-200";
    if (amount > 500) return "bg-red-50 border-red-200";
    if (amount > 200) return "bg-orange-50 border-orange-200";
    return "bg-green-50 border-green-200";
  };

return (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

    {/* HEADER */}
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Recent Transactions
        </h2>

        <p className="text-sm text-gray-400 mt-1">
          Latest payment activities
        </p>
      </div>

      <div className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">
        {transactions.length} Records
      </div>
    </div>

    {/* LIST */}
    <div
      className={`
        space-y-3
        ${transactions.length > 5
          ? "max-h-[420px] overflow-y-auto pr-2"
          : ""}
      `}
    >

      {transactions.length === 0 && (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          No recent transactions found
        </div>
      )}

      {transactions.map((item, i) => {

        const amount = Number(item.total_amount_aed || 0);

        return (
          <div
            key={i}
            className="
              group
              bg-gray-50
              hover:bg-white
              border border-gray-100
              rounded-2xl
              p-4
              transition-all
              duration-300
              hover:shadow-md
              hover:-translate-y-1
              flex
              justify-between
              items-center
              relative
              overflow-hidden
            "
          >

            {/* LEFT BORDER */}
            <div
              className={`
                absolute left-0 top-0 h-full w-1
                ${amount > 500
                  ? "bg-red-500"
                  : amount > 200
                  ? "bg-orange-400"
                  : "bg-green-500"}
              `}
            />

            {/* LEFT */}
            <div className="ml-3 flex-1 min-w-0">

              <h3 className="font-semibold text-gray-800 text-sm truncate">
                {item.service_providers || item.module_name}
              </h3>

              <div className="flex items-center gap-2 mt-1">

                {/* <p className="text-xs text-gray-500 truncate">
                  {item.company || "No Company"}
                </p> */}

                <span className="w-1 h-1 rounded-full bg-gray-300" />

                <p className="text-xs text-gray-400">
                  {formatDate(item.created_at)}
                </p>

              </div>
            </div>

            {/* RIGHT */}
            <div className="text-right ml-4">

              <div
                className={`
                  inline-flex
                  items-center
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  font-semibold
                  ${amount > 500
                    ? "bg-red-100 text-red-700"
                    : amount > 200
                    ? "bg-orange-100 text-orange-700"
                    : "bg-green-100 text-green-700"}
                `}
              >
                AED {amount}
              </div>

            </div>

          </div>
        );
      })}
    </div>
  </div>
);
}