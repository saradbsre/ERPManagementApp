import React, { useEffect, useMemo, useState } from "react";
import { getRecentTransactions, getMasterData } from "../../api/api";
import { formatAmount } from "../../utils/formatAmount";
import { formatDate } from "../../utils/formatDate";

export default function RecentTransactions() {
  const [data, setData] = useState([]);

  const activeUserEmail =
    JSON.parse(localStorage.getItem("user"))?.email || "";

  // -----------------------------
  // FILTER STATES test
  // -----------------------------
  const [selectedMaster, setSelectedMaster] = useState("");
  const [selectedValue, setSelectedValue] = useState("");

  const [masterOptions, setMasterOptions] = useState([]);
  const [masterValues, setMasterValues] = useState([]);

  // -----------------------------
  // PERMANENT DISPLAY MAP (IMPORTANT FIX)
  // -----------------------------
  const [serviceProviderMap, setServiceProviderMap] = useState({});
  const [currencyMap, setCurrencyMap] = useState({});

  // -----------------------------
  // FETCH TRANSACTIONS + MASTER LIST
  // -----------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getRecentTransactions();
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
      }
    };

    fetchData();
  }, []);

  // -----------------------------
  // LOAD SERVICE PROVIDERS ONCE (FOR DISPLAY ONLY)
  // -----------------------------
  useEffect(() => {
    const loadServiceProviders = async () => {
      try {
        const res = await getMasterData("products", activeUserEmail);
        const rows = Array.isArray(res?.data) ? res.data : [];
        //console.log("Loaded service providers:", rows);
        const map = {};

        rows.forEach((row) => {
          const codeKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("prd_code")
            ) || "key";

          const nameKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("prd_name")
            );

          if (row[codeKey] && row[nameKey]) {
            map[row[codeKey]] = row[nameKey];
          }
        });

        setServiceProviderMap(map);
        //console.log("Service Provider Map:", map);
      } catch (err) {
        console.error(err);
      }
    };

    loadServiceProviders();
  }, [activeUserEmail]);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const res = await getMasterData("currency", activeUserEmail);
        const rows = Array.isArray(res?.data) ? res.data : [];

        const map = {};

        rows.forEach((row) => {
          const codeKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("_code")
            ) || "id";

          const nameKey =
            Object.keys(row).find((k) =>
              k.toLowerCase().includes("currency")
            );

          if (row[codeKey] && row[nameKey]) {
            map[row[codeKey]] = row[nameKey];
          }
        });

        setCurrencyMap(map);
        console.log("Currency Map:", map);
      } catch (err) {
        console.error(err);
      }
    };

    loadCurrencies();
  }, [activeUserEmail]);

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
    if (!selectedMaster || !selectedValue) return transactions;

    const masterInfo = masterOptions.find(
      (m) => m.master === selectedMaster
    );

    if (!masterInfo) return transactions;

    return transactions.filter(
      (row) =>
        String(row[masterInfo.column_name] || "") ===
        String(selectedValue)
    );
  }, [transactions, selectedMaster, selectedValue, masterOptions]);



  return (
     <div className="w-full h-full flex flex-col min-w-0">

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
          {filteredTransactions.length} Records
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">

        {/* MASTER */}
        <select
          value={selectedMaster}
          onChange={(e) => setSelectedMaster(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value=""> Value</option>

          {masterValues.map((item, i) => (
            <option key={i} value={item.code}>
               {item.name}
            </option>
          ))}
        </select>

      </div>

      {/* LIST */}
      <div className={`space-y-3 ${
  filteredTransactions.length > 5
    ? "max-h-[420px] overflow-y-auto pr-2"
    : ""
}`}>

        {filteredTransactions.length === 0 && (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
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
                <h3 className="font-semibold text-gray-800 text-sm truncate">
                  {/* ✅ FINAL FIX: ALWAYS SHOW NAME */}
                  {serviceProviderMap[item.prd_code] || item.prd_code}
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(item.date)}
                </p>
              </div>

              {/* RIGHT */}
              <div className="text-right ml-2 flex-shrink-0">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                  {currencyMap[item.currency] } {formatAmount(amount)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}