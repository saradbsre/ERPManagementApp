
const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const { resolveCol } = require("../utils/resolveCol");
const loadMaster = require("../utils/loadMaster");


exports.getDisplayname = async (req, res) => {
  let pool;

  try {
    const { module_id } = 12;

    pool = await poolPromise;

    const request = pool.request();

    let query = `
      SELECT column_name, display_name
      FROM module_columns
      WHERE column_name IS NOT NULL
    `;

    if (module_id) {
      request.input("module_id", module_id);
      query += " AND module_id = @module_id";
    }

    const result = await request.query(query);

    return res.json(result.recordset || []);

  } catch (err) {
    console.error("getDisplayname error:", err);
    return res.status(500).json({
      error: err.message
    });
  }
};

// GET /api/module-data/:module_id
exports.getModuleData = async (req, res) => {
  let pool;

  try {
    const { module_id } = req.params;

    const {
      activeUserEmail,
      search,
      dateFilters,
      userRole,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // MODULE INFO
    // =========================
    const moduleRes = await pool.request()
      .input("id", sql.Int, module_id)
      .query("SELECT module_name FROM modules WHERE id = @id");

    const tableName = moduleRes.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({ error: "Module not found" });
    }

    // =========================
    // ALLOWED COLUMNS
    // =========================
    const allowedColumnsRes = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${tableName}'
    `);

    const allowedColumns = allowedColumnsRes.recordset.map(r => r.COLUMN_NAME);

    // =========================
    // WHERE BUILD
    // =========================
    let whereClauses = [`(deleted <> 1 OR deleted IS NULL)`];
    const request = pool.request();

    if (
      activeUserEmail &&
      allowedColumns.includes("userid") &&
      String(userRole || "").toLowerCase() !== "admin"
    ) {
      request.input("activeUserEmail", sql.VarChar, activeUserEmail);
      whereClauses.push(`userid = @activeUserEmail`);
    }

    // =========================
    // SEARCH
    // =========================
    if (search) {
      const searchConditions = allowedColumns
        .filter(col => col && !col.toLowerCase().includes("id"))
        .map((col, idx) => {
          const key = `search_${idx}`;
          request.input(key, sql.VarChar, `%${search}%`);
          return `CAST(${col} AS VARCHAR) LIKE @${key}`;
        });

      if (searchConditions.length) {
        whereClauses.push(`(${searchConditions.join(" OR ")})`);
      }
    }

    // =========================
    // DATE FILTER
    // =========================
    let parsedDateFilters = {};

    try {
      parsedDateFilters =
        typeof dateFilters === "string"
          ? JSON.parse(dateFilters)
          : dateFilters || {};
    } catch {
      parsedDateFilters = {};
    }

    Object.entries(parsedDateFilters).forEach(([column, range], idx) => {
      if (!allowedColumns.includes(column)) return;

      if (range?.startDate && range?.endDate) {
        const startKey = `start_${idx}`;
        const endKey = `end_${idx}`;

        request.input(startKey, sql.DateTime, range.startDate);
        request.input(endKey, sql.DateTime, range.endDate);

        whereClauses.push(`
          (${column} BETWEEN @${startKey} AND @${endKey})
        `);
      }
    });

    // =========================
    // MASTER FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch {
      parsedFilters = [];
    }

    parsedFilters.forEach((f, idx) => {
      const { pk, values } = f;

      if (!pk || !values?.length) return;
      if (!allowedColumns.includes(pk)) return;

      const params = values.map((val, i) => {
        const key = `f_${idx}_${i}`;
        request.input(key, sql.VarChar, val);
        return `@${key}`;
      });

      whereClauses.push(`${pk} IN (${params.join(",")})`);
    });

    // =========================
    // MAIN QUERY
    // =========================
    const finalQuery = `
      SELECT * 
      FROM ${tableName}
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY date DESC
    `;

    const dataRes = await request.query(finalQuery);
    let rows = dataRes.recordset;

    // =========================
    // MASTER LOOKUPS (FAST)
    // =========================
    const sectionColsRes = await pool.request()
      .input("module_id", sql.Int, module_id)
      .query(`
        SELECT column_name, master
        FROM module_columns
        WHERE module_id = @module_id
          AND is_active = 1
          AND master IS NOT NULL
      `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    // 🔥 FAST PARALLEL LOADING
    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          m => m.master_name === col.master
        );

        if (!masterDef) return;

        const { lookup } = await loadMaster(
          pool,
          col.master,
          masterDef.master_key
        );

        lookupMaps[col.column_name] = lookup;
      })
    );

    // =========================
    // APPLY LOOKUP
    // =========================
    rows = rows.map(row => {
      const newRow = { ...row };

      for (const [col, lookup] of Object.entries(lookupMaps)) {
        const code = row[col];
        if (code != null && lookup?.[code]) {
          newRow[col] = lookup[code];
        }
      }

      return newRow;
    });

    return res.json(rows);

  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.createModuleRow = async (req, res) => {
  let pool;

  try {
    const { module_id } = req.params;
    const { activeUserEmail } = req.query;
    // console.log("mail id:", activeUserEmail);
    // console.log("req.query:", req.query);
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
// Add userid manually
rowData.userid = activeUserEmail;

Object.keys(rowData).forEach(key => {
  if (rowData[key] === "" || rowData[key] === undefined) {
    rowData[key] = null;
  }
});

// Build dynamic query
    const columns = Object.keys(rowData).join(", ");

    const values = Object.values(rowData)
      .map(value => value === null || value === undefined
        ? "NULL"
        : `'${value}'`)
      .join(", ");

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
    console.log("Executing query:", query);
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
    console.error("Create error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateModuleRow = async (req, res) => {
  let pool;
  try {
    const { module_id, row_id } = req.params;
    const { activeUserEmail } = req.query;
    const rowData = req.body;
    console.log("mail id:", activeUserEmail);
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
    request.input("activeUserEmail", sql.NVarChar, activeUserEmail);

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
  SET 
    ${setClause},
    userid = @activeUserEmail,
    sysdate = GETDATE(),
    audit_rev = ISNULL(audit_rev, 0) + 1
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
    console.error("Update error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.cancelModuleRow = async (req, res) => {
  let pool;
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
    const query = `update ${tableName} set is_active = 0, userid = @activeUserEmail, sysdate = GETDATE(), audit_rev = ISNULL(audit_rev, 0) + 1 where id = @row_id`;
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
      action: "CANCEL_MODULE_ROW",
      message: `Cancelled row ${row_id} in module ${tableName}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    res.json({ message: "Row cancelled successfully" });
  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "CANCEL_MODULE_ROW",
        message: `Failed to cancel row ${row_id} in module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.undoCancelModuleRow = async (req, res) => {
  let pool;
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
    // 🔥 Undo cancel data dynamically
    const query = `update ${tableName} set is_active = 1, userid = @activeUserEmail, sysdate = GETDATE(), audit_rev = ISNULL(audit_rev, 0) + 1 where id = @row_id`;
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
      action: "UNDO_CANCEL_MODULE_ROW",
      message: `Undid cancel for row ${row_id} in module ${tableName}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    res.json({ message: "Row undo cancel successfully" });
  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "UNDO_CANCEL_MODULE_ROW",
        message: `Failed to undo cancel for row ${row_id} in module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.deleteModuleRow = async (req, res) => {
  let pool;
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
    const query = `update ${tableName} set deleted = 1, userid = @activeUserEmail, sysdate = GETDATE(), audit_rev = ISNULL(audit_rev, 0) + 1 where id = @row_id`;
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

exports.upsertSavedFilter = async (req, res) => {
  let pool;

  try {
    const {
      id,
      filterName,
      filterData,
      userId,
      module_id
    } = req.body;
    
    pool = await poolPromise;

    const request = pool.request();

    request.input("id", sql.Int, id || null);
    request.input("filter_name", sql.VarChar(150), filterName || null);
    request.input("filters", sql.NVarChar(sql.MAX), JSON.stringify(filterData || {}));
    request.input("userid", sql.VarChar(100), userId || "UNKNOWN");
    request.input("module_id", sql.Int, module_id || null);

    const query = `
      IF EXISTS (SELECT 1 FROM saved_filters WHERE id = @id)
      BEGIN
          UPDATE saved_filters
          SET 
              filter_name = @filter_name,
              filters = @filters,
              userid = @userid,
              module_id = @module_id,
              updated_at = GETDATE(),
              audit_rev = ISNULL(audit_rev, 0) + 1
          WHERE id = @id;
      END
      ELSE
      BEGIN
          INSERT INTO saved_filters (
              filter_name,
              filters,
              userid,
              module_id,
              sysdate,
              updated_at,
              audit_rev
          )
          VALUES (
              @filter_name,
              @filters,
              @userid,
              @module_id,
              GETDATE(),
              GETDATE(),
              1
          );
      END
    `;

    await request.query(query);

    // ✅ SAFE AUDIT LOG FIX
    await auditLogger({
      pool,
      transaction_id: String(userId || "UNKNOWN"), // 🔥 FIX HERE
      log_type: "INFO",
      module_name: "saved_filters",
      action: id ? "UPDATE_FILTER" : "CREATE_FILTER",
      message: id
        ? `Updated filter ${id}`
        : `Created new filter`,
      status: "SUCCESS",
      userid: String(userId || "UNKNOWN")
    });

    res.json({
      message: id ? "Updated successfully" : "Created successfully"
    });

  } catch (err) {
    console.error("upsertSavedFilter error:", err);

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: "UNKNOWN",
        log_type: "ERROR",
        module_name: "saved_filters",
        action: "UPSERT_FILTER",
        message: "Failed upsert filter",
        status: "FAILED",
        error_message: err.message,
        userid: "UNKNOWN"
      });
    }

    res.status(500).json({ error: err.message });
  }
};

exports.getCustomizedColumns = async (req, res) => {
  let pool;

  try {
    const {
      module_id,
      report_id,
      user_id
    } = req.query;

    pool = await poolPromise;
    const request = pool.request();

    const result = await request
      .input("module_id", sql.Int, module_id || null)
      .input("report_id", sql.Int, report_id || null)
      .input("user_id", sql.NVarChar, user_id)
      .query(`
        SELECT TOP 1 *
        FROM customized_table_columns
        WHERE 
          (
            (module_id = @module_id) OR 
            (module_id IS NULL AND @module_id IS NULL)
          )
          AND (
            (report_id = @report_id) OR 
            (report_id IS NULL AND @report_id IS NULL)
          )
          AND user_id = @user_id
        ORDER BY audit_rev DESC
      `);

    const data = result.recordset[0];

    if (data?.columns) {
      data.columns = JSON.parse(data.columns);
    }

    res.json({
      success: true,
      data: data || null
    });

  } catch (err) {
    console.error("getCustomizedColumns error:", err);

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.upsertCustomizedColumns = async (req, res) => {
  let pool;

  try {
    const {
      module_id,
      report_id,
      user_id,
      columns
    } = req.body;

    pool = await poolPromise;

    const request = pool.request();

    // =========================
    // CHECK EXISTING BY BUSINESS KEY
    // =========================
    const existing = await request
      .input("module_id", sql.Int, module_id || null)
      .input("report_id", sql.Int, report_id || null)
      .input("user_id", sql.NVarChar, user_id)
      .query(`
        SELECT TOP 1
          id,
          audit_rev,
          columns
        FROM customized_table_columns
        WHERE user_id = @user_id
          AND module_id = @module_id
          AND (
            report_id = @report_id
            OR (report_id IS NULL AND @report_id IS NULL)
          )
      `);

    // =========================
    // MERGE EXISTING + INCOMING
    // =========================
    let mergedColumns = columns;

    if (existing.recordset.length > 0) {
      let existingColumns = {};

      try {
        existingColumns = JSON.parse(
          existing.recordset[0].columns || "{}"
        );
      } catch {
        existingColumns = {};
      }

      mergedColumns = {
        ...existingColumns,
        ...columns,
      };
    }

    // =========================
    // UPDATE
    // =========================
    if (existing.recordset.length > 0) {
      await pool.request()
        .input("user_id", sql.NVarChar, user_id)
        .input("module_id", sql.Int, module_id || null)
        .input("report_id", sql.Int, report_id || null)
        .input(
          "columns",
          sql.NVarChar(sql.MAX),
          JSON.stringify(mergedColumns)
        )
        .input(
          "audit_rev",
          sql.Int,
          existing.recordset[0].audit_rev + 1
        )
        .query(`
          UPDATE customized_table_columns
          SET
            columns = @columns,
            audit_rev = @audit_rev,
            sysdate = GETDATE()
          WHERE user_id = @user_id
            AND module_id = @module_id
            AND (
              report_id = @report_id
              OR (report_id IS NULL AND @report_id IS NULL)
            )
        `);
    }

    // =========================
    // INSERT
    // =========================
    else {
      await pool.request()
        .input("module_id", sql.Int, module_id || null)
        .input("report_id", sql.Int, report_id || null)
        .input("user_id", sql.NVarChar, user_id)
        .input(
          "columns",
          sql.NVarChar(sql.MAX),
          JSON.stringify(mergedColumns)
        )
        .query(`
          INSERT INTO customized_table_columns (
            module_id,
            report_id,
            user_id,
            columns,
            audit_rev,
            sysdate
          )
          VALUES (
            @module_id,
            @report_id,
            @user_id,
            @columns,
            1,
            GETDATE()
          )
        `);
    }

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: String(user_id || "UNKNOWN"),
      log_type: "INFO",
      module_name: "customized_table_columns",
      action: "UPSERT_COLUMNS",
      message: "Columns saved",
      status: "SUCCESS",
      userid: String(user_id || "UNKNOWN")
    });

    res.json({
      success: true,
      message: "Saved successfully",
      data: mergedColumns
    });

  } catch (err) {
    console.error("upsertCustomizedColumns error:", err);

    if (pool) {
      await auditLogger({
        pool,
        transaction_id: "UNKNOWN",
        log_type: "ERROR",
        module_name: "customized_table_columns",
        action: "UPSERT_COLUMNS",
        message: "Failed saving columns",
        status: "FAILED",
        error_message: err.message,
        userid: "UNKNOWN"
      });
    }

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};