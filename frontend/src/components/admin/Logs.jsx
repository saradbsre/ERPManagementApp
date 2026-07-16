import { useEffect, useState } from "react";
import { getLogs } from "../../api/api";
import DateTimeRangeFilter from "../DateRangeFilter";
import Loader from "../Loader";

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

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
};

/* ---------------- COMPONENT ---------------- */

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const [userSearch, setUserSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [expandedLog, setExpandedLog] = useState(null);
  // Set default date range and fetch logs on mount
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
    // eslint-disable-next-line
  }, []);

  // Fetch logs function
  const fetchLogs = async (range = filters) => {
    setLoading(true);
    try {
      const res = await getLogs(range);
      setLogs(res.data);
    } catch (err) {
      setLogs([]);
    }
    setLoading(false);
  };

  // Date range filter handler
  const handleDateChange = (range) => {
    setFilters(range);
    fetchLogs(range);
  };

  // Filter logs by user, action, and module
  const filtered = logs.filter(
    (l) =>
      l.userid?.toLowerCase().includes(userSearch.toLowerCase()) &&
      l.action?.toLowerCase().includes(actionSearch.toLowerCase()) &&
      l.module_name?.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  return (
    <div style={page}>
      <h2 style={{ marginBottom: 15 }}>Audit Logs</h2>

      {/* Loader */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader type="orbit" />
        </div>
      ) : (
        <>
          {/* TEXT FILTERS */}
        <div
  className="
    flex 
    flex-col 
    sm:flex-row 
    gap-3 
    mb-4
    w-full
  "
>

  <input
    placeholder="Filter user"
    value={userSearch}
    onChange={(e) => setUserSearch(e.target.value)}
    className="
      w-full 
      sm:w-56 
      px-3 
      py-2 
      border 
      rounded-lg
      focus:outline-none
      focus:ring-2
      focus:ring-blue-400
    "
  />


  <input
    placeholder="Filter action"
    value={actionSearch}
    onChange={(e) => setActionSearch(e.target.value)}
    className="
      w-full 
      sm:w-56 
      px-3 
      py-2 
      border 
      rounded-lg
      focus:outline-none
      focus:ring-2
      focus:ring-blue-400
    "
  />


  <input
    placeholder="Filter module"
    value={moduleSearch}
    onChange={(e) => setModuleSearch(e.target.value)}
    className="
      w-full 
      sm:w-56 
      px-3 
      py-2 
      border 
      rounded-lg
      focus:outline-none
      focus:ring-2
      focus:ring-blue-400
    "
  />


  <div className="w-full sm:w-auto">
    <DateTimeRangeFilter
      onApply={handleDateChange}
    />
  </div>


</div>

          {/* TABLE */}
          {/* DESKTOP TABLE */}
<div className="hidden md:block" style={card}>
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

      <div>{formatDateTime(log.sysdate)}</div>

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
{/* MOBILE AUDIT LOG CARDS */}
<div className="md:hidden space-y-3">

  {filtered.map((log, i) => (

    <div
      key={i}
      className="bg-white rounded-xl shadow border overflow-hidden"
    >

      {/* Header */}
      <button
        className="w-full flex justify-between items-center p-4"
        onClick={() =>
          setExpandedLog(
            expandedLog === i ? null : i
          )
        }
      >

        <div className="text-left">

          <div className="font-semibold">
            {log.userid}
          </div>

          <div className="text-xs text-gray-500">
            {formatDateTime(log.sysdate)}
          </div>

        </div>


        <span className="text-xl text-gray-500">
          {expandedLog === i ? "−" : "+"}
        </span>

      </button>



      {/* Drawer */}
      {expandedLog === i && (

        <div className="border-t bg-gray-50 p-4 space-y-3">


          <div className="flex justify-between">
            <span className="font-medium">
              Action
            </span>

            <span
              style={{
                ...chip,
                background:
                  getActionColor(log.action) + "20",
                color:
                  getActionColor(log.action),
              }}
            >
              {formatAction(log.action)}
            </span>

          </div>



          <div className="flex justify-between">
            <span className="font-medium">
              Module
            </span>

            <span>
              {log.module_name}
            </span>
          </div>



          <div className="flex justify-between">
            <span className="font-medium">
              Status
            </span>

            <span
              style={{
                ...chip,
                background:
                  getStatusColor(log.status) + "20",
                color:
                  getStatusColor(log.status),
              }}
            >
              {log.status}
            </span>

          </div>



          <div>
            <div className="font-medium mb-1">
              Message
            </div>

            <div className="bg-white rounded p-3 text-sm">
              {log.message}
            </div>
          </div>


        </div>

      )}

    </div>

  ))}

</div>
        </>
      )}
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