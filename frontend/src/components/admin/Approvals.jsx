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
          false,
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
        await confirmRequest(
          user.id,
          action === "cancel",
          user.email,
          activeUserEmail
        );
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
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* FILTER */}
      <div className="flex flex-wrap gap-3 mb-6">

        <input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded w-64"
        />

        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value)}
          className="p-2 border rounded w-64"
        >
          <option value="signup">Signup Requests</option>
          <option value="forgot">Forgot Password Requests</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-visible">
        <table className="w-full text-sm table-fixed">

          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="p-4 text-left">NAME</th>
              <th className="p-4 text-left">EMAIL</th>

              {requestType === "signup" ? (
                <th className="p-4 text-left">ROLE</th>
              ) : (
                <th className="p-4 text-left">STATUS</th>
              )}

              <th className="p-4 text-left">REQUEST STATUS</th>
              <th className="p-4 text-right">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">

                <td className="p-4">{user.name}</td>
                <td className="p-4">{user.email}</td>

                <td className="p-4">
                  {requestType === "signup"
                    ? user.role
                    : user.temp_status || "Requested"}
                </td>

                <td className="p-4">
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold
                    ${
                      user.confirm
                        ? "bg-green-50 text-green-600"
                        : "bg-yellow-50 text-yellow-600"
                    }`}
                  >
                    {user.confirm ? "Approved" : "Pending"}
                  </span>
                </td>

                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">

                    <button
                      onClick={() => handleApprove(user)}
                      className="px-3 py-1 text-green-600 border border-green-300 rounded hover:bg-green-50"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => handleToggleStatus(user, "cancel")}
                      className="px-3 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50"
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

      {/* MODAL (ONLY FOR FORGOT PASSWORD) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

          <div className="bg-white p-6 rounded-xl w-[400px]">

            <h2 className="text-lg font-bold mb-4">
              Generate Temporary Password
            </h2>

            <p className="text-sm mb-2 text-gray-500">
              User: {selectedUser?.email}
            </p>

            <input
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            />

            <div className="flex justify-between">

              <button
                onClick={generatePassword}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Regenerate
              </button>

              <div className="flex gap-2">

                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleConfirm}
                  className="px-3 py-1 bg-green-600 text-white rounded"
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