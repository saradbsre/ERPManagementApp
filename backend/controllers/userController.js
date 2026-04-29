const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const { incrementAuditRev } = require("../utils/auditRev");
const transporter = require("../utils/mailer");

exports.getAllUsers = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone_number,
        u.role,
        u.is_active,

        -- 🔥 PRIORITY: userRoles > role table
        COALESCE(ur.[add], r.[add], 0)     AS [add],
        COALESCE(ur.[modify], r.[modify], 0) AS [modify],
        COALESCE(ur.[delete], r.[delete], 0) AS [delete],
        COALESCE(ur.[print], r.[print], 0)   AS [print],
        COALESCE(ur.[export], r.[export], 0) AS [export],
        COALESCE(ur.[access], r.[access], 0) AS [access]

      FROM users u

      -- 🔥 USER SPECIFIC PERMISSIONS
      LEFT JOIN userRoles ur 
        ON ur.userid = u.email

      -- 🔥 DEFAULT ROLE PERMISSIONS
      LEFT JOIN role r 
        ON u.role = r.role
    `);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.roles = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM role");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.confirmReqest = async (req, res) => {
  let pool;

  try {
    const { id } = req.params;
    const { isCancel, email, activeUserEmail } = req.body;

    pool = await poolPromise;
    console.log("Updating user status with data:", { id, isCancel, email, activeUserEmail });
    await pool.request()
      .input("id", sql.Int, id)
      .input("isCancel", sql.Bit, isCancel)
      .input("activeUserEmail", sql.NVarChar, activeUserEmail)
      .query("UPDATE users SET confirm = @isCancel, auditrev = ISNULL(auditrev, 0) + 1, userid = @activeUserEmail WHERE id = @id");

    await auditLogger({
      pool,
      transaction_id: req.user?.email || email || "SYSTEM",
      log_type: "INFO",
      module_name: "users",
      action: isCancel ? "CANCEL_SIGNUP_REQUEST" : "APPROVE_SIGNUP_REQUEST",
      message: `${isCancel ? "Cancelled" : "Approved"} signup request for user ID ${id}`,
      userid: activeUserEmail,
    });

    res.json({
      message: `User request is ${isCancel ? "cancelled" : "approved"}`
    });

  } catch (err) {
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || req.body?.email || "SYSTEM",
        log_type: "ERROR",
        module_name: "users",
        action: "CONFIRM_REQUEST",
        message: "Failed to update user status",
        status: "FAILED",
        error_message: err.message,
        userid: req.body?.activeUserEmail || "SYSTEM",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.toggleUserStatus = async (req, res) => {
  let pool;

  try {
    const { id } = req.params;
    const { isActive, email, activeUserEmail } = req.body;

    pool = await poolPromise;

    const userEmail = req.user?.email || email || "SYSTEM";
    const activeUser = activeUserEmail ;

    await pool.request()
      .input("id", sql.Int, id)
      .input("isActive", sql.Bit, isActive)
      .input("activeUser", sql.NVarChar, activeUser)
      .query(`
        UPDATE users 
        SET is_active = @isActive, auditrev = ISNULL(auditrev, 0) + 1, userid = @activeUser
        WHERE id = @id
      `);

    await auditLogger({
      pool,
      transaction_id: userEmail,   // ✅ IMPORTANT CHANGE
      module_name: "users",
      action: "TOGGLE_USER_STATUS",
      message: `User ${id} ${isActive ? "activated" : "deactivated"}`,
      userid: activeUser,
    });

    res.json({ message: `User ${isActive ? "activated" : "deactivated"}` });

  } catch (err) {
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "SYSTEM",
        log_type: "ERROR",
        module_name: "users",
        action: "TOGGLE_USER_STATUS",
        message: "Failed to toggle user status",
        status: "FAILED",
        error_message: err.message,
        userid: activeUser,
      });
    }

    res.status(500).json({ error: err.message });
  }
};


exports.updateUserRole = async (req, res) => {
  let pool;

  try {
    const { id } = req.params;
    const { role, username, email, activeUserEmail } = req.body;
    console.log("Updating user role with data:", { id, role, username, email, activeUserEmail });
    pool = await poolPromise;

    const userEmail = req.user?.email || email || "SYSTEM";

    // 1️⃣ Update ONLY role in users table
    await pool.request()
      .input("id", sql.Int, id)
      .input("role", sql.NVarChar, role)
      .input("activeUserEmail", sql.NVarChar, activeUserEmail)
      .query(`
        UPDATE users 
        SET role = @role, auditrev = ISNULL(auditrev, 0) + 1, userid = @activeUserEmail
        WHERE id = @id
      `);

    // 2️⃣ Audit log SUCCESS
    await auditLogger({
      pool,
      transaction_id: userEmail,   // ✅ IMPORTANT CHANGE
      module_name: "users",
      action: "UPDATE_ROLE",
      message: `Role for user ${username} updated to ${role}`,
      userid: activeUserEmail,
    });

    res.json({ message: "User role updated successfully" });

  } catch (err) {

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "SYSTEM",
        log_type: "ERROR",
        module_name: "users",
        action: "UPDATE_ROLE",
        message: "Failed to update user role",
        status: "FAILED",
        error_message: err.message,
        userid: req.body?.activeUserEmail || "SYSTEM",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.updateUserPermissions = async (req, res) => {
  let pool;

  try {
    const { id } = req.params;
    const { username, role, permissions = {}, email, activeUserEmail } = req.body;

    pool = await poolPromise;

    const userEmail = req.user?.email || email || "SYSTEM";

    // 1️⃣ UPSERT permissions ONLY
    await pool.request()
      .input("username", sql.NVarChar, username)
      .input("role", sql.NVarChar, role)
      .input("add", sql.Bit, permissions.add || 0)
      .input("modify", sql.Bit, permissions.modify || 0)
      .input("delete", sql.Bit, permissions.delete || 0)
      .input("print", sql.Bit, permissions.print || 0)
      .input("export", sql.Bit, permissions.export || 0)
      .input("access", sql.Bit, permissions.access ?? 1)
      .input("userid", sql.NVarChar, activeUserEmail)
      .query(`
        IF EXISTS (SELECT 1 FROM userRoles WHERE userid = @userid)
        BEGIN
          UPDATE userRoles
          SET 
            username = @username,
            role = @role,
            [add] = @add,
            [modify] = @modify,
            [delete] = @delete,
            [print] = @print,
            [export] = @export,
            [access] = @access,
            sysdate = GETDATE(),
            audit_rev = ISNULL(audit_rev, 0) + 1,
            userid = @userid
          WHERE  username = @username
        END
        ELSE
        BEGIN
          INSERT INTO userRoles
            (username, role, [add], [modify], [delete], [print], [export], [access], userid)
          VALUES
            (@username, @role, @add, @modify, @delete, @print, @export, @access, @userid)
        END
      `);

      // console.log("With parameters:", {
      //   username,
      //   role,
      //   add: permissions.add || 0,
      //   modify: permissions.modify || 0,
      //   delete: permissions.delete || 0,
      //   print: permissions.print || 0,
      //   export: permissions.export || 0,
      //   access: permissions.access ?? 1,
      //   userid: activeUserEmail
      // });
      
      //console.log(`Permissions for user ${username} updated. New permissions - Add: ${permissions.add}, Modify: ${permissions.modify}, Delete: ${permissions.delete}, Print: ${permissions.print}, Export: ${permissions.export}, Access: ${permissions.access}`);

    // 2️⃣ Audit SUCCESS
    await auditLogger({
      pool,
      transaction_id: userEmail,   // ✅ IMPORTANT CHANGE
      module_name: "users",
      action: "UPDATE_PERMISSIONS",
      message: `Permissions for user ${username} updated`,
      userid: userEmail,
    });

    res.json({ message: "User permissions updated successfully" });

  } catch (err) {

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "SYSTEM",
        log_type: "ERROR",
        module_name: "users",
        action: "UPDATE_PERMISSIONS",
        message: "Failed to update user permissions",
        status: "FAILED",
        error_message: err.message,
        userid: req.user?.email || "SYSTEM",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.createRole = async (req, res) => {
  let pool;

  try {
    const {
      role,
      add,
      modify,
      delete: del,
      print,
      export: exp,
      access,
      email,
      activeUserEmail
    } = req.body;

    pool = await poolPromise;

    const userEmail = req.user?.email || req.body?.email || "SYSTEM";

    // 1️⃣ INSERT ROLE
    await pool.request()
      .input("role", sql.NVarChar, role)
      .input("add", sql.Bit, add || 0)
      .input("modify", sql.Bit, modify || 0)
      .input("delete", sql.Bit, del || 0)
      .input("print", sql.Bit, print || 0)
      .input("export", sql.Bit, exp || 0)
      .input("access", sql.Bit, access ?? 1)
      .input("activeUserEmail", sql.NVarChar, activeUserEmail)
      .query(`
        INSERT INTO role (role, [add], [modify], [delete], [print], [export], [access], userid)
        VALUES (@role, @add, @modify, @delete, @print, @export, @access, @activeUserEmail)
      `);

    // 2️⃣ AUDIT SUCCESS
    await auditLogger({
      pool,
      transaction_id: userEmail,   // ✅ IMPORTANT CHANGE
      module_name: "role",
      action: "CREATE_ROLE",
      message: `Role '${role}' created`,
      userid: activeUserEmail,
    });

    res.json({ message: "Role created successfully" });

  } catch (err) {

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "SYSTEM",
        log_type: "ERROR",
        module_name: "role",
        action: "CREATE_ROLE",
        message: "Failed to create role",
        status: "FAILED",
        error_message: err.message,
        userid: req.user?.email || "SYSTEM",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.updateRole = async (req, res) => {
  let pool;

  try {
    const { id } = req.body;
    const {
      role,
      add,
      modify,
      delete: del,
      print,
      export: exp,
      access,
      activeUserEmail
    } = req.body;

    pool = await poolPromise;

    const userEmail = req.user?.email || req.body?.email || "SYSTEM";

    // 1️⃣ UPDATE ROLE
    await pool.request()
      .input("id", sql.Int, id)
      .input("role", sql.NVarChar, role)
      .input("add", sql.Bit, add || 0)
      .input("modify", sql.Bit, modify || 0)
      .input("delete", sql.Bit, del || 0)
      .input("print", sql.Bit, print || 0)
      .input("export", sql.Bit, exp || 0)
      .input("access", sql.Bit, access ?? 1)
      .input("activeUserEmail", sql.NVarChar, activeUserEmail)
      .query(`
        UPDATE role 
        SET 
          role = @role,
          [add] = @add,
          [modify] = @modify,
          [delete] = @delete,
          [print] = @print,
          [export] = @export,
          [access] = @access,
          audit_rev = ISNULL(audit_rev, 0) + 1,
          userid = @activeUserEmail
        WHERE id = @id
      `);

      console.log(`Role with ID ${id} updated. New values - Role: ${role}, Add: ${add}, Modify: ${modify}, Delete: ${del}, Print: ${print}, Export: ${exp}, Access: ${access}`);

    // 2️⃣ AUDIT SUCCESS
    await auditLogger({
      pool,
      transaction_id: userEmail,   // ✅ IMPORTANT CHANGE
      module_name: "role",
      action: "UPDATE_ROLE",
      message: `Role '${role}' updated`,
      userid: activeUserEmail,
    });

    res.json({ message: "Role updated successfully" });

  } catch (err) {

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "SYSTEM",
        log_type: "ERROR",
        module_name: "role",
        action: "UPDATE_ROLE",
        message: "Failed to update role",
        status: "FAILED",
        error_message: err.message,
        userid: req.body?.activeUserEmail || "SYSTEM",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.signupRequests = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT id, name, email, phone_number, role, is_active
        FROM users
        WHERE confirm = 0
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.acceptSignupRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;
    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE users
        SET confirm = 0, is_active = 1
        WHERE id = @id 
      `);
    res.json({ message: "Signup request accepted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.forgetPasswordReqs = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
        SELECT id, name, email, phone_number, role, is_active
        FROM users
        WHERE is_forget_password  = 1
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("Received forget password request:", req.body);

    console.log("Received forget password request:", email);

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const pool = await poolPromise;

    await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        UPDATE users
        SET is_forget_password = 1
        WHERE email = @email
      `);

    res.json({ message: "Forget password request accepted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// exports.forgetPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     console.log("Received forget password request:", email);

//     if (!email || typeof email !== "string") {
//       return res.status(400).json({ message: "Invalid email format" });
//     }

//     const pool = await poolPromise;

//     // 1. UPDATE DB
//     const result = await pool.request()
//       .input("email", sql.NVarChar, email)
//       .query(`
//         UPDATE users
//         SET is_forget_password = 1
//         WHERE email = @email
//       `);

//     // optional: check if user exists
//     if (result.rowsAffected[0] === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // 2. SEND EMAIL (COMMON SYSTEM EMAIL)
//     await transporter.sendMail({
//       from: `"Support Team" <${process.env.SYSTEM_EMAIL}>`,
//       to: email,
//       subject: "Password Reset Request Received",
//       html: `
//         <div>
//           <h2>Password Reset Request</h2>
//           <p>We received a request to reset your password.</p>
//           <p>Your request is currently under review.</p>
//           <p>If this was not you, please ignore this email.</p>
//         </div>
//       `
//     });

//     res.json({ message: "Forget password request accepted successfully" });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };