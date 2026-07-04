const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../db/db");

const authenticateToken = async (req, res, next) => {
  try {

    // =========================
    // GET TOKEN
    // =========================
    const authHeader = req.headers["authorization"];

    let token =
      authHeader && authHeader.split(" ")[1];
    // console.log("Auth header:", authHeader); // <-- add this
    // console.log("Extracted token:", token); // <-- add this
    if (!token && req.cookies) {
      token = req.cookies.accessToken;
    }

    if (!token) {
     // console.log("No token found in headers or cookies"); // <-- add this
      return res.status(401).json({
        message: "No token, authorization denied"
      });
    }

    // =========================
    // VERIFY TOKEN
    // =========================
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );
  //  console.log("Decoded token:", decoded); // <-- add this
    const pool = await poolPromise;

    // =========================
    // CHECK ACTIVE SESSION
    // =========================
    const sessionResult = await pool.request()
      .input("user_id", sql.NVarChar, decoded.email)
      .query(`
        SELECT *
        FROM login_sessions
        WHERE user_id = @user_id
      `);

    if (sessionResult.recordset.length === 0) {
      return res.status(401).json({
        message: "Session expired"
      });
    }

    const session = sessionResult.recordset[0];

    // =========================
    // CHECK INACTIVITY
    // =========================
    const lastActivity =
      new Date(session.last_activity_time);
    // console.log("Last activity time:", lastActivity); // <-- add this
    const diffMinutes =
      (Date.now() - lastActivity.getTime()) / 60000;
   // console.log("Inactivity (minutes):", diffMinutes); // <-- add this
    // inactive > 5 mins
    if (diffMinutes > 5) {

      // remove session
      await pool.request()
        .input("user_id", sql.NVarChar, decoded.email)
        .query(`
          DELETE FROM login_sessions
          WHERE user_id = @user_id
        `);

      res.clearCookie("accessToken");
      res.clearCookie("session_id");

      return res.status(401).json({
        message: "Session timed out"
      });
    }

    // =========================
    // CHECK TOKEN REMAINING TIME
    // =========================
    const now = Math.floor(Date.now() / 1000);

    const remainingMinutes =
      (decoded.exp - now) / 60;
   // console.log("Token remaining time (minutes):", remainingMinutes); // <-- add this
    // =========================
    // REFRESH TOKEN
    // only if less than 10 mins left
    // =========================
    if (remainingMinutes < 10) {

      const newAccessToken = jwt.sign(
        {
          id: decoded.id,
          email: decoded.email
        },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: true, // true in production HTTPS
        sameSite: "strict",
        maxAge: 2 * 60 * 60 * 1000
      });
    // console.log("Token refreshed for user:", decoded.email);
    }

    // =========================
    // UPDATE LAST ACTIVITY
    // =========================
    await pool.request()
      .input("user_id", sql.NVarChar, decoded.email)
      .query(`
        UPDATE login_sessions
        SET last_activity_time = GETDATE()
        WHERE user_id = @user_id
      `);

    // =========================
    // STORE USER
    // =========================
    req.user = decoded;

    next();

  } catch (err) {

    console.error("JWT error:", err);

    return res.status(403).json({
      message: "Token is not valid"
    });
  }
};

module.exports = { authenticateToken };

