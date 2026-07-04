import { useState, useEffect } from "react";
import { fetchUsers, fetchRoles, toggleUserStatus, updateUserRole } from "../../api/api";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [selectedRole, setSelectedRole] = useState("");

  const [openMenu, setOpenMenu] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isPermissionChanged, setIsPermissionChanged] = useState(false);

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

useEffect(() => {
  if (selectedUser && selectedRole) {
    // Find the role object for the selectedRole
    const roleObj = roles.find(r => r.role === selectedRole);
    if (roleObj) {
      // Set permissions to the default for that role
      setPermissions({
        access: roleObj.access,
        add: roleObj.add,
        delete: roleObj.delete,
        export: roleObj.export,
        modify: roleObj.modify,
        print: roleObj.print,
      });
      setIsPermissionChanged(true); // Mark as changed so it will be sent on save
    }
  }
  // eslint-disable-next-line
}, [selectedRole]);

// To update role
const handleSave = async () => {
  const payload = {
    role: selectedRole,
    username: selectedUser.name,
  };

  // 👇 only include permissions if edited
  if (isPermissionChanged) {
    payload.permissions = permissions;
  }

  await updateUserRole(selectedUser.id, payload);

  setUsers((prev) =>
    prev.map((u) =>
      u.id === selectedUser.id
        ? {
            ...u,
            role: selectedRole,
            ...(isPermissionChanged && { permissions }),
          }
        : u
    )
  );

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
  setIsPermissionChanged(false); // reset here
  setOpenMenu(null);
};



  // 🔹 Toggle permission
  const togglePermission = (key) => {
  setPermissions((prev) => ({
    ...prev,
    [key]: !prev[key],
  }));

  setIsPermissionChanged(true);
};




  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* 🔷 FILTER BAR */}
      <div className="flex flex-wrap gap-3 mb-6">

        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded w-64"
        />

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.role}>
              {r.role}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* 🔷 TABLE */}
      <div className="bg-white rounded-xl shadow overflow-visible">
        <table className="w-full text-sm table-fixed">

  {/* HEADER */}
  <thead className="bg-gray-50 text-gray-500">
    <tr>

      <th
        className="p-4 text-left cursor-pointer"
        onClick={() => handleSort("name")}
      >
        NAME
      </th>

      <th
        className="p-4 text-left cursor-pointer"
        onClick={() => handleSort("email")}
      >
        EMAIL
      </th>

      <th
        className="p-4 text-left cursor-pointer"
        onClick={() => handleSort("phone_number")}
      >
        PHONE
      </th>

      <th
        className="p-4 text-left cursor-pointer"
        onClick={() => handleSort("role")}
      >
        ROLE
      </th>

      <th
        className="p-4 text-left cursor-pointer"
        onClick={() => handleSort("is_active")}
      >
        STATUS
      </th>

      {/* ACTIONS RIGHT ALIGNED */}
      <th className="p-4 text-right">
        ACTIONS
      </th>

    </tr>
  </thead>

  {/* BODY */}
  <tbody>
    {filteredUsers.map((user) => (
      <tr key={user.id} className="border-t hover:bg-gray-50 transition">

        {/* NAME */}
        <td className="p-4 text-left text-gray-700">
          {user.name}
        </td>

        {/* EMAIL */}
        <td className="p-4 text-left text-gray-700">
          {user.email}
        </td>

        {/* PHONE */}
        <td className="p-4 text-left text-gray-700">
          {user.phone_number}
        </td>

        {/* ROLE */}
        <td className="p-4 text-left">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
            {user.role}
          </span>
        </td>

        {/* STATUS */}
        <td className="p-4 text-left">
          <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full
            ${user.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}
          `}>
            <span className={`h-2 w-2 rounded-full
              ${user.is_active ? "bg-green-500" : "bg-red-400"}`} />
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </td>

        {/* ACTIONS RIGHT ALIGNED */}
        <td className="p-4 text-right">
          <div className="flex justify-end items-center gap-3">

            <button
              onClick={() => handleEdit(user)}
              className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-md
                         hover:bg-gray-100 transition"
            >
              Edit
            </button>

            <button
              onClick={() => handleToggleStatus(user)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md border transition
                ${
                  user.is_active
                    ? "border-red-300 text-red-600 hover:bg-red-50"
                    : "border-green-300 text-green-600 hover:bg-green-50"
                }`}
            >
              {user.is_active ? "Deactivate" : "Activate"}
            </button>

          </div>
        </td>

      </tr>
    ))}
  </tbody>

</table>
      </div>

      {/* 🔷 EDIT MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">

          <div className="bg-white p-6 rounded-xl w-[500px]">

            <h2 className="text-lg font-bold mb-4">
              Edit User - {selectedUser.name}
            </h2>

            {/* Role Edit */}
            <div className="mb-4">
              <label className="block text-sm mb-1">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.role}>
                    {r.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions */}
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(permissions).map((key) => (
                <div key={key} className="flex justify-between bg-gray-50 p-2 rounded">
                  <span>{key}</span>
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={() => togglePermission(key)}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}