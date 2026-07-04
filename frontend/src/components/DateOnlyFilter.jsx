import { useState, useEffect } from "react";

const PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "This Week", value: "week" },
  { label: "Last Week", value: "last_week" },
  { label: "This Month", value: "month" },
  { label: "Last Month", value: "last_month" },
];

export default function ModernDateFilter({ onApply }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("month");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // INIT
  useEffect(() => {
    const r = getRange("month");
    setStartDate(r.start);
    setEndDate(r.end);
  }, []);

  // FORMAT DATE YYYY-MM-DD
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // RANGE LOGIC
  const getRange = (val) => {
  const today = new Date();

  let start = new Date(today);
  let end = new Date(today);

  if (val === "today") {
    // same day

  } else if (val === "yesterday") {
    start.setDate(today.getDate() - 1);
    end.setDate(today.getDate() - 1);

  } else if (val === "last_7_days") {
    start.setDate(today.getDate() - 6);

  } else if (val === "last_30_days") {
    start.setDate(today.getDate() - 29);

  } else if (val === "week") {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    start.setDate(today.getDate() + diff);
    end = new Date(start);
    end.setDate(start.getDate() + 6);

  } else if (val === "last_week") {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    start = new Date(today);
    start.setDate(today.getDate() + diff - 7);

    end = new Date(start);
    end.setDate(start.getDate() + 6);

  } else if (val === "month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  } else if (val === "last_month") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
};

  // PRESET SELECT
  const selectPreset = (val) => {
    setSelected(val);
    const r = getRange(val);
    setStartDate(r.start);
    setEndDate(r.end);
  };

  // APPLY FILTER (IMPORTANT)
  const apply = () => {
    onApply({
      start: startDate,
      end: endDate,
      source: "picker",
    });

    setOpen(false);
  };

  // DISPLAY FORMAT (DD-MM-YYYY)
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>

      {/* TRIGGER */}
      <div style={trigger} onClick={() => setOpen(!open)}>
        <span>
          📅 {startDate && endDate
            ? `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`
            : "Date Range"}
        </span>
        <span style={{ opacity: 0.6 }}>▾</span>
      </div>

      {/* DROPDOWN */}
      {open && (
        <div style={panel}>

          {/* PRESETS */}
          <div style={chipRow}>
            {PRESETS.map((p) => (
              <div
                key={p.value}
                onClick={() => selectPreset(p.value)}
                style={{
                  ...chip,
                  background: selected === p.value ? "#7691d1" : "#f3f4f6",
                  color: selected === p.value ? "#fff" : "#111",
                }}
              >
                {p.label}
              </div>
            ))}
          </div>

          {/* DATE INPUTS */}
          {/* <div style={grid}>
            <div>
              <label style={label}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={input}
              />
            </div>
          </div> */}

          {/* APPLY */}
          <button onClick={apply} style={btn}>
            Apply Filter
          </button>

        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const trigger = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13,
};

const panel = {
  position: "absolute",
  top: 45,
  left: 0,
  width: 320,
  background: "#fff",
  borderRadius: 14,
  padding: 14,
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.33)",
  border: "1px solid #eee",
  zIndex: 20,
};

const chipRow = {
  display: "flex",
  gap: 8,
  marginBottom: 12,
  flexWrap: "wrap",
};

const chip = {
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
  cursor: "pointer",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const label = {
  fontSize: 11,
  color: "#6b7280",
  marginBottom: 4,
};

const input = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 12,
};

const btn = {
  width: "100%",
  marginTop: 10,
  padding: "8px",
  borderRadius: 10,
  background: "#7691d1",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};