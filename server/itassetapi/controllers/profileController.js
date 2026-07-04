const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const bcrypt = require("bcrypt");


exports.getUserbyId = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userEmail = req.params.email;
    console.log("Fetching user with email:", userEmail);

    const result = await pool.request().query(`
        SELECT * FROM users
        WHERE email = '${userEmail}'
     
    `);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const pool = await poolPromise;

    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Email, old password and new password are required"
      });
    }

    // ============================
    // GET USER (SAFE QUERY)
    // ============================
    const userResult = await pool.request()
      .input("email", email)
      .query(`
        SELECT * FROM users
        WHERE email = @email
      `);

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ============================
    // VERIFY OLD PASSWORD
    // ============================
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {

      // AUDIT FAILED ATTEMPT
      await auditLogger({
        pool,
        transaction_id: email,
        log_type: "WARNING",
        module_name: "auth",
        action: "PASSWORD_CHANGE",
        message: `Password change failed - incorrect old password`,
        status: "FAILED",
        userid: email
      });

      return res.status(400).json({
        message: "Old password is incorrect"
      });
    }

    // ============================
    // HASH NEW PASSWORD
    // ============================
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ============================
    // UPDATE PASSWORD
    // ============================
    await pool.request()
      .input("password", hashedPassword)
      .input("email", email)
      .query(`
        UPDATE users
        SET password = @password
        WHERE email = @email
      `);

    // ============================
    // AUDIT SUCCESS
    // ============================
    await auditLogger({
      pool,
      transaction_id: email,
      log_type: "INFO",
      module_name: "auth",
      action: "PASSWORD_CHANGE",
      message: `User changed password successfully`,
      status: "SUCCESS",
      userid: email
    });

    return res.json({
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const pool = await poolPromise;

    const email = req.params.email;
    const { name, phone_number } = req.body;

    console.log("Updating user:", email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // ================= BUILD DYNAMIC UPDATE =================
    const updates = [];
    const request = pool.request();

    if (name) {
      updates.push("name = @name");
      request.input("name", name);
    }

    if (phone_number) {
      updates.push("phone_number = @phone_number");
      request.input("phone_number", phone_number);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: "No fields to update"
      });
    }

    request.input("email", email);

    const query = `
      UPDATE users
      SET ${updates.join(", ")}, sysdate = GETDATE(), audit_rev = ISNULL(audit_rev, 0) + 1, userid = @email
      WHERE email = @email;

      SELECT * FROM users WHERE email = @email;
    `;

    const result = await request.query(query);

    // ================= AUDIT LOG =================
    await auditLogger({
      pool,
      transaction_id: email,
      log_type: "INFO",
      module_name: "user_profile",
      action: "UPDATE_PROFILE",
      message: `User profile updated (${updates.join(", ")})`,
      status: "SUCCESS",
      userid: email
    });

    return res.json({
      message: "Profile updated successfully",
      data: result.recordset[0]
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};