import { useEffect, useState } from "react";
import { fetchRoles, createRole, updateRole } from "../../api/api";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useUser } from "../../components/UserContext";
import ValidatePopups from "../Validatepopups";
import { act } from "react";

const defaultPermissions = {
  add: false,
  modify: false,
  delete: false,
  print: false,
  export: false,
  access: true,
};

export default function RoleAccess() {
  const [roles, setRoles] = useState([]);
  const [expandedRole, setExpandedRole] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const { user } = useUser();
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("");
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
  
  // 🔹 Load roles
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    const res = await fetchRoles();
    setRoles(res.data);
  };

  // 🔹 Toggle permission
  const togglePermission = (key) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 🔹 Open Create Modal
  const handleCreate = () => {
    setEditMode(false);
    setRoleName("");
    setPermissions(defaultPermissions);
    setSelectedRoleId(null);
    setModalOpen(true);
  };

  // 🔹 Open Edit Modal
  const handleEdit = (role) => {
    setEditMode(true);
    setRoleName(role.role);
    setPermissions({
      add: role.add,
      modify: role.modify,
      delete: role.delete,
      print: role.print,
      export: role.export,
      access: role.access,
    });
    setSelectedRoleId(role.id);
    setModalOpen(true);
  };

  // 🔹 Save Role
 const handleSave = async () => {
  const payload = {
    id: selectedRoleId,
    role: roleName,
    email: user?.email,
    activeUserEmail: activeUserEmail,
    ...permissions,
  };

  try {
    if (editMode) {
      await updateRole(selectedRoleId, payload);
    } else {
      await createRole(payload);
    }

    setPopupMessage(`Role ${editMode ? "updated" : "created"} successfully!`);
    setPopupType("success");

    setModalOpen(false);
    loadRoles();

  } catch (err) {
    setPopupMessage("Something went wrong");
    setPopupType("error");
  }
};

 const renderPermission = (value) => (
  <span className="flex items-center justify-start">
    {value ? (
      <FaCheckCircle className="text-green-500 text-lg" />
    ) : (
      <FaTimesCircle className="text-red-500 text-lg" />
    )}
  </span>
);

 return (
  <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">

    <ValidatePopups
      type={popupType}
      message={popupMessage}
      onClose={() => setPopupMessage("")}
    />

    {/* Header */}
<div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center mb-6">

  <div>
    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
      Role Management
    </h1>

    <p className="text-sm text-gray-500 mt-1">
      Manage roles and permissions
    </p>
  </div>


  <button
    onClick={handleCreate}
    className="
      w-full sm:w-auto
      px-5 py-2.5
      rounded-xl
      border border-blue-200
      bg-blue-50
      text-blue-600
      font-semibold
      hover:bg-blue-100
    "
  >
    ＋ Create Role
  </button>

</div>






    {/* Table */}
   {/* Desktop Table */}
<div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">

  <table className="w-full text-sm">

    <thead className="bg-gray-50 text-gray-500">
      <tr>
        <th className="p-4 text-left">ROLE</th>
        <th className="text-left">ACCESS</th>
        <th className="text-left">ADD</th>
        <th className="text-left">MODIFY</th>
        <th className="text-left">DELETE</th>
        <th className="text-left">PRINT</th>
        <th className="text-left">EXPORT</th>
        <th className="text-right p-4">ACTION</th>
      </tr>
    </thead>

    <tbody>
      {roles.map((r) => (
        <tr key={r.id} className="border-t hover:bg-gray-50">

          <td className="p-4 font-medium">
            {r.role}
          </td>

          <td>{renderPermission(r.access)}</td>
          <td>{renderPermission(r.add)}</td>
          <td>{renderPermission(r.modify)}</td>
          <td>{renderPermission(r.delete)}</td>
          <td>{renderPermission(r.print)}</td>
          <td>{renderPermission(r.export)}</td>

          <td className="text-right p-4">
            <button
              onClick={() => handleEdit(r)}
              className="px-3 py-1 border rounded hover:bg-gray-100"
            >
              Edit
            </button>
          </td>

        </tr>
      ))}
    </tbody>

  </table>

</div>


{/* Mobile Role Cards */}
{/* MOBILE DRAWER STYLE */}
<div className="md:hidden">

  {roles.map((r)=>(

    <div
      key={r.id}
      style={{
        marginBottom:12,
        background:"#fff",
        border:"1px solid #e5e7eb",
        borderRadius:16,
        overflow:"hidden"
      }}
    >

      {/* ROLE HEADER */}
      <div
        onClick={() =>
          setExpandedRole(
            expandedRole === r.id ? null : r.id
          )
        }
        style={{
          padding:"16px",
          display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          cursor:"pointer"
        }}
      >

        <div
          style={{
            display:"flex",
            alignItems:"center",
            gap:12
          }}
        >

          {/* ICON */}
          <div
            style={{
              width:46,
              height:46,
              borderRadius:"50%",
              background:"#eff6ff",
              color:"#2563eb",
              display:"flex",
              justifyContent:"center",
              alignItems:"center",
              fontWeight:700,
              fontSize:18
            }}
          >
            {r.role?.charAt(0)?.toUpperCase()}
          </div>


          <div>

            <h3
              style={{
                margin:0,
                fontSize:16,
                fontWeight:700
              }}
            >
              {r.role}
            </h3>


            <p
              style={{
                margin:"3px 0 0",
                color:"#6b7280",
                fontSize:12
              }}
            >
              Tap to manage permissions
            </p>

          </div>


        </div>


        <div
          style={{
            width:32,
            height:32,
            borderRadius:"50%",
            background:"#f8fafc",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            color:"#64748b",
            fontSize:20
          }}
        >
          {expandedRole === r.id ? "−" : "+"}
        </div>


      </div>



      {/* DRAWER CONTENT */}
      {expandedRole === r.id && (

        <div
          style={{
            borderTop:"1px solid #e5e7eb",
            background:"#f8fafc",
            padding:16
          }}
        >


          <div
            style={{
              background:"#fff",
              borderRadius:14,
              padding:12,
              marginBottom:14
            }}
          >

            <h4
              style={{
                margin:"0 0 12px",
                fontSize:14,
                fontWeight:700,
                color:"#374151"
              }}
            >
              Permissions
            </h4>



            {[
              ["Access",r.access],
              ["Add",r.add],
              ["Modify",r.modify],
              ["Delete",r.delete],
              ["Print",r.print],
              ["Export",r.export]
            ].map(([name,value])=>(


              <div
                key={name}
                style={{
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  padding:"10px 0",
                  borderBottom:"1px solid #f1f5f9"
                }}
              >

                <span
                  style={{
                    color:"#475569",
                    fontSize:14
                  }}
                >
                  {name}
                </span>


                <span
                  style={{
                    padding:"4px 12px",
                    borderRadius:999,
                    fontSize:12,
                    fontWeight:600,
                    background:value
                    ?"#ecfdf5"
                    :"#fef2f2",
                    color:value
                    ?"#16a34a"
                    :"#dc2626"
                  }}
                >
                  {value ? "Yes":"No"}
                </span>


              </div>


            ))}


          </div>



          {/* ACTION AREA */}
          <button
            onClick={()=>handleEdit(r)}
            style={{
              width:"100%",
              padding:"12px",
              borderRadius:12,
              border:"1px solid #bfdbfe",
              background:"#eff6ff",
              color:"#2563eb",
              fontWeight:600,
              fontSize:14
            }}
          >
            Edit Role
          </button>


        </div>

      )}


    </div>

  ))}

</div>





  {/* MODAL - MOBILE DRAWER STYLE */}
{modalOpen && (

<div
style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,.35)",
zIndex:50,
display:"flex",
alignItems:isMobile ? "flex-end" : "center",
justifyContent:"center"
}}
>


<div
style={{
background:"#fff",
width:isMobile ? "100%" : "500px",
maxHeight:isMobile ? "90vh" : "85vh",
borderRadius:isMobile ? "24px 24px 0 0" : "18px",
padding:isMobile ? 20 : 28,
overflowY:"auto",
boxShadow:"0 10px 30px rgba(0,0,0,.15)"
}}
>


{/* MOBILE HANDLE */}

{isMobile && (

<div
style={{
width:45,
height:5,
background:"#d1d5db",
borderRadius:20,
margin:"0 auto 18px"
}}
/>

)}



{/* HEADER */}

<div
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}}
>

<div>

<h2
style={{
margin:0,
fontSize:isMobile ? 20 : 22,
fontWeight:700,
color:"#111827"
}}
>
{editMode ? "Edit Role" : "Create Role"}
</h2>


<p
style={{
margin:"5px 0 0",
fontSize:13,
color:"#6b7280"
}}
>
Manage role permissions
</p>

</div>



<button
onClick={()=>setModalOpen(false)}
style={{
width:34,
height:34,
borderRadius:"50%",
border:"none",
background:"#f3f4f6",
color:"#6b7280",
fontSize:18,
cursor:"pointer"
}}
>
✕
</button>


</div>





{/* ROLE NAME */}

<label
style={{
fontSize:12,
fontWeight:600,
color:"#6b7280"
}}
>
Role Name
</label>


<input
value={roleName}
onChange={(e)=>setRoleName(e.target.value)}
placeholder="Enter role name"
disabled={editMode}
style={{
width:"100%",
marginTop:6,
padding:"12px",
borderRadius:12,
border:"1px solid #e5e7eb",
outline:"none",
fontSize:14,
background:editMode?"#f3f4f6":"#fff"
}}
/>





{/* PERMISSIONS */}

<h4
style={{
margin:"22px 0 12px",
fontSize:15,
fontWeight:700
}}
>
Permissions
</h4>



<div
style={{
display:"grid",
gridTemplateColumns:isMobile 
? "1fr"
: "1fr 1fr",
gap:12
}}
>


{Object.keys(permissions).map((key)=>(


<div
key={key}
style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
padding:"13px 14px",
background:"#f8fafc",
borderRadius:12,
border:"1px solid #eef2f7"
}}
>


<span
style={{
textTransform:"capitalize",
fontSize:14,
fontWeight:500,
color:"#374151"
}}
>
{key}
</span>



<input
type="checkbox"
checked={permissions[key]}
onChange={()=>togglePermission(key)}
style={{
width:18,
height:18,
accentColor:"#2563eb"
}}
/>



</div>


))}


</div>






{/* ACTION BUTTONS */}

<div
style={{
display:"flex",
flexDirection:isMobile ? "row":"row",
gap:12,
marginTop:24
}}
>


<button
onClick={()=>setModalOpen(false)}
style={{
flex:1,
padding:"12px",
borderRadius:12,
border:"1px solid #e5e7eb",
background:"#fff",
color:"#374151",
fontWeight:600
}}
>
Cancel
</button>



<button
onClick={handleSave}
style={{
flex:1,
padding:"12px",
borderRadius:12,
border:"none",
background:"#2563eb",
color:"#fff",
fontWeight:600
}}
>
{editMode ? "Update" : "Create"}
</button>


</div>



</div>


</div>

)}



  </div>
);
}