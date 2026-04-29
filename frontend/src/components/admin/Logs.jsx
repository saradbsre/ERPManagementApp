import { useEffect, useState } from "react";
import { getLogs } from "../../api/api";
import DateTimeRangeFilter from "../DateRangeFilter";

/* ---------------- FORMATTERS ---------------- */

const formatAction = (action) => {
  if (!action) return "";

  const a = action.toUpperCase();

  if (a.startsWith("FETCH")) return "Fetch";
  if (a.startsWith("DELETE")) return "Delete";
  if (a.startsWith("UPDATE")) return "Update";
  if (a.startsWith("CREATE")) return "Create";
  if (a.includes("LOGIN")) return "Login";
  if (a.includes("LOGOUT")) return "Logout";
  if (a.includes("EXPORT")) return "Export";
  if (a.includes("IMPORT")) return "Import";
  if (a.includes("REGISTER")) return "Register";
  if (a.includes("APPROVE")) return "Approve";
    if (a.includes("REJECT")) return "Reject";
    if (a.includes("TOGGLE")) return "Toggle";

  return action;
};

const getActionColor = (action) => {
  const a = action?.toUpperCase();

    if (a.startsWith("FETCH")) return "#3B82F6";
    if (a.startsWith("DELETE")) return "#EF4444";
    if (a.startsWith("UPDATE")) return "#F59E0B";
    if (a.startsWith("CREATE")) return "#10B981";
    if (a.includes("LOGIN")) return "#6EE7B7";
    if (a.includes("LOGOUT")) return "#6B7280";
    if (a.includes("EXPORT")) return "#8B5CF6";
    if (a.includes("IMPORT")) return "#EC4899";
    if (a.includes("REGISTER")) return "#3B82F6";
    if (a.includes("APPROVE")) return "#10B981";
    if (a.includes("REJECT")) return "#EF4444";
    if (a.includes("TOGGLE")) return "#F59E0B";

  return "#6B7280";
};

const getStatusColor = (status) => {
  if (status === "SUCCESS") return "#10B981";
  if (status === "FAILED") return "#EF4444";
  return "#6B7280";
};

export default function Logs() {
  const [logs, setLogs] = useState([]);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const [userSearch, setUserSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");

  useEffect(() => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const defaultRange = {
    startDate: yesterday.toISOString().slice(0, 10) + " 00:00",
    endDate: today.toISOString().slice(0, 10) + " 23:59",
  };

  setFilters(defaultRange);
  fetchLogs(defaultRange);
}, []);

  /* LOAD LOGS */
 const fetchLogs = async (range = filters) => {
  const res = await getLogs(range);

  setLogs(res.data);
};

  useEffect(() => {
    fetchLogs();
  }, []);

  /* APPLY DATE RANGE */
  const handleDateChange = (range) => {
    setFilters(range);
    fetchLogs(range);
  };

  const filtered = logs.filter(
    (l) =>
      l.userid?.toLowerCase().includes(userSearch.toLowerCase()) &&
      l.action?.toLowerCase().includes(actionSearch.toLowerCase()) &&
      l.module_name?.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  return (
    <div style={page}>

      <h2 style={{ marginBottom: 15 }}>Audit Logs</h2>


      {/* TEXT FILTERS */}
      <div style={filterRow}>
        <input
          placeholder="Filter user"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          style={input}
        />

        <input
          placeholder="Filter action"
          value={actionSearch}
          onChange={(e) => setActionSearch(e.target.value)}
          style={input}
        />
        <input
          placeholder="Filter module"
          value={moduleSearch}
          onChange={(e) => setModuleSearch(e.target.value)}
          style={input}
        />
          {console.log("Rendering DateTimeRangeFilter with filters:", filters)}
        <DateTimeRangeFilter
  onApply={(range) => {
    setFilters(range);     // ✅ update state
    fetchLogs(range);      // ✅ call API
  }}
/>
      </div>

      {/* TABLE */}
      <div style={card}>

        <div style={headerRow}>
          <div>User</div>
          <div>Action</div>
          <div>Date</div>
          <div>Module</div>
          <div>Status</div>
          <div>Message</div>
        </div>

        {filtered.map((log, i) => (
          <div key={i} style={row}>

            <div>{log.userid}</div>

            <div>
              <span
                style={{
                  ...chip,
                  background: getActionColor(log.action) + "20",
                  color: getActionColor(log.action),
                }}
              >
                {formatAction(log.action)}
              </span>
            </div>

            <div>{new Date(log.sysdate).toLocaleString()}</div>
            <div>{log.module_name}</div>

            <div>
              <span
                style={{
                  ...chip,
                  background: getStatusColor(log.status) + "20",
                  color: getStatusColor(log.status),
                }}
              >
                {log.status}
              </span>
            </div>

            <div>{log.message}</div>

          </div>
        ))}

      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const page = { padding: 20, background: "#f6f7fb", minHeight: "100vh" };

const filterRow = { display: "flex", gap: 10, marginBottom: 15 };

const input = {
  padding: "8px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
  width: 200,
};

const card = {
  background: "#fff",
  borderRadius: 12,
  overflow: "hidden",
};

const headerRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 2fr",
  padding: "12px 15px",
  background: "#f3f4f6",
  fontWeight: 600,
  fontSize: 13,
};

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 2fr",
  padding: "12px 15px",
  borderTop: "1px solid #eee",
  fontSize: 13,
};

const chip = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
};