const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser, resetPassword, sessionHeartbeat } = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);
router.post("/heartbeat", sessionHeartbeat);

module.exports = router;