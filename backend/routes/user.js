const express = require("express");
const router = express.Router();
const { getAllUsers, roles, toggleUserStatus, updateUserRole, createRole, updateRole, 
        signupRequests, acceptSignupRequest, confirmReqest, updateUserPermissions,
        forgetPassword, forgetPasswordReqs } = require("../controllers/userController");

router.get("/users", getAllUsers);
router.get("/roles", roles);
router.post("/users/:id/activate", (req, res) => {
  req.body = {
    ...req.body,
    isActive: true,
    email: req.body.email
  };

  toggleUserStatus(req, res);
});

router.post("/users/:id/deactivate", (req, res) => {
  req.body = {
    ...req.body,
    isActive: false,
    email: req.body.email
  };

  toggleUserStatus(req, res);
});
router.post("/users/:id/confirm", confirmReqest);
router.post("/users/:id/cancel", confirmReqest);
router.post("/users/:id/role", updateUserRole);
router.post("/roles", createRole);
router.put("/roles/:role", updateRole);
router.get("/signup-requests", signupRequests);
router.post("/signup-requests/:id/accept", acceptSignupRequest);
router.post("/users/:id/permissions", updateUserPermissions);
router.post("/forgot-password", forgetPassword);
router.get("/forgot-password-requests", forgetPasswordReqs);
module.exports = router;