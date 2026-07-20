import { useState, useEffect } from "react";
import {
  signupRequest,
  fetchForgotPasswordReqs,
  confirmRequest,
  resetPassword
} from "../../api/api";

export default function Approvals() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [requestType, setRequestType] = useState("signup");
  const isMobile = window.innerWidth < 768;
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;

  // modal
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempPassword, setTempPassword] = useState("");

  const [sortConfig] = useState({
    key: "",
    direction: "asc",
  });

  /* ---------------- LOAD DATA ---------------- */
  const loadData = async () => {
    try {
      if (requestType === "signup") {
        const res = await signupRequest();
        setUsers(res.data);
      } else {
        const res = await fetchForgotPasswordReqs();
        setUsers(res.data);
      }
    } catch (err) {
      console.error("Error loading requests:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [requestType]);

  /* ---------------- REFRESH ---------------- */
  const refreshData = () => loadData();

  /* ---------------- GENERATE PASSWORD ---------------- */
  const generatePassword = () => {
    const pass = Math.random().toString(36).slice(-10) + "A@1";
    setTempPassword(pass);
  };

  /* ---------------- APPROVE HANDLER ---------------- */
  const handleApprove = async (user) => {
    try {
      if (requestType === "signup") {
        // ✅ DIRECT APPROVAL (NO MODAL)
        await confirmRequest(
          user.id,
          true,
          user.email,
          activeUserEmail
        );

        refreshData();
        return;
      }

      // 🔥 FORGOT PASSWORD → OPEN MODAL
      setSelectedUser(user);
      generatePassword();
      setShowModal(true);

    } catch (err) {
      console.error("Approve failed:", err);
    }
  };

  /* ---------------- CANCEL ---------------- */
  const handleToggleStatus = async (user, action) => {
    try {
      if (requestType === "signup") {
       await confirmRequest(user.id, false, user.email, activeUserEmail);
      } else {
        await fetch("/api/forgot-password/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user.id,
            isCancel: action === "cancel",
            email: user.email,
            activeUserEmail,
          }),
        });
      }

      refreshData();
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  /* ---------------- FILTER ---------------- */
  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ---------------- CONFIRM PASSWORD RESET ---------------- */
  const handleConfirm = async () => {
    try {
      await resetPassword({
        email: selectedUser.email,
        tempPassword: tempPassword
      });

      setShowModal(false);
      setSelectedUser(null);
      setTempPassword("");

      refreshData();
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

 return (
  <div
    style={{
      minHeight: "100%",
      background: "#fff",
      padding: isMobile ? 12 : 24,
    }}
  >

    {/* HEADER */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        flexWrap:"wrap",
        gap:12
      }}
    >
      <div>
        <h2
          style={{
            margin:0,
            fontSize:22,
            fontWeight:700,
            color:"#111827"
          }}
        >
          Approvals
        </h2>

        <p
          style={{
            margin:0,
            color:"#6b7280",
            fontSize:14
          }}
        >
          Manage signup and password requests
        </p>
      </div>
    </div>


    {/* FILTER CARD */}

    <div
      style={{
        background:"#fff",
        border:"1px solid #e5e7eb",
        borderRadius:16,
        padding:16,
        marginBottom:20,
        display:"flex",
        gap:12,
        flexDirection:isMobile?"column":"row"
      }}
    >

      <input
        placeholder="Search user..."
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        style={{
          flex:1,
          padding:"12px 14px",
          borderRadius:12,
          border:"1px solid #e5e7eb",
          background:"#f8fafc",
          outline:"none"
        }}
      />


      <select
        value={requestType}
        onChange={(e)=>setRequestType(e.target.value)}
        style={{
          padding:"12px 14px",
          borderRadius:12,
          border:"1px solid #e5e7eb",
          background:"#fff",
          minWidth:isMobile?"100%":220
        }}
      >

        <option value="signup">
          Signup Requests
        </option>

        <option value="forgot">
          Forgot Password Requests
        </option>

      </select>

    </div>



{/* DESKTOP */}

{!isMobile && (

<div
style={{
background:"#fff",
borderRadius:16,
border:"1px solid #e5e7eb",
overflow:"hidden",
boxShadow:"0 4px 15px rgba(0,0,0,.05)"
}}
>


<table className="w-full">

<thead
style={{
background:"#f8fafc"
}}
>

<tr>

{
["NAME","EMAIL",
requestType==="signup"?"ROLE":"STATUS",
"REQUEST STATUS",
"ACTIONS"
].map(h=>

<th
key={h}
style={{
padding:16,
textAlign:"left",
fontSize:12,
color:"#6b7280",
fontWeight:700
}}
>
{h}
</th>

)}

</tr>

</thead>


<tbody>

{filteredUsers.map(user=>(

<tr
key={user.id}
style={{
borderTop:"1px solid #eef2f7"
}}
>


<td style={tdStyle}>
{user.name}
</td>


<td style={tdStyle}>
{user.email}
</td>


<td style={tdStyle}>
{
requestType==="signup"
?user.role
:user.temp_status || "Requested"
}
</td>


<td style={tdStyle}>

<span
style={
user.is_rejected
?statusRejected
:user.confirm
?statusApproved
:statusPending
}
>

{
user.is_rejected
?"Rejected"
:user.confirm
?"Approved"
:"Pending"
}

</span>

</td>



<td style={tdStyle}>

<div
style={{
display:"flex",
gap:8
}}
>

<button
onClick={()=>handleApprove(user)}
style={approveBtn}
>
Approve
</button>


<button
onClick={()=>handleToggleStatus(user,"cancel")}
style={cancelBtn}
>
Cancel
</button>


</div>

</td>


</tr>

))}


</tbody>

</table>


</div>

)}





{/* MOBILE */}

{isMobile && (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 12,
      padding: "4px 0"
    }}
  >

    {filteredUsers.map((user) => (

      <div
        key={user.id}
        style={{
          background:"#fff",
          border:"1px solid #e5e7eb",
          borderRadius:16,
          padding:14,
          boxShadow:"0 3px 10px rgba(0,0,0,0.04)"
        }}
      >

        {/* TOP SECTION */}
        <div
          style={{
            display:"flex",
            alignItems:"center",
            justifyContent:"space-between"
          }}
        >

          <div
            style={{
              display:"flex",
              alignItems:"center",
              gap:12
            }}
          >

            {/* Avatar */}
            <div
              style={{
                width:44,
                height:44,
                borderRadius:"50%",
                background:"#e0ecff",
                color:"#2563eb",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                fontWeight:700,
                fontSize:18
              }}
            >
              {user.name?.charAt(0)?.toUpperCase()}
            </div>


            <div>

              <h3
                style={{
                  margin:0,
                  fontSize:15,
                  fontWeight:700,
                  color:"#111827"
                }}
              >
                {user.name}
              </h3>

              <p
                style={{
                  margin:"3px 0 0",
                  fontSize:12,
                  color:"#6b7280",
                  maxWidth:180,
                  overflow:"hidden",
                  textOverflow:"ellipsis",
                  whiteSpace:"nowrap"
                }}
              >
                {user.email}
              </p>

            </div>

          </div>


          {/* Status */}
          <span
            style={
              user.is_rejected
              ? statusRejected
              : user.confirm
              ? statusApproved
              : statusPending
            }
          >
            {
              user.is_rejected
              ?"Rejected"
              :user.confirm
              ?"Approved"
              :"Pending"
            }
          </span>


        </div>


        {/* DETAILS */}
        <div
          style={{
            marginTop:14,
            padding:"12px",
            background:"#f8fafc",
            borderRadius:12
          }}
        >

          <div style={mobileRow}>
            <span style={{color:"#6b7280"}}>
              Role
            </span>

            <strong>
              {
                requestType==="signup"
                ?user.role
                :user.temp_status || "Requested"
              }
            </strong>
          </div>


          <div style={mobileRow}>
            <span style={{color:"#6b7280"}}>
              Email
            </span>

            <strong
              style={{
                maxWidth:160,
                overflow:"hidden",
                textOverflow:"ellipsis"
              }}
            >
              {user.email}
            </strong>
          </div>


        </div>


        {/* ACTION BUTTONS */}
        <div
          style={{
            display:"flex",
            gap:10,
            marginTop:14
          }}
        >

          <button
            onClick={()=>handleApprove(user)}
            style={{
              flex:1,
              padding:"10px",
              borderRadius:10,
              border:"1px solid #86efac",
              background:"#f0fdf4",
              color:"#15803d",
              fontWeight:600,
              fontSize:14
            }}
          >
            ✓ Approve
          </button>


          <button
            onClick={()=>handleToggleStatus(user,"cancel")}
            style={{
              flex:1,
              padding:"10px",
              borderRadius:10,
              border:"1px solid #fecaca",
              background:"#fef2f2",
              color:"#dc2626",
              fontWeight:600,
              fontSize:14
            }}
          >
            ✕ Cancel
          </button>


        </div>


      </div>

    ))}

  </div>
)}




{/* PASSWORD MODAL */}

{showModal && (

<div
style={modalOverlay}
>

<div
style={{
background:"#fff",
width:isMobile?"90%":400,
borderRadius:18,
padding:22,
boxShadow:"0 10px 30px rgba(0,0,0,.15)"
}}
>


<h3>
Generate Temporary Password
</h3>


<p style={{color:"#6b7280"}}>
{selectedUser?.email}
</p>


<input
value={tempPassword}
onChange={(e)=>setTempPassword(e.target.value)}
style={{
width:"100%",
padding:12,
borderRadius:10,
border:"1px solid #e5e7eb"
}}
/>


<div
style={{
display:"flex",
justifyContent:"space-between",
marginTop:20
}}
>


<button
onClick={generatePassword}
style={secondaryBtn}
>
Regenerate
</button>


<div style={{display:"flex",gap:10}}>


<button
onClick={()=>setShowModal(false)}
style={cancelBtn2}
>
Cancel
</button>


<button
onClick={handleConfirm}
style={approveBtn}
>
Confirm
</button>


</div>


</div>


</div>


</div>

)}


</div>
);

}

const tdStyle={
padding:16,
fontSize:14,
color:"#374151"
};


const statusApproved = {
  padding:"5px 10px",
  borderRadius:999,
  fontSize:11,
  fontWeight:700,
  color:"#15803d",
  background:"#dcfce7"
};


const statusRejected = {
  padding:"5px 10px",
  borderRadius:999,
  fontSize:11,
  fontWeight:700,
  color:"#dc2626",
  background:"#fee2e2"
};


const statusPending = {
  padding:"5px 10px",
  borderRadius:999,
  fontSize:11,
  fontWeight:700,
  color:"#ca8a04",
  background:"#fef9c3"
};

const approveBtn={
padding:"8px 14px",
borderRadius:10,
border:"1px solid #bbf7d0",
background:"#f0fdf4",
color:"#16a34a",
fontWeight:600,
cursor:"pointer"
};


const cancelBtn={
padding:"8px 14px",
borderRadius:10,
border:"1px solid #fecaca",
background:"#fef2f2",
color:"#dc2626",
fontWeight:600,
cursor:"pointer"
};


const mobileApprove={
border:"none",
background:"#ecfdf5",
color:"#16a34a",
padding:12,
borderRadius:12,
fontWeight:600
};


const mobileCancel={
border:"none",
background:"#fef2f2",
color:"#dc2626",
padding:12,
borderRadius:12,
fontWeight:600
};


const mobileRow = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  fontSize:13,
  padding:"6px 0"
};


const secondaryBtn={
background:"#eff6ff",
color:"#2563eb",
border:"none",
padding:"10px 14px",
borderRadius:10,
fontWeight:600
};


const cancelBtn2={
background:"#f3f4f6",
border:"none",
padding:"10px 14px",
borderRadius:10
};


const modalOverlay={
position:"fixed",
inset:0,
background:"rgba(0,0,0,.35)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:1000
};
