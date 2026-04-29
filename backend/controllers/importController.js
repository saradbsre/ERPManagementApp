const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { sql, poolPromise } = require("../db/db");
const { auditLogger } = require("../utils/auditLogger");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

exports.exportColumnNames = async (req, res) => {
  try {
    const { module_id } = req.params;
    const pool = await poolPromise;

    const moduleResult = await pool.request()
      .input("id", sql.Int, module_id)
      .query(`
        SELECT module_name
        FROM modules
        WHERE id = @id
      `);

    const tableName = moduleResult.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({ message: "Module not found" });
    }

    const excluded = [
      "id",
      "is_active",
      "created_at",
      "sysdate",
      "userid",
      "audit_rev"
    ];

    const columnResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
      AND COLUMN_NAME NOT IN ('${excluded.join("','")}')
    `);

    const columns = columnResult.recordset.map(c => c.COLUMN_NAME);

    const worksheet = XLSX.utils.aoa_to_sheet([columns]);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${tableName}_template.xlsx`
    );

    // audit log
    await auditLogger({
      pool,
      transaction_id: req.user?.email || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: "EXPORT_COLUMN_NAMES",
      message: `Exported column names for module ${tableName}`,
      status: "SUCCESS",
      userid: req.user?.email || "UNKNOWN"
    });

    res.send(buffer);

  } catch (err) {
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "EXPORT_COLUMN_NAMES",
        message: `Failed to export column names for module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.user?.email || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};


exports.importTable = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { userid } = req.body;

    const pool = await poolPromise;

    // ================= 1️⃣ GET TABLE NAME =================
    const moduleResult = await pool.request()
      .input("id", sql.Int, module_id)
      .query(`
        SELECT module_name
        FROM modules
        WHERE id = @id
      `);

    const tableName = moduleResult.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({ message: "Module not found" });
    }

    // ================= 2️⃣ READ EXCEL =================
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({ message: "Empty file" });
    }

    // ================= 3️⃣ GET COLUMN + TYPE =================
    const excluded = [
      "id",
      "is_active",
      "created_at",
      "sysdate",
      "userid",
      "audit_rev"
    ];

    const columnResult = await pool.request()
      .input("table", sql.NVarChar, tableName)
      .query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @table
        AND COLUMN_NAME NOT IN ('${excluded.join("','")}')
        ORDER BY ORDINAL_POSITION
      `);

    const columns = columnResult.recordset.map(c => ({
      name: c.COLUMN_NAME,
      type: c.DATA_TYPE
    }));

    // ================= 4️⃣ INSERT DATA =================
    for (const row of data) {

      const request = pool.request();

      let insertCols = [];
      let insertVals = [];

      for (const col of columns) {

        let value = row[col.name] ?? null;

        // 🔥 TYPE HANDLING
        switch (col.type) {

          case "int":
            value = value ? parseInt(value) : null;
            request.input(col.name, sql.Int, value);
            break;

          case "decimal":
          case "numeric":
            value = value
              ? parseFloat(value.toString().replace(/,/g, ""))
              : null;
            request.input(col.name, sql.Decimal(18, 2), value);
            break;

          case "float":
            value = value ? parseFloat(value) : null;
            request.input(col.name, sql.Float, value);
            break;

          case "datetime":
          case "date":
            request.input(
              col.name,
              sql.DateTime,
              value ? new Date(value) : null
            );
            break;

          case "bit":
            request.input(col.name, sql.Bit, value ? 1 : 0);
            break;

          default:
            request.input(col.name, sql.NVarChar(sql.MAX), value);
        }

        insertCols.push(col.name);
        insertVals.push(`@${col.name}`);
      }

      // ================= ADD DEFAULT FIELDS =================
      request.input("userid", sql.NVarChar(50), userid);

      insertCols.push("userid", "is_active", "created_at", "sysdate", "audit_rev");
      insertVals.push("@userid", "1", "GETDATE()", "GETDATE()", "1");

      // ================= EXECUTE INSERT =================
      await request.query(`
        INSERT INTO ${tableName} (${insertCols.join(",")})
        VALUES (${insertVals.join(",")})
      `);
    }
    
    // audit log
    await auditLogger({
      pool,
      transaction_id: req.user?.email || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: "IMPORT_TABLE",
      message: `Imported data into module ${tableName}`,
      status: "SUCCESS",
      userid: req.user?.email || "UNKNOWN"
    });
    res.json({ message: "Import successful ✅" });

  } catch (err) {
    console.error(err);
    // audit log
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.user?.email || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: "IMPORT_TABLE",
        message: `Failed to import table for module ${tableName}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.user?.email || "UNKNOWN"
      });
    }
    res.status(500).json({ error: err.message });
  }
};
