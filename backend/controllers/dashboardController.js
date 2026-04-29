const { sql, poolPromise } = require("../db/db");
require("dotenv").config();



exports.getTopExpensiveAssets = async (req, res) => {
  try {
    const pool = await poolPromise;

    // 1. Get all modules
    const modules = await pool.request().query(`
      SELECT id, module_name, display_name
      FROM modules
    `);

    let finalResult = [];

    for (const module of modules.recordset) {
      const tableName = module.module_name;
      const displayName = module.display_name;

      // 2. Find cost columns for this module
      const columns = await pool.request()
        .input("module_id", module.id)
        .query(`
          SELECT column_name
          FROM module_columns
          WHERE module_id = @module_id
          AND LOWER(REPLACE(column_name, ' ', '_')) LIKE '%total_cost%'
        `);

      if (columns.recordset.length === 0) continue;

      const costColumn = columns.recordset[0].column_name;
      const cleanColumn = costColumn.replace(/["'`\[\]]/g).trim();
      // 3. Get TOP 5 per module

      const query = `
        SELECT TOP 5 
          '${tableName}' AS module_name, '${displayName}' AS module_display_name, *
        FROM [${tableName}]
        WHERE [${cleanColumn}] IS NOT NULL
        ORDER BY [${cleanColumn}] DESC
        
      `;
      //console.log("QUERY:", query);
      const data = await pool.request().query(query);

      //console.log(`Module: ${tableName}, Cost Column: ${costColumn}, Records: ${data.recordset.length}`);

      finalResult.push(...data.recordset);
    }
    res.json(finalResult);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.getAlertData = async (req, res) => {
  try {
    const pool = await poolPromise;

    const masters = await pool.request().query(`
      SELECT master_name 
      FROM masters
    `);

    const resultData = [];

    for (const row of masters.recordset) {
      const tableName = row.master_name;

      // 1. GET ALL DATE TYPE COLUMNS
      const dateColumnCheck = await pool.request().query(`
               SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        AND LOWER(COLUMN_NAME) LIKE '%date%' AND LOWER(COLUMN_NAME) NOT LIKE '%sysdate%' AND LOWER(COLUMN_NAME) NOT LIKE '%created%' AND LOWER(COLUMN_NAME) NOT LIKE '%updated%'
      `);

      //console.log(`Checking table: ${tableName}, Date Columns Found: ${dateColumnCheck.recordset.length}`);

      if (dateColumnCheck.recordset.length === 0) {
        continue;
      }

      const dateColumns = dateColumnCheck.recordset.map(
        (c) => c.COLUMN_NAME
      );
      //console.log(`Date columns for ${tableName}:`, dateColumns);

      // 2. FETCH DATA
      const dataQuery = await pool.request().query(`
        SELECT *
        FROM [${tableName}]
      `);

      const rows = dataQuery.recordset;

      if (!rows.length) continue;

       const today = new Date();
      today.setHours(0, 0, 0, 0);

      const next7Days = new Date();
      next7Days.setDate(today.getDate() + 7);
      next7Days.setHours(0, 0, 0, 0);

      // 6. COLLECT ALERTS FROM ALL DATE COLUMNS
      let allAlerts = [];

      for (let col of dateColumns) {
        const filteredRows = rows.filter((r) => {
          const val = r[col];
          if (!val) return false;

          const date = new Date(val);
          date.setHours(0, 0, 0, 0);

          return date >= today && date <= next7Days;
        });

        if (filteredRows.length > 0) {
          allAlerts.push({
            date_column: col,
            count: filteredRows.length,
            data: filteredRows
          });
        }
      }

      // 7. PUSH RESULT IF ALERTS FOUND
      if (allAlerts.length > 0) {
        resultData.push({
          master_name: tableName,
          alerts: allAlerts
        });
      }
    }

    // 8. RESPONSE
    res.json({
      success: true,
      total_masters: resultData.length,
      data: resultData
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


exports.getRecentTransactions = async (req, res) => {
  try {
    const pool = await poolPromise;

    const masters = await pool.request().query(`
      SELECT master_name 
      FROM masters
    `);

    const resultData = [];

    for (const row of masters.recordset) {
      const tableName = row.master_name;

      // 1. GET ALL DATE TYPE COLUMNS
      const dateColumnCheck = await pool.request().query(`
               SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
        AND LOWER(COLUMN_NAME) LIKE '%purchase%'
      `);

      //console.log(`Checking table: ${tableName}, Date Columns Found: ${dateColumnCheck.recordset.length}`);

      if (dateColumnCheck.recordset.length === 0) {
        continue;
      }

      const dateColumns = dateColumnCheck.recordset.map(
        (c) => c.COLUMN_NAME
      );
      console.log(`Date columns for ${tableName}:`, dateColumns);

      // 2. FETCH DATA
      const dataQuery = await pool.request().query(`
        SELECT *
        FROM [${tableName}]
      `);

       const rows = dataQuery.recordset;

      if (!rows.length) continue;

      // 5. DATE RANGE (LAST 30 DAYS)
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const last30Days = new Date();
      last30Days.setDate(today.getDate() - 30);
      last30Days.setHours(0, 0, 0, 0);

      let allAlerts = [];

      // 6. CHECK ALL DATE COLUMNS
      for (let col of dateColumns) {
        const filteredRows = rows
          .filter((r) => {
            const val = r[col];
            if (!val) return false;

            const date = new Date(val);
            date.setHours(0, 0, 0, 0);

            return date >= last30Days && date <= today;
          })
          // 🔥 SORT LATEST FIRST
          .sort((a, b) => new Date(b[col]) - new Date(a[col]))
          // 🔥 LIMIT FOR DASHBOARD
          .slice(0, 10);

        if (filteredRows.length > 0) {
          allAlerts.push({
            date_column: col,
            count: filteredRows.length,
            data: filteredRows
          });
        }
      }

      // 7. PUSH IF DATA EXISTS
      if (allAlerts.length > 0) {
        resultData.push({
          master_name: tableName,
          alerts: allAlerts
        });
      }
    }

    // 8. RESPONSE
    res.json({
      success: true,
      total_masters: resultData.length,
      data: resultData
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

