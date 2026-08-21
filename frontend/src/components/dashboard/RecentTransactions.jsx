import React, { useEffect, useMemo, useState } from "react";
import { getRecentTransactions, getMasterData } from "../../api/api";
import { formatAmount } from "../../utils/formatAmount";
import { formatDate } from "../../utils/formatDate";
import Loader from "../Loader";

export default function RecentTransactions() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = React.useState(true);
  const activeUserEmail = JSON.parse(localStorage.getItem("user"))?.email || "";
  const [groupByValue, setGroupByValue] = useState(true);
  const [groupByDate, setGroupByDate] = useState(false);

  const today = new Date();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const formatInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const minDate = formatInputDate(thirtyDaysAgo);
  const maxDate = formatInputDate(today);

  const [fromDate, setFromDate] = useState(minDate);
  const [toDate, setToDate] = useState(maxDate);

  // -----------------------------
  // FILTER STATES test
  // -----------------------------
  const [selectedMaster, setSelectedMaster] = useState("");
  const [selectedValue, setSelectedValue] = useState("");

  const [masterOptions, setMasterOptions] = useState([]);
  const [masterValues, setMasterValues] = useState([]);

  // -----------------------------
  // FETCH TRANSACTIONS + MASTER LIST
  // -----------------------------
 useEffect(() => {
  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await getRecentTransactions(activeUserEmail);
      const result = res?.data?.data || [];

      setData(result);

      const masters = [];

      result.forEach((module) => {
        (module.master_list || []).forEach((m) => {
          const exists = masters.find(
            (x) =>
              x.master === m.master &&
              x.column_name === m.column_name
          );

          if (!exists) masters.push(m);
        });
      });

      setMasterOptions(masters);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);



  // -----------------------------
  // FETCH MASTER VALUES (FOR FILTER ONLY)
  // -----------------------------
  useEffect(() => {
    if (!selectedMaster) {
      setMasterValues([]);
      setSelectedValue("");
      return;
    }

    getMasterData(selectedMaster, activeUserEmail)
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];

        const formatted = rows.map((row) => {
          const keys = Object.keys(row);

          const codeKey =
            keys.find((k) =>
              k.toLowerCase().includes("_code")
            ) || "id";

          const nameKey =
            keys.find((k) =>
              k.toLowerCase().includes("_name")
            ) ||
            keys.find((k) => typeof row[k] === "string");

          return {
            code: row[codeKey],
            name: row[nameKey],
          };
        });

        setMasterValues(formatted);
        setSelectedValue("");
      })
      .catch((err) => {
        console.error(err);
        setMasterValues([]);
      });
  }, [selectedMaster, activeUserEmail]);

  // -----------------------------
  // FLATTEN TRANSACTIONS
  // -----------------------------
  const transactions = useMemo(() => {
    return data.flatMap((master) =>
      master.alerts.flatMap((alert) =>
        alert.data.map((item) => ({
          ...item,
          date_column: alert.date_column,
        }))
      )
    );
  }, [data]);

  // -----------------------------
  // FILTER TRANSACTIONS
  // -----------------------------
 const filteredTransactions = useMemo(() => {
  let result = transactions;

  // GROUP BY VALUE
  if (groupByValue && selectedMaster && selectedValue) {
    const masterInfo = masterOptions.find(
      (m) => m.master === selectedMaster
    );

    if (masterInfo) {
      result = result.filter(
        (row) =>
          String(row[masterInfo.column_name] || "") ===
          String(selectedValue)
      );
    }
  }

  // GROUP BY DATE
  if (groupByDate && fromDate && toDate) {
    const startDate = new Date(`${fromDate}T00:00:00`);
    const endDate = new Date(`${toDate}T23:59:59`);

    result = result.filter((row) => {
      if (!row.date) return false;

      const transactionDate = new Date(row.date);

      return (
        transactionDate >= startDate &&
        transactionDate <= endDate
      );
    });
  }

  return result;
}, [
  transactions,
  groupByValue,
  groupByDate,
  selectedMaster,
  selectedValue,
  fromDate,
  toDate,
  masterOptions,
]);


    if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader type="orbit" />
      </div>
    );
  }



  return (
     <div className="w-full h-full flex flex-col min-w-0">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-800">
            Recent Transactions Last 30 Days
          </h2>
          <p className="text-[12px] text-gray-400 mt-1">
            Latest payment activities
          </p>
        </div>

        <div className="bg-blue-50 text-blue-600 text-[11px] font-semibold px-3 py-1 rounded-full">
          {filteredTransactions.length} Records
        </div>
      </div>

    {/* FILTERS */}
<div className="space-y-3 mb-5">

  {/* GROUP BY OPTIONS */}
  <div className="flex items-center gap-5">

    {/* VALUE */}
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={groupByValue}
        onChange={() => {
          setGroupByValue(true);
          setGroupByDate(false);
        }}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      <span className="text-[12px] text-gray-700">
        Group By Value
      </span>
    </label>


    {/* DATE */}
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={groupByDate}
        onChange={() => {
          setGroupByDate(true);
          setGroupByValue(false);

          // Optional: clear value filter
          setSelectedMaster("");
          setSelectedValue("");
        }}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      <span className="text-[12px] text-gray-700">
        Group By Date
      </span>
    </label>

  </div>


  {/* VALUE FILTER */}
  {groupByValue && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* MASTER */}
      <select
        value={selectedMaster}
        onChange={(e) => {
          setSelectedMaster(e.target.value);
          setSelectedValue("");
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px]"
      >
        <option value="">Group By</option>

        {masterOptions.map((m) => (
          <option
            key={`${m.master}-${m.column_name}`}
            value={m.master}
          >
            {m.display_name}
          </option>
        ))}
      </select>


      {/* VALUE */}
      <select
        value={selectedValue}
        disabled={!selectedMaster}
        onChange={(e) => setSelectedValue(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px] cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">Value</option>

        {masterValues.map((item, i) => (
          <option key={i} value={item.code}>
            {item.name}
          </option>
        ))}
      </select>

    </div>
  )}


  {/* DATE FILTER */}
  {groupByDate && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* FROM DATE */}
      <div>
        <label className="block text-[11px] text-gray-400 mb-1">
          From Date
        </label>

        <input
          type="date"
          value={fromDate}
          min={minDate}
          max={toDate || maxDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px]"
        />
      </div>


      {/* TO DATE */}
      <div>
        <label className="block text-[11px] text-gray-400 mb-1">
          To Date
        </label>

        <input
          type="date"
          value={toDate}
          min={fromDate || minDate}
          max={maxDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[12px]"
        />
      </div>

    </div>
  )}

</div>

      {/* LIST */}
      <div className={`space-y-3 ${
  filteredTransactions.length > 5
    ? "max-h-[850px] overflow-y-auto pr-2"
    : ""
}`}>

        {filteredTransactions.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-400 text-[12px]">
            No recent transactions found
          </div>
        )}

        {filteredTransactions.map((item, i) => {
          const amount = Number(item.total_amount_aed || 0);
          
          return (
            <div
              key={i}
              className="group bg-gray-50 hover:bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3 min-w-0"
            >
              {/* LEFT */}
              <div className="ml-3 flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-[12px] truncate">
                  { item.prd_name}
                </h3>

                <p className="text-[12px] text-gray-400 mt-1">
                  {formatDate(item.date)}
                </p>
              </div>

              {/* RIGHT */}
              <div className="text-right ml-2 flex-shrink-0">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold bg-green-100 text-green-700">
                  AED {formatAmount(amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}