const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const { resolveCol } = require("../utils/resolveCol");

exports.getMasters = async (req, res) => {
  try {
    const pool = await poolPromise;

    // 1. Get columns dynamically
    const colsRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'masters'
    `);

    const columns = colsRes.recordset.map(c => c.COLUMN_NAME);

    // 2. Resolve active column dynamically
    const activeCol = resolveCol(columns, "is_active");

    // 3. Build safe query
    const query = `
      SELECT *
      FROM masters
      WHERE ${activeCol || "1"} = 1
    `;

    const result = await pool.request().query(query);

    res.json(result.recordset);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMasterData = async (req, res) => {
  let pool;

  try {
    const { master_name } = req.params;
    const { activeUserEmail } = req.query;

    pool = await poolPromise;

    if (!master_name) {
      return res.status(400).json({ error: "Master name is required" });
    }

    // =========================
    // sanitize table name
    // =========================
    const safeTable = master_name.replace(/[^a-zA-Z0-9_]/g, "");

    // =========================
    // get table columns
    // =========================
    const colsRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${safeTable}'
    `);

    const columns = colsRes.recordset.map(c => c.COLUMN_NAME);

    // =========================
    // resolve deleted column dynamically
    // =========================
    const deletedCol = resolveCol(columns, "deleted");

    if (!deletedCol) {
      return res.status(500).json({
        error: "Deleted column not found in table"
      });
    }

    // =========================
    // safe query
    // =========================
    const query = `
      SELECT *
      FROM ${safeTable}
      WHERE ${deletedCol} = 0 OR ${deletedCol} IS NULL
    `;

    const result = await pool.request().query(query);

    // =========================
    // audit log
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: safeTable,
      action: "FETCH_MASTER_DATA",
      message: `Fetched data for master ${safeTable}`,
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

    // =========================
    // sanitize table name
    // =========================
    safeTable = master_name.replace(/[^a-zA-Z0-9_]/g, "");

    // =========================
    // get columns
    // =========================
    const colsRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${safeTable}'
    `);

    const columns = colsRes.recordset.map(c => c.COLUMN_NAME);

    // =========================
    // resolve audit columns (from helper file)
    // =========================
    const useridCol = resolveCol(columns, "userid");
    const sysdateCol = resolveCol(columns, "sysdate");
    const auditCol = resolveCol(columns, "audit_rev");
    const deletedCol = resolveCol(columns, "deleted");
    //const isActiveCol = resolveCol(columns, "is_active");

    // =========================
    // clean data
    // =========================
    Object.keys(rowData).forEach(key => {
      if (rowData[key] === "" || rowData[key] === undefined) {
        rowData[key] = null;
      }
    });

    // =========================
    // build query safely
    // =========================
    const request = pool.request();

    const colNames = [];
    const colParams = [];

    let index = 0;

    for (const key of Object.keys(rowData)) {
      const param = `p${index++}`;
      request.input(param, rowData[key]);

      colNames.push(key);
      colParams.push(`@${param}`);
    }

    // =========================
    // auto audit injection
    // =========================
    if (useridCol) {
      request.input("userid", activeUserEmail);
      colNames.push(useridCol);
      colParams.push("@userid");
    }

    if (sysdateCol) {
      request.input("sysdate", new Date());
      colNames.push(sysdateCol);
      colParams.push("@sysdate");
    }

    if (auditCol) {
      request.input("audit_rev", 1);
      colNames.push(auditCol);
      colParams.push("@audit_rev");
    }

    if (deletedCol) {
      request.input("deleted", 0);
      colNames.push(deletedCol);
      colParams.push("@deleted");
    }
   

    // =========================
    // final query
    // =========================
    const query = `
      INSERT INTO ${safeTable} (${colNames.join(", ")})
      VALUES (${colParams.join(", ")})
    `;
    console.log("Executing query:", query);
    await request.query(query);

    return res.status(201).json({
      message: "Master data created successfully"
    });

  } catch (err) {
    console.error("CreateMasterData Error:", err);

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

    // =========================
    // get table columns
    // =========================
    const colsRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${safeTable}'
    `);

    const columns = colsRes.recordset.map(c => c.COLUMN_NAME);

    // =========================
    // resolve common columns
    // =========================
    const useridCol = resolveCol(columns, "userid");
    const auditCol = resolveCol(columns, "audit_rev");
    const sysdateCol = resolveCol(columns, "sysdate");

    const request = pool.request();

    request.input("id", sql.Int, id);
    request.input("activeUserEmail", sql.VarChar(255), activeUserEmail);

    // =========================
    // dynamic SET clause
    // =========================
    const setClause = keys
      .map((key, index) => {
        const param = `p${index}`;

        let value = rowData[key];

        // card logic (optional)
        if (isCardField(key)) {
          value = value ? value.toString().slice(-4) : null;
        }

        request.input(param, value);

        return `${key} = @${param}`;
      })
      .join(", ");

    // =========================
    // build final query safely
    // =========================
    const query = `
      UPDATE ${safeTable}
      SET 
        ${setClause}
        ${auditCol ? `, ${auditCol} = ISNULL(${auditCol},0) + 1` : ""}
        ${sysdateCol ? `, ${sysdateCol} = GETDATE()` : ""}
        ${useridCol ? `, ${useridCol} = @activeUserEmail` : ""}
      WHERE id = @id
    `;
   // console.log("Executing query:", query);
    await request.query(query);

    return res.status(200).json({
      message: "Master data updated successfully"
    });

  } catch (err) {
    console.error("UpdateMasterData Error:", err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.deleteMasterData = async (req, res) => {
  let pool;

  try {
    const { master_name, id } = req.params;
    const { activeUserEmail } = req.query;

    pool = await poolPromise;

    const safeTable = master_name.replace(/[^a-zA-Z0-9_]/g, "");

    // =========================
    // get columns from table
    // =========================
    const colsRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${safeTable}'
    `);

    const columns = colsRes.recordset.map(c => c.COLUMN_NAME);

    // =========================
    // resolve dynamic columns
    // =========================
    const useridCol = resolveCol(columns, "userid");
    const auditCol  = resolveCol(columns, "audit_rev");
    const sysCol    = resolveCol(columns, "sysdate");
    const deletedCol = resolveCol(columns, "deleted");

    const request = pool.request();

    request.input("id", sql.Int, id);
    request.input("activeUserEmail", sql.VarChar(255), activeUserEmail);

    // =========================
    // build SET clause safely
    // =========================
    const setClauseParts = [];

    if (deletedCol) {
      setClauseParts.push(`${deletedCol} = 1`);
    }

    if (useridCol) {
      setClauseParts.push(`${useridCol} = @activeUserEmail`);
    }

    if (auditCol) {
      setClauseParts.push(`${auditCol} = ISNULL(${auditCol}, 0) + 1`);
    }

    if (sysCol) {
      setClauseParts.push(`${sysCol} = GETDATE()`);
    }

    const query = `
      UPDATE ${safeTable}
      SET ${setClauseParts.join(", ")}
      WHERE id = @id
    `;

    await request.query(query);

    // ================= AUDIT =================
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

    return res.status(200).json({
      message: "Master data deleted successfully"
    });

  } catch (err) {
    console.error("DeleteMasterData Error:", err);

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: req.params?.master_name || "UNKNOWN",
        action: "DELETE_MASTER_DATA",
        message: "Failed to delete master data",
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

exports.saveProviderPlans = async (req, res) => {
  try {
    let { provider_id, plan_ids, activeUserEmail } = req.body;
    provider_id = parseInt(provider_id, 10);
    if (isNaN(provider_id)) {
      return res.status(400).json({ error: "Invalid provider_id. Must be a number." });
    }
    if (!Array.isArray(plan_ids)) {
      return res.status(400).json({ error: "plan_ids must be an array." });
    }

    const pool = await poolPromise;

    // 1. delete old mappings
    await pool.request()
      .input("provider_id", sql.Int, provider_id)
      .query(`DELETE FROM provider_plan_map WHERE provider_id = @provider_id`);

    // 2. insert new mappings
    for (let planId of plan_ids) {
      planId = parseInt(planId, 10);
      if (isNaN(planId)) continue; // skip invalid plan ids
      await pool.request()
        .input("provider_id", sql.Int, provider_id)
        .input("plan_id", sql.Int, planId)
        .query(`
          INSERT INTO provider_plan_map (provider_id, plan_id)
          VALUES (@provider_id, @plan_id)
        `);
    }

    return res.json({ message: "Plans mapped successfully" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getProviderPlans = async (req, res) => {
  try {
    let { provider_id } = req.params;

    provider_id = Number(provider_id);

    if (!provider_id || isNaN(provider_id)) {
      return res.status(400).json({
        error: "Invalid provider_id. Must be a number."
      });
    }

    const pool = await poolPromise;

    const result = await pool.request()
      .input("provider_id", sql.Int, provider_id)
      .query(`
        SELECT plan_id
        FROM provider_plan_map
        WHERE provider_id = @provider_id
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("getProviderPlans ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.addMasterData = async (req, res) => {
  let pool;
  let safeTable;

  try {
    // const { masterName, value } = req.body;
    const  masterName  = req.body.master_name;
    const value = req.body.value.value;
    // console.log("req.body:", req.body);
    // console.log("masterName:", masterName, "value:", value);
    pool = await poolPromise;

    if (!masterName || !value) {
      return res.status(400).json({
        error: "masterName and value are required"
      });
    }

    // =========================
    // 1️⃣ GET MASTER KEY
    // =========================
    const keyRequest = pool.request();

    const keyResult = await keyRequest
      .input("masterName", masterName)
      .query(`
        SELECT master_key, master_name
        FROM masters
        WHERE master_name = @masterName
      `);

    const masterRow = keyResult.recordset[0];

    if (!masterRow) {
      return res.status(404).json({
        error: "Master not found"
      });
    }

    const masterKey = masterRow.master_key;

    // =========================
    // 2️⃣ SAFE TABLE NAME
    // =========================
    safeTable = masterName.replace(/[^a-zA-Z0-9_]/g, "");

    // =========================
    // 3️⃣ INSERT INTO MASTER TABLE
    // =========================
    const request = pool.request();

    request.input("value", value);

    const query = `
      INSERT INTO ${safeTable} (${masterKey})
      VALUES (@value)
    `;

    console.log("Executing:", query);

    await request.query(query);

    // =========================
    // 4️⃣ SUCCESS RESPONSE
    // =========================
    return res.status(201).json({
      message: "Master data inserted successfully",
      masterName,
      masterKey,
      value
    });

  } catch (err) {
    console.error("addMasterData Error:", err);

    return res.status(500).json({
      error: err.message
    });
  }
};
