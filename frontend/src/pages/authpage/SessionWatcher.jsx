import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkCurrentSession } from "../api/api";

export default function SessionWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(async () => {
      const user = JSON.parse(localStorage.getItem("user") || "null");

      if (!user?.email) return;

      try {
        const res = await checkCurrentSession();

        if (res.data?.active === false) {
          alert(
            res.data?.message ||
              "You have been logged out because your account was logged in from another device/browser."
          );

          localStorage.removeItem("user");
          navigate("/", { replace: true });
        }

      } catch (err) {
        if (err.response?.data?.forcedLogout) {
          alert(
            err.response?.data?.message ||
              "You have been logged out because your account was logged in from another device/browser."
          );

          localStorage.removeItem("user");
          navigate("/", { replace: true });
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [navigate]);

  return null;
}