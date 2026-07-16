import { useState, useEffect } from "react";
import { fetchUsers, fetchRoles, toggleUserStatus, updateUserRole, updateUserPermissions, toggleUserPrfAccess } from "../../api/api";
import ValidatePopups from "../Validatepopups";

export default function UserList() {
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState("");
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPermissionChanged, setIsPermissionChanged] = useState(false);
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("success");
  const [isEditing, setIsEditing] = useState(false);
  const activeUser = JSON.parse(localStorage.getItem("user"));
  const activeUserEmail = activeUser?.email;
  // console.log("Active user from localStorage:", activeUser);
  // console.log("active user email:", activeUser?.email);
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  // 🔹 Fetch users
  useEffect(() => {
    const loadUsers = async () => {
      const res = await fetchUsers();

const usersWithPermissions = res.data.map((u) => ({
  ...u,
  permissions: {
    access: Number(u.access) === 1,
    add: Number(u.add) === 1,
    delete: Number(u.delete) === 1,
    export: Number(u.export) === 1,
    modify: Number(u.modify) === 1,
    print: Number(u.print) === 1,
  },
}));

      setUsers(usersWithPermissions);
    };

    loadUsers();
  }, []);

  // 🔹 Fetch roles
  useEffect(() => {
    const loadRoles = async () => {
      const res = await fetchRoles();
      setRoles(res.data);
    };
    loadRoles();
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleToggleStatus = async (user) => {
  await toggleUserStatus(user.id, !user.is_active);
  // Optionally, refresh users:
  const res = await fetchUsers();
  const usersWithPermissions = res.data.map((u) => ({
    ...u,
    permissions: {
      access: u.access,
      add: u.add,
      delete: u.delete,
      export: u.export,
      modify: u.modify,
      print: u.print,
    },
  }));
  setUsers(usersWithPermissions);
};

  const handleTogglePrfAccess = async (user) => {
  await toggleUserPrfAccess(user.id, !user.prf_access);
  // Optionally, refresh users:
  const res = await fetchUsers();
  const usersWithPermissions = res.data.map((u) => ({
    ...u,
    permissions: {
      access: u.access,
      add: u.add,
      delete: u.delete,
      export: u.export,
      modify: u.modify,
      print: u.print,
    },
  }));
  setUsers(usersWithPermissions);
};

useEffect(() => {
  if (selectedUser && selectedRole) {
    const roleObj = roles.find(r => r.role === selectedRole);

    if (roleObj && !isPermissionChanged) {
      // ✅ only auto-set if user hasn't edited manually
      setPermissions({
        access: roleObj.access,
        add: roleObj.add,
        delete: roleObj.delete,
        export: roleObj.export,
        modify: roleObj.modify,
        print: roleObj.print,
      });
    }
  }
}, [selectedRole]);

// To update role
const handleSave = async () => {
  const payload = {
    
    role: selectedRole,
    username: selectedUser.name,
    email: selectedUser.email,
    activeUserEmail: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).email : "SYSTEM",
  };
  console.log("Saving user with payload:", payload);
  if (isPermissionChanged) {
    payload.permissions = permissions;
  }

  // 1️⃣ Update role + permissions
  if (isPermissionChanged) {
    await updateUserPermissions(selectedUser.id, { permissions });
  } else {
    await updateUserRole(selectedUser.id, payload);
  }

  // 2️⃣ Update active status
  //await toggleUserStatus(selectedUser.id, isActive);

  // 3️⃣ Refresh users
  const res = await fetchUsers();
  const usersWithPermissions = res.data.map((u) => ({
    ...u,
    permissions: {
      access: u.access,
      add: u.add,
      delete: u.delete,
      export: u.export,
      modify: u.modify,
      print: u.print,
    },
  }));

  setUsers(usersWithPermissions);

  // 4️⃣ UI feedback
  setPopupMessage("User updated successfully!");
  setPopupType("success");
  setIsEditing(false);
  setSelectedUser(null);
};

  // 🔹 Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valA = a[sortConfig.key];
    let valB = b[sortConfig.key];

    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // 🔹 Filtering
  const filteredUsers = sortedUsers.filter((u) => {
    return (
      u.name.toLowerCase().includes(search.toLowerCase()) &&
      (roleFilter ? u.role === roleFilter : true) &&
      (statusFilter
        ? statusFilter === "active"
          ? u.is_active
          : !u.is_active
        : true)
    );
  });

  // 🔹 Edit
const handleEdit = (user) => {
  setSelectedUser(user);
  setPermissions(user.permissions);
  setSelectedRole(user.role);
  setIsActive(user.is_active);
  setIsPermissionChanged(false);
  setOpenMenu(null);

  if (isMobile) {
    setShowMobileDetails(true);
  }
};

const refreshUsers = async (selectedId = null) => {
  const res = await fetchUsers();

  const usersWithPermissions = res.data.map((u) => ({
    ...u,
    permissions: {
      access: Number(u.access) === 1,
      add: Number(u.add) === 1,
      delete: Number(u.delete) === 1,
      export: Number(u.export) === 1,
      modify: Number(u.modify) === 1,
      print: Number(u.print) === 1,
    },
  }));

  setUsers(usersWithPermissions);

  if (selectedId) {
    const updatedUser = usersWithPermissions.find(u => u.id === selectedId);

    if (updatedUser) {
      setSelectedUser(updatedUser);
      setPermissions(updatedUser.permissions); // 🔥 IMPORTANT
    }
  }
};

  // 🔹 Toggle permission
const togglePermission = (key) => {
  setPermissions((prev) => {
    const updated = {
      ...prev,
      [key]: !prev[key],
    };

    return updated;
  });

  setIsPermissionChanged(true);
};

const handleRoleSave = async () => {
  try {
    await updateUserRole(selectedUser.id, {
      role: selectedRole,
      username: selectedUser.name,
      email: selectedUser.email,
      activeUserEmail: activeUserEmail
    });

    setPopupMessage("Role updated successfully!");
    setPopupType("success");

  } catch (err) {
    setPopupMessage("Role update failed!");
    setPopupType("error");
  }
};

const handlePermissionSave = async () => {
  try {
    await updateUserPermissions(selectedUser.id, {
      role: selectedUser.role, // keep existing role
      username: selectedUser.name,
      email: selectedUser.email,
      activeUserEmail: activeUserEmail,
      permissions: permissions
    });

    setPopupMessage("Permissions updated!");
    setPopupType("success");

  } catch (err) {
    setPopupMessage("Permission update failed!");
    setPopupType("error");
  }
};

const renderDesktop = () => (
  <>
     <div
  style={{
    ...containerStyle,
    flexDirection: isMobile || isTablet ? "column" : "row",
  }}
>

      {/* ================= LEFT PANEL ================= */}
      <div
  style={{
    ...leftPanel,
    width: isMobile || isTablet ? "100%" : undefined,
    borderRight: isMobile || isTablet ? "none" : leftPanel.borderRight,
    borderBottom: "none",
    paddingRight: isMobile || isTablet ? 0 : 20,
    paddingBottom: isMobile || isTablet ? 20 : 0,
    height: isMobile || isTablet ? "auto" : "80vh",
    background: isMobile ? "#ffffff" : undefined,
    border: isMobile ? "1px solid #e6ebf2" : undefined,
    borderRadius: isMobile ? 16 : undefined,
    overflow: isMobile ? "hidden" : leftPanel.overflowY,
  }}
>

        {/* FILTER BAR */}
        <div
  style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "1fr 150px 150px",
    gap: 8,
    marginBottom: 12,
  }}
>
          <div style={isMobile ? mobileSearchWrap : {}}>
            {isMobile && <span style={mobileSearchIcon}>⌕</span>}
            <input
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={isMobile ? mobileSearchInput : inputStyle}
            />
          </div>

          {!isMobile && (
            <>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.role}>
                    {r.role}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </>
          )}
        </div>

        {/* USER LIST */}
        <ul
          style={
            isMobile
              ? { ...mobileListShell, listStyle: "none", padding: 0, margin: 0 }
              : { listStyle: "none", padding: 0, margin: 0 }
          }
        >
          {filteredUsers.map((user) => {
            const isSelected = selectedUser?.id === user.id;

            return (
              <li
                key={user.id}
                onClick={() => handleEdit(user)}
                style={
                  isMobile
                    ? {
                        ...mobileRow,
                        background: isSelected ? "#f0f6ff" : "#fff",
                      }
                    : {
                        ...userCard,
                        width: "100%",
                        background: isSelected ? "#eef2ff" : "#fff",
                        border: isSelected ? "1px solid #6366f1" : "1px solid #e5e7eb",
                      }
                }
              >
                {isMobile && isSelected && <span style={mobileSelectedBar} />}

                {/* LEFT */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                  <div style={isMobile ? mobileAvatar : avatar}>
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={isMobile ? mobileName : { fontWeight: 600 }}>
                      {user.name}
                    </div>
                    <div style={isMobile ? mobileMeta : { fontSize: 12, color: "#6b7280" }}>
                      {isMobile ? user.role : user.email}
                    </div>
                    {isMobile && (
                      <div
                        style={{
                          ...mobileMeta,
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: 180,
                        }}
                      >
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT STATUS */}
                <span style={user.is_active ? statusPillActive : statusPillInactive}>
                  {user.is_active ? "Active" : "Inactive"}
                </span>

              </li>
            );
          })}
        </ul>
      </div>

      {/* ================= RIGHT PANEL ================= */}
{!isMobile && (
<div
  style={{
    flex: 2,
    paddingLeft: isTablet ? 0 : 24,
    marginTop: isTablet ? 20 : 0,
  }}
>

  {/* HEADER */}
  <div
  style={{
    ...modernHeader,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
    gap: isMobile ? 12 : 0,
  }}
>
  <div>
    <h2 style={{ margin: 0 }}>User Permissions</h2>
    <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
      Manage user access and roles
    </p>
  </div>

  {!isEditing ? (
    <button
      onClick={() => setIsEditing(true)}
      style={btnPrimaryModern}
      disabled={!selectedUser}
    >
      Edit
    </button>
  ) : (
    <div style={{ display: "flex", gap: 10 }}>
      

      <button
        onClick={() => {
          // reset values
          setPermissions(selectedUser.permissions);
          setSelectedRole(selectedUser.role);
          setIsEditing(false);
        }}
        style={btnCancelModern}
      >
        Cancel
      </button>
    </div>
  )}
</div>

  {selectedUser ? (
    <>
      {/* ================= USER DETAILS ================= */}
      <div style={modernCard}>
       <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16
}}>
  <h4 style={{ ...cardTitle, margin: 0 }}>User Details</h4>

  {isEditing && (
    <button
      onClick={handleRoleSave}
      style={btnSaveModern}
    >
      Save Role
    </button>
  )}
</div>
        <div
  style={{
    ...modernGrid,
    gridTemplateColumns:
      isMobile ? "1fr" : "1fr 1fr",
  }}
>
          <div>
            <label style={label}>Username</label>
            <div style={value}>{selectedUser.name}</div>
          </div>

          <div>
            <label style={label}>Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={modernSelect}
              disabled={!isEditing}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
            
          </div>

          <div>
            <label style={label}>Email</label>
            <div style={value}>{selectedUser.email || "-"}</div>
          </div>

          <div>
            <label style={label}>Phone</label>
            <div style={value}>{selectedUser.phone_number || "-"}</div>
          </div>
        </div>
      </div>

      {/* ================= ACCESS CONTROL ================= */}
      <div style={modernCard}>
        <h4 style={cardTitle}>Access Control</h4>

        <div
  style={{
    ...controlRow,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    gap: isMobile ? 20 : 0,
  }}
>
          <div style={controlItem}>
            <span>Web Access</span>

            <label className="switch">
              <input
  type="checkbox"
  checked={selectedUser?.is_active || false}
  onChange={async () => {
  const newStatus = !selectedUser.is_active;

  setSelectedUser((prev) => ({
    ...prev,
    is_active: newStatus
  }));

  try {
    await toggleUserStatus(
      selectedUser.id,
      newStatus,
      selectedUser.email,
      activeUserEmail
    );

    await refreshUsers(selectedUser.id); // ✅ CLEAN

    setPopupMessage(`User ${newStatus ? "activated" : "deactivated"}`);
    setPopupType("success");

  } catch (err) {
    // rollback
    setSelectedUser((prev) => ({
      ...prev,
      is_active: !newStatus
    }));

    setPopupMessage("Failed to update status");
    setPopupType("error");
  }
}}
  disabled={!isEditing}
/>
              <span className="slider"></span>
            </label>
          </div>

          <div style={controlItem}>
            <span>PRF Access</span>
           <label className="switch">
              <input
  type="checkbox"
  checked={selectedUser?.prf_access || false}
  onChange={async () => {
  const newStatus = !selectedUser.prf_access;

  setSelectedUser((prev) => ({
    ...prev,
    prf_access: newStatus
  }));

  try {
    await toggleUserPrfAccess(
      selectedUser.id,
      newStatus,
      selectedUser.email,
      activeUserEmail
    );

    await refreshUsers(selectedUser.id); // ✅ CLEAN

    setPopupMessage(`User ${newStatus ? "activated" : "deactivated"}`);
    setPopupType("success");

  } catch (err) {
    // rollback
    setSelectedUser((prev) => ({
      ...prev,
      prf_access: !newStatus
    }));

    setPopupMessage("Failed to update status");
    setPopupType("error");
  }
}}
  disabled={!isEditing}
/>
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* ================= ACCESS RIGHTS ================= */}
      <div style={modernCard}>
       <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16
}}>
  <h4 style={{ ...cardTitle, margin: 0 }}>Access Rights</h4>

  {isEditing && (
    <button
      onClick={handlePermissionSave}
      style={btnSaveModern}
    >
      Save Permissions
    </button>
  )}
</div>
        <div
  style={{
    ...permissionGridModern,
    gridTemplateColumns: isMobile
      ? "repeat(2,1fr)"
      : isTablet
      ? "repeat(2,1fr)"
      : "repeat(3,1fr)",
  }}
>
          {["print", "add", "modify", "delete", "export", "access"].map((key) => (
            <div key={key} style={permissionBox}>
              <span style={{ textTransform: "capitalize" }}>{key}</span>

              <input
                type="checkbox"
                checked={permissions[key]}
                onChange={() => togglePermission(key)}
                disabled={!isEditing}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  ) : (
    <div style={{ color: "#9ca3af" }}>Select User</div>
  )}
</div>
)}
    </div>

    {/* ================= PERMISSION MODAL ================= */}
    {menuModalOpen && selectedUser && (
      <div style={modalOverlay}>
        <div style={modalBox}>

          <h3>Access Rights</h3>

          {Object.keys(permissions).map((key) => (
            <div key={key} style={row}>
              <span>{key}</span>
              <input
                type="checkbox"
                checked={permissions[key]}
                onChange={() =>
                  setPermissions((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
              />
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setMenuModalOpen(false)} style={btnCancel}>
              Cancel
            </button>

            <button onClick={handleSave} style={btnSave}>
              Save
            </button>
          </div>

        </div>
      </div>
    )}

  </>
);

const renderMobile = () => (
  <div
  style={{
    width: "100%",
    minHeight: "100vh",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    margin: 0,
  }}
>

    {/* Search */}
    <div
  style={{
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
  }}
>
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#9ca3af",
            fontSize: 18,
          }}
        >
          🔍
        </span>

        <input
          placeholder="Search user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            borderRadius: 25,
            border: "1px solid #e5e7eb",
            background: "#f8fafc",
            outline: "none",
            fontSize: 15,
          }}
        />
      </div>

     <div
  style={{
    display: "flex",
    gap: 10,
    marginTop: 12,
  }}
>
  {/* Role */}
  <select
    value={roleFilter}
    onChange={(e) => setRoleFilter(e.target.value)}
    style={{
      flex: 1,
      padding: 12,
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#fff",
    }}
  >
    <option value="">All Roles</option>

    {roles.map((r) => (
      <option key={r.id} value={r.role}>
        {r.role}
      </option>
    ))}
  </select>

  {/* Status */}
  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    style={{
      flex: 1,
      padding: 12,
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#fff",
    }}
  >
    <option value="">All Status</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
</div>
    </div>

    {/* User List */}
    <div style={{ flex: 1 }}>
      {filteredUsers.map((user) => {
        const active = selectedUser?.id === user.id;

        return (
          <div
            key={user.id}
            onClick={() => handleEdit(user)}
            style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    borderBottom: "1px solid #ececec",
    cursor: "pointer",
    background: active ? "#eef4ff" : "#fff",
    width: "100%",
    boxSizing: "border-box",
  }}
          >
            {/* Left */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#2563eb",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {user.name?.charAt(0)?.toUpperCase()}
              </div>

              {/* Name */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                  }}
                >
                  {user.name}
                </div>

                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 13,
                  }}
                >
                  {user.role}
                </div>

                <div
                  style={{
                    color: "#9ca3af",
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </div>
              </div>
            </div>

            {/* Right */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
                marginLeft: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: user.is_active ? "#16a34a" : "#dc2626",
                }}
              >
                {user.is_active ? "Active" : "Inactive"}
              </span>

              <span
                style={{
                  color: "#9ca3af",
                  fontSize: 18,
                }}
              >
                ›
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

return (
  <>
    <ValidatePopups
      type={popupType}
      message={popupMessage}
      onClose={() => {
        setPopupMessage("");
        setPopupType("success");
      }}
    />

    {isMobile ? renderMobile() : renderDesktop()}

    {/* Permission Modal */}
    {menuModalOpen && selectedUser && (
      <div style={modalOverlay}>
       {menuModalOpen && selectedUser && (
      <div style={modalOverlay}>
        <div style={modalBox}>

          <h3>Access Rights</h3>

          {Object.keys(permissions).map((key) => (
            <div key={key} style={row}>
              <span>{key}</span>
              <input
                type="checkbox"
                checked={permissions[key]}
                onChange={() =>
                  setPermissions((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
              />
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => setMenuModalOpen(false)} style={btnCancel}>
              Cancel
            </button>

            <button onClick={handleSave} style={btnSave}>
              Save
            </button>
          </div>

        </div>
      </div>
    )}
      </div>
    )}

    {/* Mobile Details Modal */}
    {isMobile && showMobileDetails && selectedUser && (
      <div style={modalOverlay}>
        {isMobile && showMobileDetails && selectedUser && (
<div style={modalOverlay}>
    <div
        style={{
            background: "#fff",
            width: "95%",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: 16,
            padding: 20,
        }}
    >
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20,
            }}
        >
            <h2>User Details</h2>

            <button
                onClick={() => setShowMobileDetails(false)}
                style={{
                    border: "none",
                    background: "transparent",
                    fontSize: 24,
                    cursor: "pointer",
                }}
            >
                ✕
            </button>
        </div>

      <div
  style={{
    flex: 2,
    paddingLeft: isTablet ? 0 : 24,
    marginTop: isTablet ? 20 : 0,
  }}
>

  {/* HEADER */}
  <div
  style={{
    ...modernHeader,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
    gap: isMobile ? 12 : 0,
  }}
>
  <div>
    <h2 style={{ margin: 0 }}>User Permissions</h2>
    <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
      Manage user access and roles
    </p>
  </div>

  {!isEditing ? (
    <button
      onClick={() => setIsEditing(true)}
      style={btnPrimaryModern}
      disabled={!selectedUser}
    >
      Edit
    </button>
  ) : (
    <div style={{ display: "flex", gap: 10 }}>
      

      <button
        onClick={() => {
          // reset values
          setPermissions(selectedUser.permissions);
          setSelectedRole(selectedUser.role);
          setIsEditing(false);
        }}
        style={btnCancelModern}
      >
        Cancel
      </button>
    </div>
  )}
</div>

  {selectedUser ? (
    <>
      {/* ================= USER DETAILS ================= */}
      <div style={modernCard}>
       <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16
}}>
  <h4 style={{ ...cardTitle, margin: 0 }}>User Details</h4>

  {isEditing && (
    <button
      onClick={handleRoleSave}
      style={btnSaveModern}
    >
      Save Role
    </button>
  )}
</div>
        <div
  style={{
    ...modernGrid,
    gridTemplateColumns:
      isMobile ? "1fr" : "1fr 1fr",
  }}
>
          <div>
            <label style={label}>Username</label>
            <div style={value}>{selectedUser.name}</div>
          </div>

          <div>
            <label style={label}>Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={modernSelect}
              disabled={!isEditing}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
            
          </div>

          <div>
            <label style={label}>Email</label>
            <div style={value}>{selectedUser.email || "-"}</div>
          </div>

          <div>
            <label style={label}>Phone</label>
            <div style={value}>{selectedUser.phone_number || "-"}</div>
          </div>
        </div>
      </div>

      {/* ================= ACCESS CONTROL ================= */}
      <div style={modernCard}>
        <h4 style={cardTitle}>Access Control</h4>

        <div
  style={{
    ...controlRow,
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "flex-start" : "center",
    gap: isMobile ? 20 : 0,
  }}
>
          <div style={controlItem}>
            <span>Web Access</span>

            <label className="switch">
              <input
  type="checkbox"
  checked={selectedUser?.is_active || false}
  onChange={async () => {
  const newStatus = !selectedUser.is_active;

  setSelectedUser((prev) => ({
    ...prev,
    is_active: newStatus
  }));

  try {
    await toggleUserStatus(
      selectedUser.id,
      newStatus,
      selectedUser.email,
      activeUserEmail
    );

    await refreshUsers(selectedUser.id); // ✅ CLEAN

    setPopupMessage(`User ${newStatus ? "activated" : "deactivated"}`);
    setPopupType("success");

  } catch (err) {
    // rollback
    setSelectedUser((prev) => ({
      ...prev,
      is_active: !newStatus
    }));

    setPopupMessage("Failed to update status");
    setPopupType("error");
  }
}}
  disabled={!isEditing}
/>
              <span className="slider"></span>
            </label>
          </div>

          <div style={controlItem}>
            <span>PRF Access</span>
           <label className="switch">
              <input
  type="checkbox"
  checked={selectedUser?.prf_access || false}
  onChange={async () => {
  const newStatus = !selectedUser.prf_access;

  setSelectedUser((prev) => ({
    ...prev,
    prf_access: newStatus
  }));

  try {
    await toggleUserPrfAccess(
      selectedUser.id,
      newStatus,
      selectedUser.email,
      activeUserEmail
    );

    await refreshUsers(selectedUser.id); // ✅ CLEAN

    setPopupMessage(`User ${newStatus ? "activated" : "deactivated"}`);
    setPopupType("success");

  } catch (err) {
    // rollback
    setSelectedUser((prev) => ({
      ...prev,
      prf_access: !newStatus
    }));

    setPopupMessage("Failed to update status");
    setPopupType("error");
  }
}}
  disabled={!isEditing}
/>
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* ================= ACCESS RIGHTS ================= */}
      <div style={modernCard}>
       <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 16
}}>
  <h4 style={{ ...cardTitle, margin: 0 }}>Access Rights</h4>

  {isEditing && (
    <button
      onClick={handlePermissionSave}
      style={btnSaveModern}
    >
      Save Permissions
    </button>
  )}
</div>
        <div
  style={{
    ...permissionGridModern,
    gridTemplateColumns: isMobile
      ? "repeat(2,1fr)"
      : isTablet
      ? "repeat(2,1fr)"
      : "repeat(3,1fr)",
  }}
>
          {["print", "add", "modify", "delete", "export", "access"].map((key) => (
            <div key={key} style={permissionBox}>
              <span style={{ textTransform: "capitalize" }}>{key}</span>

              <input
                type="checkbox"
                checked={permissions[key]}
                onChange={() => togglePermission(key)}
                disabled={!isEditing}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  ) : (
    <div style={{ color: "#9ca3af" }}>Select User</div>
  )}
</div>

    </div>
</div>
)}
      </div>
    )}
  </>
);
}

const infoCard = {
  background: '#f9fafb',
  padding: 16,
  borderRadius: 8,
  marginBottom: 20
};

const inputStyle = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
};

const selectStyle = {
  minWidth: 120,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
};

const selectFull = {
  width: "100%",
  padding: "8px",
  borderRadius: 6,
  border: "1px solid #ddd",
};

const userCard = {
  padding: "12px 14px",
  marginBottom: 10,
  borderRadius: 12,
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  transition: "0.2s",
};

const avatar = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  background: "#6366f1",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
};

const containerStyle = {
  display: "flex",
  gap: 24,
  background: "#fff",
  padding: 24,
  borderRadius: 10,
};

const leftPanel = {
  flex: 1.5,
  borderRight: "1px solid #eee",
  paddingRight: 10,
  height: "80vh",
  overflowY: "auto",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const card = {
  background: "#f9fafb",
  padding: 16,
  borderRadius: 8,
  marginTop: 10,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
};

const btnPrimary = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};

const btnSuccess = {
  padding: "8px 14px",
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};

const btnDanger = {
  padding: "8px 14px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};

const btnSave = {
  padding: "8px 14px",
  background: "#22c55e",
  color: "#fff",
  borderRadius: 6,
  border: "none",
};

const btnCancel = {
  padding: "8px 14px",
  background: "#e5e7eb",
  borderRadius: 6,
  border: "none",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalBox = {
  width: 400,
  background: "#fff",
  padding: 20,
  borderRadius: 10,
};

const modernHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
};

const modernCard = {
  background: "#ffffff",
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  border: "1px solid #f1f5f9",
};

const cardTitle = {
  marginBottom: 16,
  fontWeight: 600,
};

const modernGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 20,
};

const label = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 4,
};

const value = {
  fontWeight: 500,
};

const modernSelect = {
  width: "100%",
  padding: "10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const controlRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const controlItem = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const permissionGridModern = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
};

const permissionBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  background: "#f9fafb",
  borderRadius: 10,
  border: "1px solid #eef2f7",
};

const btnPrimaryModern = {
  background: "#2563eb",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  fontWeight: 500,
  cursor: "pointer",
};

const btnSecondary = {
  background: "#eef2ff",
  color: "#2563eb",
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const btnSaveModern = {
  background: "#22c55e",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  fontWeight: 500,
  cursor: "pointer",
};

const btnCancelModern = {
  background: "#f3f4f6",
  color: "#374151",
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
};

const mobileSearchWrap = {
  position: "relative",
};

const mobileSearchIcon = {
  position: "absolute",
  left: 12,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#9ca3af",
  fontSize: 18,
  pointerEvents: "none",
};

const mobileSearchInput = {
  width: "100%",
  padding: "11px 12px 11px 36px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  outline: "none",
};

const mobileListShell = {
  background: "#fff",
  border: "1px solid #e6ebf2",
  borderRadius: 16,
  overflow: "hidden",
};

const mobileRow = {
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  minHeight: 74,
  cursor: "pointer",
  borderBottom: "1px solid #eef2f7",
  transition: "background 0.2s ease",
};

const mobileSelectedBar = {
  position: "absolute",
  left: 0,
  top: 12,
  bottom: 12,
  width: 4,
  borderRadius: 6,
  background: "#2563eb",
};

const mobileAvatar = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "#dbe7ff",
  color: "#234b9b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  flexShrink: 0,
};

const mobileName = {
  fontSize: 16,
  fontWeight: 600,
  color: "#1f2937",
  lineHeight: 1.15,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 170,
};

const mobileMeta = {
  fontSize: 12,
  color: "#6b7280",
};

const statusPillActive = {
  fontSize: 11,
  fontWeight: 700,
  color: "#15803d",
  background: "#e8f8ee",
  border: "1px solid #bbf7d0",
  borderRadius: 999,
  padding: "5px 10px",
  whiteSpace: "nowrap",
};

const statusPillInactive = {
  fontSize: 11,
  fontWeight: 700,
  color: "#b91c1c",
  background: "#feecec",
  border: "1px solid #fecaca",
  borderRadius: 999,
  padding: "5px 10px",
  whiteSpace: "nowrap",
};