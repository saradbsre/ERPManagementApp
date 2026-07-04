const { poolPromise } = require("../db/db");
const { auditLogger } = require("../utils/auditLogger");

/* ================= TYPE MAPPER ================= */
const mapDataType = (type, length) => {
  switch (type) {
    case "text":
      return `VARCHAR(${length || 255})`;
    case "number":
      return `INT`;
    case "date":
      return `DATE`;
    case "datetime":
      return `DATETIME`;
    case "bit":
      return `BIT`;
    default:
      return `VARCHAR(255)`;
  }
};

/* ================= MAIN PROCESS ================= */
exports.processModules = async () => {
  const pool = await poolPromise;

  try {

    // =========================================
    // 1. GET NON-CONVERTED MODULES
    // =========================================
    const modulesResult = await pool.request().query(`
      SELECT *
      FROM modules
      WHERE is_converted = 0
    `);

    const modules = modulesResult.recordset;

    if (!modules.length) {
      return "No modules to process";
    }

    // =========================================
    // 2. LOOP MODULES
    // =========================================
    for (const module of modules) {

      try {

        const tableName = module.module_name
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_");

        console.log("=================================");
        console.log("Processing module:", tableName);

        // =========================================
        // 3. FETCH MODULE COLUMNS
        // =========================================
        const columnsResult = await pool.request()
          .input("module_id", module.id)
          .query(`
            SELECT *
            FROM module_columns
            WHERE module_id = @module_id
          `);

        let columns = columnsResult.recordset;

        console.log("Columns fetched:", columns.length);

        if (!columns.length) {
          console.log("No columns found");
          continue;
        }

        // =========================================
        // 4. REMOVE DUPLICATE COLUMN NAMES
        // =========================================
        const seen = new Set();

        columns = columns.filter(col => {

          const name = col.column_name.toLowerCase();

          if (seen.has(name)) {
            console.log("Skipping duplicate:", name);
            return false;
          }

          seen.add(name);

          return true;
        });

        // =========================================
        // 5. CREATE TABLE WITH ONLY ID
        // =========================================
        const createSQL = `
          IF NOT EXISTS (
            SELECT *
            FROM sys.tables
            WHERE name = '${tableName}'
          )
          BEGIN
            CREATE TABLE [${tableName}] (
              id INT IDENTITY(1,1) PRIMARY KEY
            )
          END
        `;

        console.log("Creating base table if not exists");

        await pool.request().query(createSQL);

        // =========================================
        // 6. GET EXISTING COLUMNS
        // =========================================
        const existingColsResult = await pool.request().query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
        `);

        const existingCols = existingColsResult.recordset.map(
          c => c.COLUMN_NAME.toLowerCase()
        );

        console.log("Existing columns:", existingCols);

        // =========================================
        // 7. ADD DYNAMIC MODULE COLUMNS FIRST
        // =========================================
        for (const col of columns) {

          const colName = col.column_name.toLowerCase();

          if (existingCols.includes(colName)) {

            console.log(`Skipping existing column: ${col.column_name}`);

            continue;
          }

          const sqlType = mapDataType(
            col.data_type,
            col.length
          );

          const alterSQL = `
            ALTER TABLE [${tableName}]
            ADD [${col.column_name}] ${sqlType}
            ${col.can_edit ? "NULL" : "NOT NULL"}
          `;

          console.log("Adding column:", col.column_name);

          await pool.request().query(alterSQL);

          await auditLogger({
            pool,
            transaction_id: "MODULE_PROCESS",
            log_type: "INFO",
            module_name: tableName,
            action: "ADD_COLUMN",
            message: `Added column ${col.column_name}`,
            status: "SUCCESS",
            userid: "SYSTEM"
          });
        }

        // =========================================
        // 8. REFRESH COLUMN LIST
        // =========================================
        const refreshedColsResult = await pool.request().query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
        `);

        const refreshedCols = refreshedColsResult.recordset.map(
          c => c.COLUMN_NAME.toLowerCase()
        );

        // =========================================
        // 9. ADD SYSTEM COLUMNS LAST
        // =========================================
        const systemColumns = [

          {
            name: "is_active",
            sql: "BIT DEFAULT 1"
          },

          {
            name: "deleted",
            sql: "BIT DEFAULT 0"
          },

          {
            name: "created_at",
            sql: "DATETIME DEFAULT GETDATE()"
          },

          {
            name: "sysdate",
            sql: "DATETIME DEFAULT GETDATE()"
          },

          {
            name: "userid",
            sql: "NVARCHAR(30)"
          },

          {
            name: "audit_rev",
            sql: "INT DEFAULT 1"
          }

        ];

        for (const sysCol of systemColumns) {

          if (
            refreshedCols.includes(
              sysCol.name.toLowerCase()
            )
          ) {

            console.log(
              `Skipping system column: ${sysCol.name}`
            );

            continue;
          }

          const alterSQL = `
            ALTER TABLE [${tableName}]
            ADD [${sysCol.name}] ${sysCol.sql}
          `;

          console.log(
            "Adding system column:",
            sysCol.name
          );

          await pool.request().query(alterSQL);

          await auditLogger({
            pool,
            transaction_id: "MODULE_PROCESS",
            log_type: "INFO",
            module_name: tableName,
            action: "ADD_SYSTEM_COLUMN",
            message: `Added system column ${sysCol.name}`,
            status: "SUCCESS",
            userid: "SYSTEM"
          });
        }

        // =========================================
        // 10. MARK MODULE AS CONVERTED
        // =========================================
        await pool.request()
          .input("id", module.id)
          .query(`
            UPDATE modules
            SET is_converted = 1
            WHERE id = @id
          `);

        console.log(
          `Module processed successfully: ${tableName}`
        );

      } catch (moduleErr) {

        console.error(
          "Module error:",
          moduleErr.message
        );

        await auditLogger({
          pool,
          transaction_id: "MODULE_PROCESS",
          log_type: "ERROR",
          module_name: module.module_name,
          action: "PROCESS_MODULE",
          message: `Failed processing module`,
          status: "FAILED",
          error_message: moduleErr.message,
          userid: "SYSTEM"
        });
      }
    }

    // =========================================
    // 11. FINAL SUCCESS LOG
    // =========================================
    await auditLogger({
      pool,
      transaction_id: "MODULE_PROCESS",
      log_type: "INFO",
      module_name: "SYSTEM",
      action: "PROCESS_MODULES",
      message: "Processed modules successfully",
      status: "SUCCESS",
      userid: "SYSTEM"
    });

    return "Modules processed successfully";

  } catch (err) {

    console.error(
      "Fatal processModules error:",
      err.message
    );

    await auditLogger({
      pool,
      transaction_id: "MODULE_PROCESS",
      log_type: "ERROR",
      module_name: "SYSTEM",
      action: "PROCESS_MODULES",
      message: "Module processing failed",
      status: "FAILED",
      error_message: err.message,
      userid: "SYSTEM"
    });

    throw err;
  }
};