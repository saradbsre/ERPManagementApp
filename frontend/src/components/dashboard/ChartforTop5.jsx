import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import { getTopExpensiveAssets } from "../../api/api";

export default function CostChart() {
  const [data, setData] = useState([]);
  const [selectedModule, setSelectedModule] = useState("");

  // -----------------------------
  // FETCH DATA
  // -----------------------------
useEffect(() => {
  const fetchData = async () => {
    try {
      const result = await getTopExpensiveAssets();

     // console.log("FULL API RESULT:", result);

      const rows = result?.data || [];

      //console.log("Fetched Data:", rows);

      setData(rows);

      if (rows.length > 0) {
        setSelectedModule(rows[0].module_display_name);
        console.log("First Module:", rows[0].module_display_name);
      }
    } catch (err) {
      console.error("API error:", err);
      setData([]);
    }
  };

  fetchData();
}, []);

  // -----------------------------
  // UNIQUE MODULES FOR DROPDOWN
  // -----------------------------
  const modules = useMemo(() => {
    const map = new Map();

    data.forEach((item) => {
      if (!map.has(item.module_display_name)) {
        map.set(item.module_display_name, {
          name: item.module_display_name,
          value: item.module_name
        });
      }
    });

    return Array.from(map.values());
  }, [data]);

  // -----------------------------
  // CHART DATA (FIXED FILTER)
  // -----------------------------
  const chartData = useMemo(() => {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item) => item.module_display_name === selectedModule)
    .map((item) => ({
      name: item.provider_name,
      total: item.total_cost_monthly_aed || 0
    }));
}, [data, selectedModule]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="bg-white p-4 rounded-xl shadow h-96">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">

        <h2 className="font-semibold">
          Top Expenses by Provider
        </h2>

        {/* MODULE FILTER (DISPLAY NAME) */}
        <select
          className="border p-2 rounded"
          value={selectedModule}
          onChange={(e) =>
            setSelectedModule(e.target.value)
          }
        >
          {modules.map((m, i) => (
            <option key={i} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* CHART */}
     <ResponsiveContainer width="100%" height="85%">
        <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
            <XAxis type="number" />
            <YAxis
            type="category"
            dataKey="name"
            width={150}
            />
            <Tooltip />
            <Bar dataKey="total" fill="#4f46e5" />
        </BarChart>
        </ResponsiveContainer>
    </div>
  );
}