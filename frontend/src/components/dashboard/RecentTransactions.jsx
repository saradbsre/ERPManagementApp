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
    <div className="bg-white p-5 rounded-xl shadow">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
       
        <span className="text-xs text-gray-400">
          {transactions.length} records
        </span>
      </div>

      {/* LIST */}
      <div className="space-y-3 max-h-96 overflow-y-auto">

        {transactions.length === 0 && (
          <p className="text-sm text-gray-400">
            No recent transactions found
          </p>
        )}

        {transactions.map((item, i) => {
          const amount =
            item.total_cost_monthly_aed ||
            item.amount_aed ||
            item.amount_usd ||
            0;

          return (
            <div
              key={i}
              className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-200
              hover:shadow-md hover:-translate-y-0.5 ${getColor(amount)}`}
            >

              {/* LEFT SIDE */}
              <div className="space-y-1">

                <p className="font-medium text-sm">
                  {item.provider_name || item.module_name}
                </p>

                <p className="text-xs text-gray-500">
                  {item.module_display_name ||
                    item.module_name}
                </p>

                <p className="text-xs text-gray-400">
                  {formatDate(item.created_at)}
                </p>

              </div>

              {/* RIGHT SIDE */}
              <div className="text-right">

                <p className="font-semibold text-sm">
                  {amount} AED
                </p>

               

              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}