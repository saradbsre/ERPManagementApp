import { useState, useEffect } from "react";

const PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7D", value: "7" },
  { label: "Last 30D", value: "30" },
];

export default function ModernDateTimeFilter({ onApply }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("today");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");

  // ✅ FIX: initialize properly
  useEffect(() => {
    const r = getRange("today");
    setStartDate(r.start);
    setEndDate(r.end);
  }, []);

  const getRange = (val) => {
    const today = new Date();

    // normalize time
    const start = new Date(today);
    const end = new Date(today);

    if (val === "today") {
      // same day
    } else if (val === "yesterday") {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else {
      start.setDate(today.getDate() - Number(val));
    }

    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  };

  // ✅ FIX: always return YYYY-MM-DD correctly
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const selectPreset = (val) => {
    setSelected(val);
    const r = getRange(val);
    setStartDate(r.start);
    setEndDate(r.end);
  };

  const apply = () => {
    onApply({
      startDate: `${startDate} ${startTime}`,
      endDate: `${endDate} ${endTime}`,
    });
    setOpen(false);
  };

  // display format
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

      {/* POPUP */}
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
                  background: selected === p.value ? "#111827" : "#f3f4f6",
                  color: selected === p.value ? "#fff" : "#111",
                }}
              >
                {p.label}
              </div>
            ))}
          </div>

          {/* DATE + TIME */}
          <div style={grid}>
            <div>
              <label style={label}>Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={input}
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={input}
              />
            </div>

            <div>
              <label style={label}>End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={input}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={input}
              />
            </div>
          </div>

          {/* APPLY */}
          <button onClick={apply} style={btn}>
            Apply Filter
          </button>

        </div>
      )}
    </div>
  );
}

/* styles */

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
  boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
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
  marginBottom: 6,
};

const btn = {
  width: "100%",
  marginTop: 10,
  padding: "8px",
  borderRadius: 10,
  background: "#111827",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};