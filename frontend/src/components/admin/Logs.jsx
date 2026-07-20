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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  useEffect(() => {
    const resize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

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
      {/* FILTERS */}

{isMobile ? (

<>
<button
onClick={()=>setShowFilterDrawer(true)}
style={{
width:"100%",
padding:"12px",
borderRadius:14,
border:"1px solid #e5e7eb",
background:"#fff",
fontWeight:600,
marginBottom:15
}}
>
🔍 Filters
</button>


{showFilterDrawer && (

<div
style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,.35)",
zIndex:50,
display:"flex",
alignItems:"flex-end"
}}
>


<div
style={{
background:"#fff",
width:"100%",
borderRadius:"24px 24px 0 0",
padding:20,
maxHeight:"80vh",
overflowY:"auto"
}}
>


<div
style={{
width:45,
height:5,
background:"#d1d5db",
borderRadius:20,
margin:"0 auto 20px"
}}
/>



<div
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}}
>

<h3
style={{
margin:0,
fontSize:18,
fontWeight:700
}}
>
Filter Logs
</h3>


<button
onClick={()=>setShowFilterDrawer(false)}
style={{
border:"none",
background:"#f3f4f6",
borderRadius:"50%",
width:34,
height:34
}}
>
✕
</button>

</div>



<input
placeholder="Filter user"
value={userSearch}
onChange={(e)=>setUserSearch(e.target.value)}
style={mobileInput}
/>



<input
placeholder="Filter action"
value={actionSearch}
onChange={(e)=>setActionSearch(e.target.value)}
style={mobileInput}
/>



<input
placeholder="Filter module"
value={moduleSearch}
onChange={(e)=>setModuleSearch(e.target.value)}
style={mobileInput}
/>


<div style={{marginTop:12}}>
<DateTimeRangeFilter
onApply={handleDateChange}
/>
</div>



<button
onClick={()=>setShowFilterDrawer(false)}
style={{
width:"100%",
marginTop:20,
padding:12,
borderRadius:12,
border:"none",
background:"#2563eb",
color:"#fff",
fontWeight:600
}}
>
Apply Filters
</button>


</div>

</div>

)}

</>


) : (

<div
className="
flex flex-col sm:flex-row gap-3 mb-4
"
>


<input
placeholder="Filter user"
value={userSearch}
onChange={(e)=>setUserSearch(e.target.value)}
className="w-full sm:w-56 px-3 py-2 border rounded-lg"
/>


<input
placeholder="Filter action"
value={actionSearch}
onChange={(e)=>setActionSearch(e.target.value)}
className="w-full sm:w-56 px-3 py-2 border rounded-lg"
/>


<input
placeholder="Filter module"
value={moduleSearch}
onChange={(e)=>setModuleSearch(e.target.value)}
className="w-full sm:w-56 px-3 py-2 border rounded-lg"
/>


<DateTimeRangeFilter
onApply={handleDateChange}
/>


</div>

)}


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
{/* MOBILE AUDIT LOG CARDS */}

<div className="md:hidden space-y-4">

{filtered.map((log, i)=>(

<div
key={i}
style={{
background:"#fff",
borderRadius:18,
border:"1px solid #e5e7eb",
boxShadow:"0 6px 18px rgba(0,0,0,.05)",
overflow:"hidden"
}}
>


{/* CARD HEADER */}

<button
onClick={()=>setExpandedLog(
  expandedLog === i ? null : i
)}
style={{
width:"100%",
padding:16,
display:"flex",
justifyContent:"space-between",
alignItems:"center",
background:"#fff",
border:"none"
}}
>


<div
style={{
display:"flex",
alignItems:"center",
gap:12
}}
>


<div
style={{
width:42,
height:42,
borderRadius:"50%",
background:"#eff6ff",
display:"flex",
alignItems:"center",
justifyContent:"center",
fontWeight:700,
color:"#2563eb"
}}
>
{log.userid?.charAt(0)?.toUpperCase()}
</div>



<div style={{textAlign:"left"}}>

<div
style={{
fontWeight:700,
fontSize:15,
color:"#111827"
}}
>
{log.userid}
</div>


<div
style={{
fontSize:12,
color:"#6b7280",
marginTop:3
}}
>
{formatDateTime(log.sysdate)}
</div>


</div>


</div>




<div
style={{
width:32,
height:32,
borderRadius:"50%",
background:"#f3f4f6",
display:"flex",
alignItems:"center",
justifyContent:"center",
fontSize:20,
color:"#6b7280"
}}
>
{expandedLog===i ? "−":"+"}
</div>


</button>





{/* EXPANDED DETAILS */}

{expandedLog===i && (

<div
style={{
borderTop:"1px solid #f1f5f9",
padding:16,
background:"#f8fafc"
}}
>



{/* ACTION + STATUS */}

<div
style={{
display:"flex",
gap:10,
marginBottom:15
}}
>


<span
style={{
...chip,
background:getActionColor(log.action)+"18",
color:getActionColor(log.action),
fontWeight:600
}}
>
{formatAction(log.action)}
</span>



<span
style={{
...chip,
background:getStatusColor(log.status)+"18",
color:getStatusColor(log.status),
fontWeight:600
}}
>
{log.status}
</span>


</div>





{/* INFO BOX */}

<div
style={{
background:"#fff",
borderRadius:14,
padding:14,
border:"1px solid #eef2f7",
display:"flex",
flexDirection:"column",
gap:12
}}
>


<div
style={{
display:"flex",
justifyContent:"space-between",
fontSize:14
}}
>
<span style={{color:"#6b7280"}}>
Module
</span>

<b>
{log.module_name}
</b>

</div>




<div
style={{
height:1,
background:"#f1f5f9"
}}
/>




<div>

<div
style={{
color:"#6b7280",
fontSize:13,
marginBottom:6
}}
>
Message
</div>


<div
style={{
background:"#f8fafc",
padding:12,
borderRadius:12,
fontSize:13,
color:"#374151",
lineHeight:"20px"
}}
>
{log.message || "-"}
</div>


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

const mobileInput={
width:"100%",
padding:"12px",
borderRadius:12,
border:"1px solid #e5e7eb",
marginBottom:12,
outline:"none"
};
