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
    const modulesResult = await pool.request().query(`
      SELECT * FROM modules WHERE is_converted = 0
    `);

    const modules = modulesResult.recordset;

    if (!modules.length) return "No modules to process";

    for (const module of modules) {
      try {
        const tableName = `${module.module_name
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")}`;

        // 1. Get module columns
        const columnsResult = await pool.request()
          .input("module_id", module.id)
          .query(`
            SELECT * FROM module_columns WHERE module_id = @module_id
          `);

        const columns = columnsResult.recordset;
        if (!columns.length) continue;

        // 2. Get existing DB columns
        const existingColsResult = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}'
        `);

        const existingCols = existingColsResult.recordset.map(
          c => c.COLUMN_NAME.toLowerCase()
        );

        // 3. CREATE TABLE (only if not exists)
        const columnDefs = columns.map(col => {
          const sqlType = mapDataType(col.data_type, col.length);
          return `[${col.column_name}] ${sqlType} ${
            col.can_edit ? "NULL" : "NOT NULL"
          }`;
        });

        const createSQL = `
          IF NOT EXISTS (
            SELECT * FROM sys.tables WHERE name = '${tableName}'
          )
          BEGIN
            CREATE TABLE ${tableName} (
              id INT IDENTITY(1,1) PRIMARY KEY,
              ${columnDefs.join(",\n")},
              is_active BIT DEFAULT 1,
              deleted BIT DEFAULT 0,
              created_at DATETIME DEFAULT GETDATE(),
              sysdate DATETIME DEFAULT GETDATE(),
              userid NVARCHAR(30),
              audit_rev INT DEFAULT 1
            )
          END
        `;

        await pool.request().query(createSQL);

        await auditLogger({
          pool,
          transaction_id: "MODULE_PROCESS",
          log_type: "INFO",
          module_name: "sections",
          action: "CREATE_TABLE_CHECK",
          message: `Checked/created table ${tableName}`,
          status: "SUCCESS",
          userid: "SYSTEM"
        });

        // 4. ADD NEW COLUMNS (🔥 IMPORTANT PART)
        const missingColumns = columns.filter(
          c => !existingCols.includes(c.column_name.toLowerCase())
        );

        for (const col of missingColumns) {
          const sqlType = mapDataType(col.data_type, col.length);

          const alterSQL = `
            ALTER TABLE ${tableName}
            ADD [${col.column_name}] ${sqlType} ${
              col.can_edit ? "NULL" : "NOT NULL"
            }
          `;

          await pool.request().query(alterSQL);

          await auditLogger({
            pool,
            transaction_id: "MODULE_PROCESS",
            log_type: "INFO",
            module_name: "sections",
            action: "ADD_COLUMN",
            message: `Added column ${col.column_name} in ${tableName}`,
            status: "SUCCESS",
            userid: "SYSTEM"
          });
        }

        // 5. Mark module converted
        await pool.request()
          .input("id", module.id)
          .query(`
            UPDATE modules
            SET is_converted = 1
            WHERE id = @id
          `);

      } catch (moduleErr) {
        await auditLogger({
          pool,
          transaction_id: "MODULE_PROCESS",
          log_type: "ERROR",
          module_name: "sections",
          action: "PROCESS_MODULE",
          message: `Failed module ${module.module_name}`,
          status: "FAILED",
          error_message: moduleErr.message,
          userid: "SYSTEM"
        });

        console.error("Module error:", moduleErr.message);
      }
    }

    await auditLogger({
      pool,
      transaction_id: "MODULE_PROCESS",
      log_type: "INFO",
      module_name: "sections",
      action: "PROCESS_MODULES",
      message: `Processed modules successfully`,
      status: "SUCCESS",
      userid: "SYSTEM"
    });

    return "Modules processed successfully";

  } catch (err) {
    await auditLogger({
      pool,
      transaction_id: "MODULE_PROCESS",
      log_type: "ERROR",
      module_name: "sections",
      action: "PROCESS_MODULES",
      message: "Module processing failed",
      status: "FAILED",
      error_message: err.message,
      userid: "SYSTEM"
    });

    throw err;
  }
};