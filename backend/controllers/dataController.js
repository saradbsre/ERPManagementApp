
const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");

// GET /api/module-data/:module_id
exports.getModuleData = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { activeUserEmail } = req.query;
    const pool = await poolPromise;
    //console.log("Fetching data for module_id:", module_id, "activeUserEmail:", activeUserEmail); // Debug log

    // 🔥 Get module (to know table name)
    const moduleRes = await pool.request()
      .input("id", sql.Int, module_id)
      .query("SELECT module_name FROM modules WHERE id = @id");

    const tableName = moduleRes.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({ error: "Module not found" });
    }

    // 🔥 Fetch data dynamically
    const dataRes = await pool.request().query(`
      SELECT * FROM ${tableName}
      ORDER BY id DESC
    `);

    // audit log  
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: "FETCH_MODULE_DATA",
      message: `Fetched data for module ${tableName}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });


    res.json(dataRes.recordset);

  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "FETCH_MODULE_DATA",
        message: `Failed to fetch module data`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.createModuleRow = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { activeUserEmail } = req.query;
    const rowData = req.body;
    const pool = await poolPromise;
    // Get module to know table name
    const moduleRes = await pool.request()
      .input("id", sql.Int, module_id)
      .query("SELECT module_name FROM modules WHERE id = @id");
    const tableName = moduleRes.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({ error: "Module not found" });
    }

    // 🔥 Insert data dynamically
    const columns = Object.keys(rowData).join(", ");
    const values = Object.values(rowData).map(value => `'${value}'`).join(", ");
    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;

    await pool.request().query(query);

      // audit log
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: "CREATE_MODULE_ROW",
      message: `Created new row in module ${tableName}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    res.status(201).json({ message: "Row created successfully" });
  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "CREATE_MODULE_ROW",
        message: `Failed to create row for module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.updateModuleRow = async (req, res) => {
  try {
    const { module_id, row_id } = req.params;
    const { activeUserEmail } = req.query;
    const rowData = req.body;

    const pool = await poolPromise;

    // 1. Get table name
    const moduleRes = await pool.request()
      .input("id", sql.Int, module_id)
      .query("SELECT module_name FROM modules WHERE id = @id");

    const tableName = moduleRes.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({ error: "Module not found" });
    }

    // 2. Remove ID + unsafe fields
    delete rowData.id;

    // 3. Build SAFE SET clause
    const request = pool.request();
    request.input("row_id", sql.Int, row_id);

    const setClause = Object.keys(rowData)
      .map((key, index) => {
        const param = `p${index}`;
        request.input(param, rowData[key]);
        return `${key} = @${param}`;
      })
      .join(", ");

    // 4. Execute query safely
    const query = `
      UPDATE ${tableName}
      SET ${setClause}, userid = @activeUserEmail, audit_rev = ISNULL(audit_rev, 0) + 1
      WHERE id = @row_id
    `;

    await request.query(query);

    // audit log
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: "UPDATE_MODULE_ROW",
      message: `Updated row ${row_id} in module ${tableName}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    res.json({ message: "Row updated successfully" });

  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "UPDATE_MODULE_ROW",
        message: `Failed to update row ${row_id} in module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.deleteModuleRow = async (req, res) => {
  try {
    const { module_id, row_id } = req.params;
    const { activeUserEmail } = req.query;
    const pool = await poolPromise;
    // Get module to know table name
    const moduleRes = await pool.request()
      .input("id", sql.Int, module_id)
      .query("SELECT module_name FROM modules WHERE id = @id");
    const tableName = moduleRes.recordset[0]?.module_name;
    if (!tableName) {
      return res.status(404).json({ error: "Module not found" });
    }
    // 🔥 Delete data dynamically
    const query = `update ${tableName} set is_deleted = 1, userid = @activeUserEmail, audit_rev = ISNULL(audit_rev, 0) + 1 where id = @row_id`;
    const request = pool.request();
    request.input("row_id", sql.Int, row_id);
    request.input("activeUserEmail", sql.NVarChar, activeUserEmail);
    await request.query(query);

    // audit log
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: "DELETE_MODULE_ROW",
      message: `Deleted row ${row_id} in module ${tableName}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    res.json({ message: "Row deleted successfully" });
  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "DELETE_MODULE_ROW",
        message: `Failed to delete row ${row_id} in module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};
