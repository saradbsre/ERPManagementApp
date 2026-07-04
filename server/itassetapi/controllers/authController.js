const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const { v4: uuidv4 } = require("uuid");
const transporter = require("../utils/mailer");
//const useragent = require("useragent");

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
    console.log("going to log audit for user registration:", email);
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

const cookieOptions = {
  httpOnly: true,
  secure: true,      // production HTTPS
  sameSite: "none",  // frontend/backend different domains
  path: "/"
};

exports.loginUser = async (req, res) => {
  let pool;

  try {
    const { email, password } = req.body;
    pool = await poolPromise;

    // =========================
    // 1. GET USER
    // =========================
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
          u.prf_access,
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

    if (!user.is_active) {
      return res.status(403).json({ message: "User is inactive" });
    }

    // =========================
    // 2. PASSWORD CHECK
    // =========================
    let isMatch = false;

    if (user.temp_password) {
      isMatch = await bcrypt.compare(password, user.temp_password);
    }

    if (!isMatch && user.password) {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Username or password" });
    }

    // =========================
    // 3. CHECK EXISTING ACTIVE SESSION (IMPORTANT)
    // =========================
    const sessionCheck = await pool.request()
      .input("user_id", sql.NVarChar, user.email)
      .query(`
        SELECT session_id
        FROM login_sessions
        WHERE user_id = @user_id
      `);

    if (sessionCheck.recordset.length > 0) {
      return res.status(409).json({
        message: "Another session is already active for this user"
      });
    }

    // =========================
    // 4. CREATE TOKEN
    // =========================
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // =========================
    // 5. SESSION ID
    // =========================
    const session_id = uuidv4();

    // =========================
    // 6. SET COOKIES
    // =========================
    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 2 * 60 * 60 * 1000
    });

    res.cookie("session_id", session_id, {
      ...cookieOptions
    });

    // =========================
    // 7. CLIENT INFO
    // =========================
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    // const agent = useragent.parse(req.headers["user-agent"]);

    // =========================
    // 8. SAVE SESSION
    // =========================
    await pool.request()
      .input("session_id", sql.NVarChar, session_id)
      .input("user_id", sql.NVarChar, user.email)
      .input("ip_address", sql.NVarChar, ip)
      // .input("browser", sql.NVarChar, agent.toAgent())
      // .input("device_type", sql.NVarChar, agent.device.toString())
      //.input("login_time", sql.DateTime, new Date())
      // .input("last_activity_time", sql.DateTime, new Date())
      .query(`
        INSERT INTO login_sessions (
          session_id, user_id, ip_address,
          login_time, last_activity_time
        )
        VALUES (
          @session_id, @user_id, @ip_address,
          GETDATE(), GETDATE()
        )
      `);

    // =========================
    // 9. RESPONSE
    // =========================
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        prf_access: user.prf_access,
        permissions: {
          add: user.add,
          modify: user.modify,
          delete: user.delete,
          print: user.print,
          export: user.export,
          access: user.access
        }
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logoutUser = async (req, res) => {
  let pool;

  try {
    pool = await poolPromise;

    const session_id = req.cookies.session_id;

    console.log("Logging out session:", session_id);

    if (session_id) {
      await pool.request()
        .input("session_id", sql.NVarChar, session_id)
        .query(`
          DELETE FROM login_sessions
          WHERE session_id = @session_id
        `);
    }

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/"
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("session_id", cookieOptions);

    return res.json({
      message: "Logged out successfully"
    });

  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};
//test1

exports.logoutUser1 = async (req, res) => {
  try {
    // const { user_id } = req.body;

    // if (!user_id) {
    //   return res.status(400).json({ message: "User ID required" });
    // }

    // const pool = await poolPromise;

    // // DELETE ALL SESSIONS FOR USER
    // await pool.request()
    //   .input("user_id", sql.NVarChar, user_id)
    //   .query(`
    //     DELETE FROM login_sessions
    //     WHERE user_id = @user_id
    //   `);
    //  res.clearCookie("accessToken");
    //  res.clearCookie("session_id");

    res.json({ message: "Logged out successfully" });

  } catch (err) {
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
  console.log(`Temporary password email sent to ${email}`);

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
      console.log("Temp password valid:", valid);
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

exports.sessionHeartbeat = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const pool = await poolPromise;
    await pool.request()
      .input("user_id", sql.NVarChar, email)
      .input("last_activity_time", sql.DateTime, new Date())
      .query(`
        UPDATE login_sessions
        SET last_activity_time = @last_activity_time
        WHERE user_id = @user_id
      `);

    res.json({ message: "Session heartbeat updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function cleanupLoginSessions() {
  try {
    const pool = await poolPromise;

    // 1. Get expired sessions (UTC based)
    const expiredSessions = await pool.request().query(`
      SELECT session_id, user_id, last_activity_time
      FROM login_sessions
      WHERE DATEDIFF(MINUTE, last_activity_time, GETUTCDATE()) > 20
    `);

    const now = new Date();

    // 2. Log expired sessions
    for (const session of expiredSessions.recordset) {
      console.log(
        `[SESSION CLEANUP]
          User: ${session.user_id}
          Session: ${session.session_id}
          Last Activity (DB UTC): ${session.last_activity_time}
          Deleted At (UTC): ${now.toISOString()}`
      );
    }

    // 3. Delete expired sessions
    const deleteResult = await pool.request().query(`
      DELETE FROM login_sessions
      WHERE DATEDIFF(MINUTE, last_activity_time, GETUTCDATE()) > 20
    `);

    console.log(
      `[SESSION CLEANUP] ${deleteResult.rowsAffected?.[0] || 0} expired sessions removed`
    );

  } catch (err) {
    console.error("[SESSION CLEANUP ERROR]", err);
  }
}



// Run every 5 minutes
setInterval(cleanupLoginSessions, 5 * 60 * 1000);

// Run once on startup
cleanupLoginSessions();