const { sql, poolPromise } = require("../db/db");
require("dotenv").config();

exports.getLogs = async (req, res) => {
  try {
    const pool = await poolPromise;

    const {
      log_type,
      action,
      status,
      user_id,
      startDate,
      endDate
    } = req.query;
    console.log("Received log filters:", req.query); // Debug log

    let query = `
      SELECT *
      FROM audit_logs
      WHERE 1=1
    `;

    const request = pool.request();

    // filters
    if (log_type) {
      query += ` AND log_type = @log_type`;
      request.input("log_type", sql.VarChar, log_type);
    }

    if (action) {
      query += ` AND action = @action`;
      request.input("action", sql.VarChar, action);
    }

    if (status) {
      query += ` AND status = @status`;
      request.input("status", sql.VarChar, status);
    }

    if (user_id) {
      query += ` AND userid = @user_id`;
      request.input("user_id", sql.VarChar, user_id);
    }

    // DATE RANGE FIX 🔥
    if (startDate && endDate) {
      query += ` AND sysdate >= @startDate AND sysdate < DATEADD(DAY, 1, @endDate)`;
    request.input("startDate", sql.DateTime, startDate);
request.input("endDate", sql.DateTime, endDate);
    } else {
      // DEFAULT → TODAY
      query += `
        AND sysdate >= CAST(GETDATE() AS DATE)
        AND sysdate < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
      `;
    }

    query += ` ORDER BY sysdate DESC`;

    const result = await request.query(query);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};