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

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
    <div className="p-6 bg-gray-100 min-h-screen">
       <ValidatePopups
  type={popupType}
  message={popupMessage}
  onClose={() => setPopupMessage("")}
/>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Role Management</h1>

        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Role
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
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

                <td className="p-4 font-medium">{r.role}</td>

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

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">

          <div className="bg-white p-6 rounded-xl w-[500px]">

            <h2 className="text-lg font-bold mb-4">
              {editMode ? "Edit Role" : "Create Role"}
            </h2>

            {/* Role Name */}
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Role Name"
              className="w-full p-2 border rounded mb-4"
              disabled={editMode} // Disable editing role name in edit mode
            />

            {/* Permissions */}
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(permissions).map((key) => (
                <div
                  key={key}
                  className="flex justify-between items-center bg-gray-50 p-2 rounded"
                >
                  <span className="capitalize">{key}</span>

                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={() => togglePermission(key)}
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-5">

              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded"
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