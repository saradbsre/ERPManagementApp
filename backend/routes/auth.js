const express = require("express");
const router = express.Router();
const { registerUser, loginUser, logoutUser, resetPassword } = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword);

module.exports = router;