const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser, resetPassword, sessionHeartbeat, logoutAllDevices,
  checkCurrentSession } = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);
router.post("/heartbeat", sessionHeartbeat);
router.post("/logout-all-devices", logoutAllDevices);
router.get("/check-current-session", checkCurrentSession);
module.exports = router;