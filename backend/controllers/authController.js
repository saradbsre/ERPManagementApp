const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const { v4: uuidv4 } = require("uuid");
const transporter = require("../utils/mailer");

exports.registerUser = async (req, res) => {
  let pool;
  try {
    const { name, email, phone_number, password } = req.body;

    pool = await poolPromise;

    // 1. CHECK DUPLICATE EMAIL
    const checkUser = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM users WHERE email = @email");

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 2. HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. INSERT USER
    await pool.request()
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("phone", sql.NVarChar, phone_number)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, "USER")
      .query(`
        INSERT INTO users (name, email, phone_number, password, role)
        VALUES (@name, @email, @phone, @password, @role)
      `);
   // console.log("going to log audit for user registration:", email);
    // 4. AUDIT LOG ENTRY
    await auditLogger({
      pool,
      transaction_id: email,
      log_type: "INFO",
      module_name: "auth",
      action: "USER_REGISTER",
      message: `User registered: ${email}`,
      status: "SUCCESS",
      userid: email
    });


    res.json({ message: "User registered successfully" });

  } catch (err) {
    // Only log to audit_logs if pool is defined
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.body.email || "UNKNOWN",
        log_type: "ERROR",
        module_name: "auth",
        action: "USER_REGISTER",
        message: `Registration failed for ${req.body.email || "UNKNOWN"}`,
        status: "FAILURE",
        error_message: err.message,
        userid: req.body.email || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  let pool;

  try {
    const { email, password } = req.body;

    pool = await poolPromise;

    // 1. GET USER
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.password,
          u.temp_password,
          u.phone_number,
          u.role,
          u.is_active,

          COALESCE(ur.[add], r.[add], 0) AS [add],
          COALESCE(ur.[modify], r.[modify], 0) AS [modify],
          COALESCE(ur.[delete], r.[delete], 0) AS [delete],
          COALESCE(ur.[print], r.[print], 0) AS [print],
          COALESCE(ur.[export], r.[export], 0) AS [export],
          COALESCE(ur.[access], r.[access], 0) AS [access]

        FROM users u
        LEFT JOIN userRoles ur ON ur.userid = u.email
        LEFT JOIN role r ON u.role = r.role
        WHERE u.email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = result.recordset[0];

    // console.log("DB password:", user.password);
    // console.log("Temp password:", user.temp_password);
    // console.log("Entered:", password);

    let isMatch = false;
    let usedTempPassword = false;

    // 2. TEMP PASSWORD FIRST (PRIORITY)
    if (user.temp_password) {
      const tempMatch = await bcrypt.compare(password, user.temp_password);

      if (tempMatch) {
        isMatch = true;
        usedTempPassword = true;
      }
    }

    // 3. NORMAL PASSWORD FALLBACK
    if (!isMatch && user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    //console.log("Password valid:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 4. SESSION CHECK
    const sessionCheck = await pool.request()
      .input("user_id", sql.NVarChar, user.email)
      .query(`
        SELECT * FROM login_sessions
        WHERE user_id = @user_id
      `);

    if (sessionCheck.recordset.length > 0) {
      return res.status(409).json({
        message: "User already logged in"
      });
    }

    // 5. TOKEN
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // 6. SAVE SESSION
    const session_id = require("uuid").v4();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await pool.request()
      .input("session_id", sql.NVarChar, session_id)
      .input("user_id", sql.NVarChar, user.email)
      .input("token", sql.NVarChar, token)
      .input("expires_at", sql.DateTime, expiresAt)
      .query(`
        INSERT INTO login_sessions (
          session_id, user_id, token, expires_at
        )
        VALUES (
          @session_id, @user_id, @token, @expires_at
        )
      `);

    // 7. CLEAR TEMP PASSWORD AFTER SUCCESS LOGIN
    if (usedTempPassword) {
      await pool.request()
        .input("email", sql.NVarChar, user.email)
        .query(`
          UPDATE users
          SET temp_password = NULL
          WHERE email = @email
        `);
    }

    // 8. RESPONSE
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logoutUser = async (req, res) => {
  let pool;

  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ message: "Token required" });
    }

    pool = await poolPromise;

    // 1️⃣ Decode token for audit info
    let userEmail = "UNKNOWN";
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userEmail = decoded.email || "UNKNOWN";
    } catch (e) {
      userEmail = "INVALID_TOKEN";
    }

    // 2️⃣ DELETE SESSION
    await pool.request()
      .input("token", sql.NVarChar, token)
      .query(`
        DELETE FROM login_sessions
        WHERE token = @token
      `);

    // 3️⃣ AUDIT LOG - SUCCESS
    await auditLogger({
      pool,
      transaction_id: userEmail,
      log_type: "INFO",
      module_name: "auth",
      action: "USER_LOGOUT",
      message: `User logged out`,
      status: "SUCCESS",
      userid: userEmail
    });

    res.json({ message: "Logged out successfully" });

  } catch (err) {
    if (pool) {
      try {
        await auditLogger({
          pool,
          transaction_id: "LOGOUT_ERROR",
          log_type: "ERROR",
          module_name: "auth",
          action: "USER_LOGOUT",
          message: "Logout failed",
          status: "FAILED",
          error_message: err.message,
          userid: "SYSTEM"
        });
      } catch (logErr) {
        console.error("Audit log failed:", logErr.message);
      }
    }

    res.status(500).json({ error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    let { email, tempPassword, Password } = req.body;

    // 🔥 fix nested email
    if (typeof email === "object") {
      email = email.email;
    }

    const pool = await poolPromise;

    // 🔥 get both passwords
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT password, temp_password 
        FROM users 
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.recordset[0];

    /**
     * =========================================
     * ✅ STEP 1: ADMIN SET TEMP PASSWORD
     * =========================================
     */
    if (tempPassword && !Password) {

      const hashedTemp = await bcrypt.hash(tempPassword, 10);

      await pool.request()
        .input("email", sql.NVarChar, email)
        .input("temp_password", sql.NVarChar, hashedTemp)
        .query(`
          UPDATE users
          SET temp_password = @temp_password,
              is_forget_password = 1
          WHERE email = @email
        `);

       // 🔥 SEND EMAIL HERE
  await transporter.sendMail({
    from:  `"Support Team" <${process.env.SYSTEM_EMAIL}>`,
    to: email,
    subject: "Temporary Password - Asset Management System",
    html: `
      <h3>Temporary Password Generated</h3>
      <p>Hello,</p>
      <p>Your temporary password has been set by the admin.</p>
      <p><b>Temporary Password:</b> ${tempPassword}</p>
      <p>Please login and change your password immediately. It's a one-time password.</p>
      <br/>
      <p>Regards,<br/>IT Support Team</p>
    `
  });
 // console.log(`Temporary password email sent to ${email}`);

  return res.json({ message: "Temporary password set and email sent" });
    }

    /**
     * =========================================
     * ✅ STEP 2: USER RESET PASSWORD
     * =========================================
     */
    if (tempPassword && Password) {

      // 🔥 compare with temp_password column
      const valid = await bcrypt.compare(tempPassword, user.temp_password);
      //console.log("Temp password valid:", valid);
      if (!valid) {
        return res.status(400).json({
          message: "Invalid temporary password"
        });
      }

      const hashedNew = await bcrypt.hash(Password, 10);

      await pool.request()
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, hashedNew)
        .query(`
          UPDATE users
          SET password = @password,
              temp_password = NULL,
              is_forget_password = 0
          WHERE email = @email
        `);

      return res.json({ message: "Password reset successful" });
    }

    return res.status(400).json({
      message: "Invalid request"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
