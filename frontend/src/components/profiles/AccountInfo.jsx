import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getUserbyemail, changePassword, updateUserProfile } from "../../api/api";
import { validatePasswordForm } from "../../utils/validatePasswordForm";
import ValidatePopups from "../Validatepopups"; // <-- Import

const AccountInfo = () => {
  const localUser = JSON.parse(localStorage.getItem("user"));
  const email = localUser?.email;

  // User details state
  const [user, setUser] = useState(null);

  // Password form state
  const [form, setForm] = useState({
    oldPassword: "",
    password: "",
    confirmPassword: ""
  });
  const [show, setShow] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Popup states
  const [detailsPopup, setDetailsPopup] = useState({ type: "", message: "" });
  const [passwordPopup, setPasswordPopup] = useState({ type: "", message: "" });

  // Fetch user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!email) return;
        const res = await getUserbyemail(email);
        setUser(res?.data?.[0] || res?.data);
      } catch (err) {
        // handle error
      }
    };
    fetchUser();
  }, [email]);

  // Handle details change
  const handleDetailsChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  // Password input change
  const handlePwdChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Show/hide password
  const toggle = (key) => {
    setShow((p) => ({ ...p, [key]: !p[key] }));
  };

  // Password strength
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };
  const strength = getStrength(form.password);

  // Save details
  const handleDetailsSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile(email, user);
      setDetailsPopup({ type: "success", message: "Details updated!" });
    } catch (err) {
      setDetailsPopup({ type: "error", message: "Failed to update details" });
    } finally {
      setLoading(false);
    }
  };

  // Save password
  const handlePwdSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validatePasswordForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await changePassword({
        email,
        oldPassword: form.oldPassword,
        newPassword: form.password
      });
      setPasswordPopup({ type: "success", message: res?.data?.message || "Password updated successfully" });
      setForm({
        oldPassword: "",
        password: "",
        confirmPassword: ""
      });
    } catch (err) {
      setPasswordPopup({ type: "error", message: err?.response?.data?.message || "Failed to update password" });
    } finally {
      setLoading(false);
    }
  };

  // Format date as DD/MM/YYYY
  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString("en-GB");
  };

  return (
    <div className="grid grid-cols-2 gap-8 w-full">
      {/* Success/Error Popups */}
      <ValidatePopups
        type={detailsPopup.type}
        message={detailsPopup.message}
        onClose={() => setDetailsPopup({ type: "", message: "" })}
      />
      <ValidatePopups
        type={passwordPopup.type}
        message={passwordPopup.message}
        onClose={() => setPasswordPopup({ type: "", message: "" })}
      />

      {/* Details Form */}
      <form className="space-y-6" onSubmit={handleDetailsSave}>
        <div>
          <h3 className="font-semibold mb-2">Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">First Name</label>
              <input
                type="text"
                name="name"
                value={user?.name || ""}
                onChange={handleDetailsChange}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Role</label>
              <input
                type="text"
                name="role"
                value={user?.role || ""}
                onChange={handleDetailsChange}
                className="w-full border rounded-lg px-3 py-2"
                required
                disabled
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">Email address</label>
            <input
              type="email"
              name="email"
              value={user?.email}
              onChange={handleDetailsChange}
              className="w-full border rounded-lg px-3 py-2"
              required
              disabled
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone_number"
                value={user?.phone_number || ""}
                className="w-full border rounded-lg px-3 py-2 bg-gray-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Joined Date</label>
              <input
                type="text"
                name="created_at"
                value={formatDate(user?.created_at)}
                className="w-full border rounded-lg px-3 py-2 bg-gray-100"
                disabled
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-600"
            disabled={loading}
          >
            Save
          </button>
        </div>
      </form>

      {/* Change Password */}
      <form className="space-y-4" onSubmit={handlePwdSubmit}>
        <h3 className="font-semibold mb-2">Change Password</h3>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Current Password</label>
          <div className="relative">
            <input
              type={show.oldPassword ? "text" : "password"}
              name="oldPassword"
              value={form.oldPassword}
              onChange={handlePwdChange}
              className="w-full border rounded-lg px-3 py-2 pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400"
              onClick={() => toggle("oldPassword")}
              tabIndex={-1}
            >
              {show.oldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.oldPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.oldPassword}</p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">New Password</label>
          <div className="relative">
            <input
              type={show.password ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handlePwdChange}
              className="w-full border rounded-lg px-3 py-2 pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400"
              onClick={() => toggle("password")}
              tabIndex={-1}
            >
              {show.password ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>
          {/* Password strength bar */}
          {form.password && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all ${
                  strength <= 1
                    ? "bg-red-500 w-1/4"
                    : strength === 2
                    ? "bg-orange-500 w-2/4"
                    : strength === 3
                    ? "bg-yellow-500 w-3/4"
                    : "bg-green-500 w-full"
                }`}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={show.confirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handlePwdChange}
              className="w-full border rounded-lg px-3 py-2 pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-400"
              onClick={() => toggle("confirmPassword")}
              tabIndex={-1}
            >
              {show.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="w-1/8 mt-2 bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-yellow-600"
          disabled={loading}
        >
          {loading ? "Updating..." : "Save"}
        </button>
      </form>
    </div>
  );
};

export default AccountInfo;