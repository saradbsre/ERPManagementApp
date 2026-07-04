import React, { useState } from "react";
import bgImage from "../../assets/binshabib1.png";
import { forgetPassword } from "../../api/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await forgetPassword({ email });

      setMessage(
        "If this email exists, reset instructions have been sent."
      );

      // optional clear
      setEmail("");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center px-6"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.2)), url(${bgImage})`,
      }}
    >
      <div className="flex w-full max-w-5xl items-center justify-between">

        {/* LEFT SIDE */}
        <div className="text-white max-w-lg hidden md:block">
          <h1 className="text-5xl font-bold leading-tight">
            Forgot your <br /> Password?
          </h1>
          <p className="mt-4 text-sm opacity-80">
            Enter your email to receive reset instructions.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-white/20 backdrop-blur-xl p-8 rounded-xl shadow-xl w-full max-w-md">

          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Reset Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label className="text-sm text-white block mb-1">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded bg-white text-gray-900"
                required
              />
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded bg-orange-500 text-white hover:bg-orange-600 transition"
            >
              {loading ? "Processing..." : "Request Reset"}
            </button>

            {/* ERROR */}
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* SUCCESS */}
            {message && (
              <p className="text-green-300 text-sm text-center">
                {message}
              </p>
            )}

            {/* BACK */}
            <div className="text-center mt-3">
              <a href="/" className="text-sm text-white hover:underline">
                Back to Login
              </a>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}