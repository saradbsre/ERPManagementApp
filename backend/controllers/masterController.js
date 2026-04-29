const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");

exports.getMasters = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT *
      FROM masters
      WHERE is_active = 1
    `);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMasterData = async (req, res) => {
    try {
    const { master_name } = req.params;
    const { activeUserEmail } = req.query;
    const pool = await poolPromise;
    const result = await pool.request()
      .input("master_name", sql.VarChar(50), master_name)
      .query(`
        SELECT * FROM ${master_name}
      `);

    // audit log
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: master_name,
      action: "FETCH_MASTER_DATA",
      message: `Fetched data for master ${master_name}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });
    res.json(result.recordset);
  } catch (err) {
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: req.params?.master_name || "UNKNOWN",
        action: "FETCH_MASTER_DATA",
        message: "Failed to fetch master data",
        status: "FAILED",
        error_message: err.message,        
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};
const isCardField = (key) => {
  const k = key.toLowerCase();
  return (
    k.includes("card") ||
    k.includes("credit") ||
    k.includes("debit")
  );
};

const formatCardFromLast4 = (value) => {
  if (!value) return value;

  const last4 = value.toString().slice(-4);
  return `**** **** **** ${last4}`;
};

exports.createMasterData = async (req, res) => {
  let pool;
  let safeTable;

  try {
    const { master_name } = req.params;
    const { activeUserEmail } = req.query;
    const rowData = req.body;

    pool = await poolPromise;

    if (!master_name) {
      return res.status(400).json({ error: "Master name required" });
    }

    // 🔒 sanitize table name
    safeTable = master_name.replace(/[^a-zA-Z0-9_]/g, "");

    const columns = Object.keys(rowData);

    if (columns.length === 0) {
      return res.status(400).json({ error: "No data provided" });
    }

    const request = pool.request();

    const colNames = [];
    const colParams = [];

    columns.forEach((key, index) => {
      const param = `p${index}`;

      let value = rowData[key];

      // 🔥 CARD FIELD HANDLING (LAST 4 DIGITS ONLY)
      if (isCardField(key)) {
        value = formatCardFromLast4(value);
      }

      request.input(param, value);

      colNames.push(key);
      colParams.push(`@${param}`);
    });

    const query = `
      INSERT INTO ${safeTable} (${colNames.join(", ")})
      VALUES (${colParams.join(", ")})
    `;

    await request.query(query);

    // ================= SUCCESS AUDIT =================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: safeTable,
      action: "CREATE_MASTER_DATA",
      message: `Created master data in ${safeTable}`,
      status: "SUCCESS",
      userid: req.user?.email || "UNKNOWN"
    });

    return res.status(201).json({
      message: "Master data created successfully"
    });

  } catch (err) {
    console.error("CreateMasterData Error:", err);

    // ================= ERROR AUDIT =================
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: safeTable || "UNKNOWN",
        action: "CREATE_MASTER_DATA",
        message: "Failed to create master data",
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }

    return res.status(500).json({
      error: err.message
    });
  }
};




/* ================= CONTROLLER ================= */

exports.updateMasterData = async (req, res) => {
  let pool;

  try {
    const { master_name, id } = req.params;
    const { activeUserEmail } = req.query;
    const rowData = req.body;

    pool = await poolPromise;

    const safeTable = master_name.replace(/[^a-zA-Z0-9_]/g, "");

    delete rowData.id;

    const keys = Object.keys(rowData);

    if (keys.length === 0) {
      return res.status(400).json({ error: "No update data provided" });
    }

    const request = pool.request();
    request.input("id", sql.Int, id);
    request.input("activeUserEmail", sql.VarChar(255), activeUserEmail);

    const setClause = keys
      .map((key, index) => {
        const param = `p${index}`;

        let value = rowData[key];

        // 🔥 CARD FIELD HANDLING (LAST 4 DIGITS ONLY)
        if (isCardField(key)) {
          value = formatCardFromLast4(value);
        }
        console.log(`Updating field: ${key} with value: ${value} (param: @${param})`);

        request.input(param, value);

        return `${key} = @${param}`;
      })
      .join(", ");

    const query = `
      UPDATE ${safeTable}
      SET ${setClause}, 
      audit_rev = ISNULL(audit_rev, 0) + 1,
      userid = @activeUserEmail

      WHERE id = @id 
    `;

    await request.query(query);

    // ================= AUDIT SUCCESS =================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail,
      log_type: "INFO",
      module_name: safeTable,
      action: "UPDATE_MASTER_DATA",
      message: `Updated master data in ${safeTable}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.status(200).json({
      message: "Master data updated successfully"
    });

  } catch (err) {
    console.error("UpdateMasterData Error:", err);

    // ================= AUDIT ERROR =================
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: req.params?.master_name || "UNKNOWN",
        action: "UPDATE_MASTER_DATA",
        message: "Failed to update master data",
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.deleteMasterData = async (req, res) => {
  try {
    const { master_name, id } = req.params;
    const { activeUserEmail } = req.query;
    const pool = await poolPromise;

    const safeTable = master_name.replace(/[^a-zA-Z0-9_]/g, "");
    await pool.request()
      .input("id", sql.Int, id)
      .input("activeUserEmail", sql.VarChar(255), activeUserEmail)
      .query(`
        UPDATE ${safeTable}
        SET is_active = 0, userid = @activeUserEmail, audit_rev = ISNULL(audit_rev, 0) + 1
        WHERE id = @id
      `);

    // audit log
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: safeTable,
      action: "DELETE_MASTER_DATA",
      message: `Deleted master data in ${safeTable}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });
    res.status(200).json({ message: "Master data deleted successfully" });
    } catch (err) {
    console.error(err);
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: req.params?.master_name || "UNKNOWN",
        action: "DELETE_MASTER_DATA",
        message: `Failed to delete master data in ${req.params?.master_name || "UNKNOWN"}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
    }
};