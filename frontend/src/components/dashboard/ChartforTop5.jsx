import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { getTopExpensiveAssets, getMasterData } from "../../api/api";

export default function ChartforTop5() {
  const [data, setData] = useState([]); // This will be the flattened data for charting
  const [modules, setModules] = useState([]); // List of modules for dropdown
  const [selectedModule, setSelectedModule] = useState("");
  const [serviceProviders, setServiceProviders] = useState([]);
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;

  useEffect(() => {
    getMasterData("products", activeUserEmail).then((res) => {
      const result = Array.isArray(res?.data) ? res.data : [];
      setServiceProviders(result);
    }).catch(() => setServiceProviders([]));
  }, []);

  const productNameByCode = useMemo(() => {
    const map = new Map();
    serviceProviders.forEach((sp) => {
      const code = String(sp.prd_code || "").trim();
      const name = String(sp.prd_name || sp.prd_name || "").trim();
      if (code) map.set(code, name || code);
    });
    return map;
  }, [serviceProviders]);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getTopExpensiveAssets();
        // Defensive: result.data may be an object with a 'data' array
        const modulesArr = Array.isArray(result?.data?.data) ? result.data.data : [];

        // Flatten all asset data with module info for charting
        const flatData = modulesArr.flatMap((mod) =>
          (Array.isArray(mod.data) ? mod.data : []).map((item) => ({
            ...item,
            module_display_name: mod.module_display_name
          }))
        );

        setData(flatData);
        setModules(modulesArr.map((mod) => ({
          name: mod.module_display_name,
          value: mod.module_display_name
        })));

        if (modulesArr.length > 0) {
          setSelectedModule(modulesArr[0].module_display_name);
        }
      } catch (err) {
        console.error(err);
        setData([]);
        setModules([]);
      }
    };

    fetchData();
  }, []);

  // modules state is now set in useEffect

  // -----------------------------
  // FILTER DATA
  // -----------------------------
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data
      .filter((item) => item.module_display_name === selectedModule)
      .map((item) => {
        const code = String(item.products || "").trim(); // e.g. PR010
        return {
          name: productNameByCode.get(code) || code, // show product_name
          "total AED": Number(item.total_amount_aed) || 0
        };
      });
  }, [data, selectedModule, productNameByCode]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl shadow-lg border border-gray-100 w-full h-96 overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">

        <div>
          <h2 className="font-semibold text-gray-800 text-lg">
            Top Expenses
          </h2>
          <p className="text-xs text-gray-400">
            Provider wise spending analysis
          </p>
        </div>

        {/* DROPDOWN */}
        <select
          className="bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
        >
          {modules.map((m, i) => (
            <option key={i} value={m.value}>
              {m.name}
            </option>
          ))}
        </select>

      </div>

      {/* CHART OR NO DATA MESSAGE */}
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-4/5">
          <span className="text-gray-400 text-sm">No transactions for this month</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            {/* GRADIENT */}
            <defs>
              <linearGradient id="barColor" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>

            {/* X AXIS */}
            <XAxis
              type="number"
              tick={{ fill: "#6B7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            {/* Y AXIS (REDUCED WIDTH → FIX LEFT GAP) */}
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: "#374151", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />

            {/* TOOLTIP */}
            <Tooltip
              cursor={{ fill: "rgba(99,102,241,0.08)" }}
              contentStyle={{
                borderRadius: "10px",
                border: "none",
                boxShadow: "0 8px 20px rgba(0,0,0,0.1)"
              }}
            />

            {/* BAR */}
            <Bar
              dataKey="total AED"
              fill="url(#barColor)"
              radius={[0, 10, 10, 0]}
              barSize={18}
            />

          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}