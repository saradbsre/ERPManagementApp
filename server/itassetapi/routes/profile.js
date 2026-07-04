const express = require("express");
const router = express.Router();

const { getUserbyId, changePassword, updateUserProfile } = require("../controllers/profileController");

router.get("/users/profile/:email", getUserbyId);
router.post("/users/profile/change-password", changePassword);
router.put("/users/profile/:email", updateUserProfile);

module.exports = router;