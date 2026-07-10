const { sql, poolPromise } = require("../db/db");
require("dotenv").config();



exports.getTopExpensiveAssets = async (req, res) => {
  try {
    const pool = await poolPromise;

    // =========================
    // CURRENT MONTH RANGE
    // =========================
    const today = new Date();

    const currentMonthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
//test
    const nextMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1
    );

    // =========================
    // GET MODULES
    // =========================
    const modules = await pool.request().query(`
      SELECT id, module_name, display_name
      FROM modules
    `);

    let finalResult = [];

    for (const module of modules.recordset) {

      const tableName = module.module_name;
      const displayName = module.display_name;

      // =========================
      // FIND COST COLUMN
      // =========================
      const columns = await pool.request()
        .input("module_id", module.id)
        .query(`
          SELECT column_name
          FROM module_columns
          WHERE module_id = @module_id
          AND LOWER(REPLACE(column_name, ' ', '_')) LIKE '%total_amount_aed%'
        `);

      // NO COST COLUMN
      if (columns.recordset.length === 0) {

        finalResult.push({
          module_name: tableName,
          module_display_name: displayName,
          count: 0,
          data: []
        });

        continue;
      }

      const costColumn = columns.recordset[0].column_name;
      const cleanCostColumn = costColumn
        .replace(/["'`\[\]]/g, '')
        .trim();

      // =========================
      // FIND DATE COLUMN
      // =========================
      const dateColumns = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
          AND LOWER(COLUMN_NAME) LIKE '%date%'
          AND LOWER(COLUMN_NAME) NOT LIKE '%created%'
          AND LOWER(COLUMN_NAME) NOT LIKE '%updated%'
          AND LOWER(COLUMN_NAME) NOT LIKE '%sysdate%'
      `);

      // NO DATE COLUMN
      if (dateColumns.recordset.length === 0) {

        finalResult.push({
          module_name: tableName,
          module_display_name: displayName,
          count: 0,
          data: []
        });

        continue;
      }

      const dateColumn = dateColumns.recordset[0].COLUMN_NAME;

      // =========================
      // GET TOP 5 CURRENT MONTH
      // =========================
      const query = `
        SELECT TOP 5
          *
        FROM [${tableName}]
        WHERE [${cleanCostColumn}] IS NOT NULL
          AND [${dateColumn}] >= @currentMonthStart
          AND [${dateColumn}] < @nextMonthStart
          AND deleted <> 1
        ORDER BY TRY_CAST([${cleanCostColumn}] AS FLOAT) DESC
      `;

      const data = await pool.request()
        .input("currentMonthStart", currentMonthStart)
        .input("nextMonthStart", nextMonthStart)
        .query(query);

      // ALWAYS PUSH MODULE
      finalResult.push({
        module_name: tableName,
        module_display_name: displayName,
        count: data.recordset.length,
        data: data.recordset
      });
    }

    res.json({
      success: true,
      total_modules: finalResult.length,
      data: finalResult
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    });

  }
};


exports.getAlertData = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
  SELECT *
  FROM tbl_payment_transactions
  WHERE expiry_date IS NOT NULL
    AND CAST(expiry_date AS DATE) BETWEEN
        CAST(GETDATE() AS DATE)
        AND DATEADD(DAY, 7, CAST(GETDATE() AS DATE))
  ORDER BY expiry_date ASC
`);

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset
    });

  } catch (err) {
    console.error("getAlertData error:", err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


exports.getRecentTransactions = async (req, res) => {
  try {
    const pool = await poolPromise;

    // =========================
    // GET ACTIVE MODULES
    // =========================
    const modules = await pool.request().query(`
      SELECT
        id,
        module_name,
        display_name
      FROM modules
      WHERE is_active = 1
    `);

    const resultData = [];

    // =========================
    // LOOP MODULES
    // =========================
    for (const moduleRow of modules.recordset) {
      const moduleId = moduleRow.id;
      const tableName = moduleRow.module_name;
      const displayName = moduleRow.display_name;

      try {
        // =========================
        // GET MASTER COLUMNS
        // =========================
        const masterColumns = await pool.request().query(`
          SELECT
            column_name,
            display_name,
            master
          FROM module_columns
          WHERE module_id = ${moduleId}
            AND ISNULL(master, '') <> ''
        `);

        const masterList = masterColumns.recordset || [];

        // =========================
        // CHECK DATE COLUMN EXISTS
        // =========================
        const dateColumnCheck = await pool.request().query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
            AND LOWER(COLUMN_NAME) = 'date'
        `);

        if (dateColumnCheck.recordset.length === 0) {
          continue;
        }

        // =========================
        // GET LAST 30 DAYS DATA
        // =========================
        const recentData = await pool.request().query(`
          SELECT *
          FROM [${tableName}]
          WHERE ISNULL(deleted, 0) <> 1
            AND [date] >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
            AND [date] <= GETDATE()
          ORDER BY [date] DESC
        `);

        const records = recentData.recordset || [];

        if (records.length === 0) {
          continue;
        }

        // =========================
        // RESPONSE OBJECT
        // =========================
        resultData.push({
          module_id: moduleId,
          module_name: tableName,
          display_name: displayName,

          // Masters configured in module_columns
          master_list: masterList,

          alerts: [
            {
              date_column: "date",
              count: records.length,
              data: records,
            },
          ],
        });
      } catch (tableErr) {
        console.error(
          `Error processing table ${tableName}:`,
          tableErr.message
        );
      }
    }

    // =========================
    // RESPONSE
    // =========================
    res.json({
      success: true,
      total_modules: resultData.length,
      data: resultData,
    });

  } catch (err) {
    console.error("getRecentTransactions Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

