import React, { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { validatePasswordForm } from "../../utils/validatePasswordForm";
import { changePassword } from "../../api/api";

const Settings = () => {
  const [form, setForm] = useState({
    oldPassword: "",
    password: "",
    confirmPassword: ""
  });

  const [show, setShow] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const email = user?.email;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggle = (key) => {
    setShow((p) => ({ ...p, [key]: !p[key] }));
  };

  // ================= PASSWORD STRENGTH =================
  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(form.password);

  const handleSubmit = async (e) => {
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

      setMsg(res?.data?.message || "Password updated successfully");

      setForm({
        oldPassword: "",
        password: "",
        confirmPassword: ""
      });

    } catch (err) {
      setMsg(err?.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // ================= INPUT =================
  const Input = ({ name, placeholder }) => (
    <div className="relative">

      <input
        type={show[name] ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        value={form[name]}
        onChange={handleChange}
        className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
      />

      <button
        type="button"
        onClick={() => toggle(name)}
        className="absolute right-3 top-3 text-gray-400"
      >
        {show[name] ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>

      {errors[name] && (
        <p className="text-red-500 text-xs mt-1">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh" }} className="flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-100 p-4">

      <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-xl rounded-2xl p-6">

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-indigo-600 text-white flex items-center justify-center rounded-2xl shadow-md">
            <ShieldCheck size={24} />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mt-3">
            Security Settings
          </h2>

          <p className="text-sm text-gray-500">
            Update your password securely
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <Input name="oldPassword" placeholder="Current Password" />
          <Input name="password" placeholder="New Password" />
          <Input name="confirmPassword" placeholder="Confirm Password" />

          {/* PASSWORD STRENGTH */}
          {form.password && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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

          {msg && (
            <p className="text-center text-sm text-indigo-600">
              {msg}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition shadow-md"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default Settings;