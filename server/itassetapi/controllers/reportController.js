const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");
const loadMaster = require("../utils/loadMaster");

exports.getReportFilters = async (req, res) => {
  let pool;

  try {
    const { activeUserEmail } = req.query;
    // console.log("activeUserEmail:", activeUserEmail);
    pool = await poolPromise;

    const request = pool.request();

    // optional: filter by user (recommended)
    if (activeUserEmail) {
      request.input("userid", sql.VarChar(100), activeUserEmail);
    }

    const query = activeUserEmail
      ? `SELECT * FROM saved_filters WHERE userid = @userid ORDER BY updated_at DESC`
      : `SELECT * FROM saved_filters ORDER BY updated_at DESC`;

    const result = await request.query(query);

    // ✅ AUDIT LOG SUCCESS
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "report_filters",
      action: "GET_REPORT_FILTERS",
      message: `Fetched report filters ${
        activeUserEmail ? `for user ${activeUserEmail}` : ""
      }`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching report filters:", err);

    // ❗ AUDIT LOG ERROR
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "report_filters",
        action: "GET_REPORT_FILTERS",
        message: "Failed to fetch report filters",
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    }

    res.status(500).json({
      error: "Failed to fetch report filters"
    });
  }
};

exports.getFilteredReports = async (req, res) => {
  let pool;

  try {
    const {
      module_id,
      filters = [],
      search = "",
      dateFilters = {}
    } = req.body;

    pool = await poolPromise;

    // =====================================
    // GET MODULE TABLE NAME
    // =====================================
    const moduleRes = await pool.request()
      .input("module_id", sql.Int, module_id)
      .query(`
        SELECT module_name
        FROM modules
        WHERE id = @module_id
      `);

    const tableName = moduleRes.recordset[0]?.module_name;

    if (!tableName) {
      return res.status(404).json({
        error: "Module not found"
      });
    }

    // =====================================
    // SAFETY CHECK
    // =====================================
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({
        error: "Invalid table name"
      });
    }

    // =====================================
    // GET COLUMN MAPPING
    // =====================================
    const columnRes = await pool.request()
      .input("module_id", sql.Int, module_id)
      .query(`
        SELECT
          column_name,
          master,
          data_type
        FROM module_columns
        WHERE module_id = @module_id
      `);

    const columnMap = {};

    columnRes.recordset.forEach(col => {
      if (col.master) {
        columnMap[col.master] = col.column_name;
      }
    });

    let where = [];

    // =====================================
    // FILTERS
    // =====================================
    filters.forEach(filter => {

      const column = columnMap[filter.master];

      if (column && filter.values?.length) {

        const values = filter.values
          .map(v => `'${String(v).replace(/'/g, "''")}'`)
          .join(",");

        where.push(`${column} IN (${values})`);
      }

    });

    // =====================================
    // SEARCH
    // =====================================
    if (search) {

      const safeSearch = search.replace(/'/g, "''");

      const searchConditions = Object.values(columnMap)
        .map(col => `${col} LIKE '%${safeSearch}%'`)
        .join(" OR ");

      where.push(`(${searchConditions})`);
    }

    // =====================================
    // DATE FILTER
    // =====================================
    if (
      dateFilters?.startDate &&
      dateFilters?.endDate
    ) {

      where.push(`
        CAST([date] AS DATE)
        BETWEEN '${dateFilters.startDate}'
        AND '${dateFilters.endDate}'
      `);

    }

    where.push("deleted = 0");

    const whereClause =
      where.length > 0
        ? `WHERE ${where.join(" AND ")}`
        : "";

    // =====================================
    // FINAL QUERY
    // =====================================
    const finalQuery = `
      SELECT *
      FROM ${tableName}
      ${whereClause}
      ORDER BY id DESC
    `;

    console.log("Final report query:", finalQuery);

    const result = await pool.request().query(finalQuery);

    let rows = result.recordset;

    // =====================================
    // GET MODULE MASTER COLUMNS
    // =====================================
    const sectionColsRes = await pool.request()
      .input("module_id", sql.Int, module_id)
      .query(`
        SELECT
          column_name,
          master
        FROM module_columns
        WHERE module_id = @module_id
          AND is_active = 1
          AND master IS NOT NULL
      `);

    const sectionColumns = sectionColsRes.recordset;

    // =====================================
    // GET MASTER DEFINITIONS
    // =====================================
    const mastersRes = await pool.request().query(`
      SELECT
        master_name,
        master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    // =====================================
    // BUILD LOOKUP MAPS
    // =====================================
    const lookupMaps = {};

    for (const sectionCol of sectionColumns) {

      const masterName = sectionCol.master;

      const masterDef = masterDefinitions.find(
        m => m.master_name === masterName
      );

      if (!masterDef) continue;

      try {

        const masterRes = await pool.request().query(`
          SELECT *
          FROM ${masterName}
          WHERE is_active = 1
        `);

        const displayColumn = masterDef.master_key;

        const lookup = {};

        masterRes.recordset.forEach(row => {

          const codeColumn = Object.keys(row).find(
            key => key.toLowerCase().endsWith("_code")
          );

          if (!codeColumn) return;

          lookup[row[codeColumn]] = row[displayColumn];

        });

        lookupMaps[sectionCol.column_name] = lookup;

      } catch (err) {

        console.log(
          `Lookup failed for master ${masterName}`,
          err.message
        );

      }
    }

    // =====================================
    // REPLACE CODES WITH DISPLAY VALUES
    // =====================================
    rows = rows.map(row => {

      const newRow = { ...row };

      Object.entries(lookupMaps).forEach(
        ([columnName, lookup]) => {

          const code = row[columnName];

          if (
            code !== null &&
            code !== undefined &&
            lookup?.[code]
          ) {
            newRow[columnName] = lookup[code];
          }

        }
      );

      return newRow;

    });

    // =====================================
    // RESPONSE
    // =====================================
    res.json(rows);

  } catch (err) {

    console.error(
      "Filter query error:",
      err
    );

    res.status(500).json({
      error: err.message
    });

  }
};

exports.getReportMenu = async (req, res) => {
  let pool;

  try {
    pool = await poolPromise;

    const result = await pool.request().query(
      `SELECT * FROM reports where is_active = 1 ORDER BY report_id ASC`
    );

    res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching report menu:", err);

    res.status(500).json({
      error: "Failed to fetch report menu"
    });
  }
};

exports.getCompanyWiseReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      reportType = "summary",
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);
      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    // =========================
    // BUILD REQUEST
    // =========================
    let result;

    // =========================
    // DETAILED REPORT (NO SP)
    // =========================
    if (reportType === "detailed") {

      const request = pool.request();

      let where = `
        WHERE ISNULL(deleted,0) = 0
        AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
      `;

      if (startDate) {
        request.input("StartDate", startDate);
      } else {
        request.input("StartDate", null);
      }

      if (endDate) {
        request.input("EndDate", endDate);
      } else {
        request.input("EndDate", null);
      }

      // dynamic filters
      parsedFilters.forEach((f, i) => {
        if (!f.pk || !f.values?.length) return;

        const params = f.values.map((v, j) => {
          const key = `f_${i}_${j}`;
          request.input(key, v);
          return `@${key}`;
        });

        where += ` AND ${f.pk} IN (${params.join(",")})`;
      });

      result = await request.query(`
        SELECT
            date,
            com_code ,
            vend_code,
            prd_code ,
            dep_code,
            dv_code,
            billcycle_code,
            remarks,
            curr_code,
            total_amount,
            total_amount_aed
        FROM tbl_payment_transactions
        ${where}
        ORDER BY com_code
      `);
    }

    // =========================
    // SUMMARY REPORT
    // =========================
    else {

      const request = pool.request();

      let where = `WHERE ISNULL(deleted,0)=0`;

      if (startDate) {
        request.input("StartDate", startDate);
        where += " AND CAST([date] AS DATE) >= @StartDate";
      }

      if (endDate) {
        request.input("EndDate", endDate);
        where += " AND CAST([date] AS DATE) <= @EndDate";
      }

      parsedFilters.forEach((f, i) => {
        if (!f.pk || !f.values?.length) return;

        const params = f.values.map((v, j) => {
          const key = `f_${i}_${j}`;
          request.input(key, v);
          return `@${key}`;
        });

        where += ` AND ${f.pk} IN (${params.join(",")})`;
      });

      result = await request.query(`
        SELECT
            com_code,
            SUM(total_amount_aed) AS Total_Amount_AED
        FROM tbl_payment_transactions
        ${where}
        GROUP BY com_code
        ORDER BY com_code
      `);
    }

    let rows = result.recordset || [];

    // =========================
    // MASTER CONFIG
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    // =========================
    // LOAD MASTER LOOKUPS
    // =========================
    const lookupMaps = {};

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
    // REPLACE CODES → VALUES
    // =========================
    rows = rows.map(row => {
      const newRow = { ...row };

      Object.entries(lookupMaps).forEach(([col, lookup]) => {
        const code = row[col];

        if (code !== null && code !== undefined) {
          newRow[col] = lookup?.[code] ?? code;
        }
      });

      return newRow;
    });

    // =========================
    // RESPONSE
    // =========================
    return res.json(rows);

  } catch (err) {
    console.error("getCompanyWiseReport error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getVendorWiseReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      reportType = "summary",
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);
      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;
    }

    // =========================
    // FILTERS
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

    let result;

    // =========================
    // DETAILED
    // =========================
    if (reportType === "detailed") {
      const request = pool.request();

      let where = `
        WHERE ISNULL(deleted,0)=0
        AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
      `;

      request.input("StartDate", startDate);
      request.input("EndDate", endDate);

      parsedFilters.forEach((f, i) => {
        if (!f.pk || !f.values?.length) return;

        const params = f.values.map((v, j) => {
          const key = `f_${i}_${j}`;
          request.input(key, v);
          return `@${key}`;
        });

        where += ` AND ${f.pk} IN (${params.join(",")})`;
      });

      result = await request.query(`
        SELECT
            date,
            com_code,
            vend_code,
            prd_code,
            dep_code,
            dv_code,
            billcycle_code,
            remarks,
            curr_code,
            total_amount,
            total_amount_aed
        FROM tbl_payment_transactions
        ${where}
        ORDER BY vend_code
      `);
    }

    // =========================
    // SUMMARY
    // =========================
    else {
      const request = pool.request();

      let where = `
        WHERE ISNULL(deleted,0)=0
        AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
      `;

      request.input("StartDate", startDate);
      request.input("EndDate", endDate);

      parsedFilters.forEach((f, i) => {
        if (!f.pk || !f.values?.length) return;

        const params = f.values.map((v, j) => {
          const key = `f_${i}_${j}`;
          request.input(key, v);
          return `@${key}`;
        });

        where += ` AND ${f.pk} IN (${params.join(",")})`;
      });

      result = await request.query(`
        SELECT
            vend_code,
            SUM(total_amount_aed) AS total_amount_aed
        FROM tbl_payment_transactions
        ${where}
        GROUP BY vend_code
        ORDER BY vend_code
      `);
    }

    // =========================
    // MASTER MAPPING (CODE → NAME)
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

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

    let rows = result.recordset || [];

    rows = rows.map(row => {
      const newRow = { ...row };

      Object.entries(lookupMaps).forEach(([col, lookup]) => {
        const code = row[col];
        if (code !== null && code !== undefined) {
          newRow[col] = lookup?.[code] ?? code;
        }
      });

      return newRow;
    });

    return res.json(rows);

  } catch (err) {
    console.error("Vendor Wise Report Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
exports.getProductWiseReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      reportType = "summary",
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);
      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;
    }

    // =========================
    // FILTERS
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

    let result;

    // =========================
    // DETAILED
    // =========================
    if (reportType === "detailed") {
      const request = pool.request();

      let where = `
        WHERE ISNULL(deleted,0)=0
        AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
      `;

      request.input("StartDate", startDate);
      request.input("EndDate", endDate);

      parsedFilters.forEach((f, i) => {
        if (!f.pk || !f.values?.length) return;

        const params = f.values.map((v, j) => {
          const key = `f_${i}_${j}`;
          request.input(key, v);
          return `@${key}`;
        });

        where += ` AND ${f.pk} IN (${params.join(",")})`;
      });

      result = await request.query(`
        SELECT
            date,
            com_code,
            vend_code,
            prd_code,
            dep_code,
            dv_code,
            billcycle_code,
            remarks,
            curr_code,
            total_amount,
            total_amount_aed
        FROM tbl_payment_transactions
        ${where}
        ORDER BY prd_code
      `);
    }

    // =========================
    // SUMMARY
    // =========================
    else {
      const request = pool.request();

      let where = `
        WHERE ISNULL(deleted,0)=0
        AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
        AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
      `;

      request.input("StartDate", startDate);
      request.input("EndDate", endDate);

      parsedFilters.forEach((f, i) => {
        if (!f.pk || !f.values?.length) return;

        const params = f.values.map((v, j) => {
          const key = `f_${i}_${j}`;
          request.input(key, v);
          return `@${key}`;
        });

        where += ` AND ${f.pk} IN (${params.join(",")})`;
      });

      result = await request.query(`
        SELECT
            prd_code,
            SUM(total_amount_aed) AS total_amount_aed
        FROM tbl_payment_transactions
        ${where}
        GROUP BY prd_code
        ORDER BY prd_code
      `);
    }

    // =========================
    // MASTER MAPPING (CODE → NAME)
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

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

    let rows = result.recordset || [];

    rows = rows.map(row => {
      const newRow = { ...row };

      Object.entries(lookupMaps).forEach(([col, lookup]) => {
        const code = row[col];
        if (code !== null && code !== undefined) {
          newRow[col] = lookup?.[code] ?? code;
        }
      });

      return newRow;
    });

    return res.json(rows);

  } catch (err) {
    console.error("Product Wise Report Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getVendorCostByCompanyReport = async (req, res) => {
  let pool;

  try {
    const { activeUserEmail } = req.query;

    pool = await poolPromise;

    // ======================================
    // CALL STORED PROCEDURE
    // ======================================
    const result = await pool.request()
      .execute("GetVendorCostByCompanyReport");

    let rows = result.recordset;

    // ======================================
    // AUDIT LOG
    // ======================================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R003",
      action: "FETCH_REPORT",
      message: "Fetched Vendor Cost By Company Report (SP)",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getCompanyMonthlyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;



    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;
    let monthCount = 1;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        monthCount =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      }

      console.log("Month Count:", monthCount);
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    const request = pool.request();

    let where = `
      WHERE ISNULL(deleted,0) = 0
      AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
    `;

    request.input("StartDate", startDate || null);
    request.input("EndDate", endDate || null);
    request.input("MonthCount", monthCount || null);

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !f.values?.length) return;

      const params = f.values.map((v, j) => {
        const key = `f_${i}_${j}`;
        request.input(key, v);
        return `@${key}`;
      });

      where += ` AND ${f.pk} IN (${params.join(",")})`;
    });

    // =========================
    // QUERY
    // =========================
    const result = await request.query(`
      SELECT
          com_code AS company,

          SUM(
              CASE billcycle_code
                  WHEN 'BC01' THEN total_amount_aed
                  WHEN 'BC08' THEN (total_amount_aed / 6.0) * @MonthCount
                  WHEN 'BC06' THEN (total_amount_aed / 12.0) * @MonthCount
                  WHEN 'BC11' THEN total_amount_aed
                  ELSE total_amount_aed
              END
          ) AS Total_Amount_AED

      FROM tbl_payment_transactions
      ${where}

      GROUP BY com_code
      ORDER BY com_code
    `);

    let rows = result.recordset || [];

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          (m) => m.master_name === col.master
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

    // company column contains com_code
    rows = rows.map((row) => {
      const newRow = { ...row };

      const companyLookup = lookupMaps["com_code"];

      if (companyLookup && row.company != null) {
        newRow.company =
          companyLookup[row.company] ?? row.company;
      }

      return newRow;
    });

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R005",
      action: "FETCH_REPORT",
      message: "Fetched Company Monthly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getCompanyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;
    let monthCount = 1;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        monthCount =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      }
    }

    // =========================
    // FILTERS
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

    const request = pool.request();

    request.input("StartDate", startDate);
    request.input("EndDate", endDate);
    request.input("MonthCount", monthCount);

    let where = `
      WHERE ISNULL(deleted,0) = 0
      AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
    `;

    parsedFilters.forEach((f, i) => {
      if (!f.pk || !f.values?.length) return;

      const params = f.values.map((v, j) => {
        const key = `f_${i}_${j}`;
        request.input(key, v);
        return `@${key}`;
      });

      where += ` AND ${f.pk} IN (${params.join(",")})`;
    });

    // =========================
    // RAW DATA (IMPORTANT)
    // =========================
    const result = await request.query(`
      SELECT
        com_code AS company,
        billcycle_code,
        total_amount_aed
      FROM tbl_payment_transactions
      ${where}
    `);

    const rows = result.recordset || [];

    // =========================
    // GROUPING
    // =========================
    const grouped = {};

    rows.forEach(r => {
      const key = r.company;

      if (!grouped[key]) {
        grouped[key] = {
          company: key,
          monthly_amount_aed: 0,
          yearly_amount_aed: 0
        };
      }

      // =========================
      // MONTHLY LOGIC
      // =========================
      let monthlyValue = 0;

      switch (r.billcycle_code) {
        case "BC01":
          monthlyValue = r.total_amount_aed;
          break;
        case "BC08":
          monthlyValue = (r.total_amount_aed / 6) * monthCount;
          break;
        case "BC06":
          monthlyValue = (r.total_amount_aed / 12) * monthCount;
          break;
        case "BC11":
          monthlyValue = r.total_amount_aed;
          break;
        default:
          monthlyValue = r.total_amount_aed;
      }

      // =========================
      // YEARLY LOGIC
      // =========================
      let yearlyValue = 0;

      switch (r.billcycle_code) {
        case "BC01":
          yearlyValue = r.total_amount_aed * 12;
          break;
        case "BC08":
          yearlyValue = r.total_amount_aed * 2;
          break;
        case "BC06":
          yearlyValue = r.total_amount_aed;
          break;
        case "BC11":
          yearlyValue = r.total_amount_aed;
          break;
        default:
          yearlyValue = r.total_amount_aed;
      }

      grouped[key].monthly_amount_aed += monthlyValue;
      grouped[key].yearly_amount_aed += yearlyValue;
    });

    let response = Object.values(grouped);

    // =========================
    // MASTER MAPPING (company name)
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const lookupMaps = {};

    await Promise.all(
      sectionColsRes.recordset.map(async (col) => {
        const masterDef = mastersRes.recordset.find(
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

    const companyLookup = lookupMaps["com_code"];

    response = response.map(r => ({
      ...r,
      company: companyLookup?.[r.company] ?? r.company
    }));

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R005_R006",
      action: "FETCH_REPORT",
      message: "Fetched Company Monthly & Yearly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(response);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getProductEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;
    let monthCount = 1;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        monthCount =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      }
    }

    // =========================
    // FILTERS
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

    const request = pool.request();

    request.input("StartDate", startDate);
    request.input("EndDate", endDate);
    request.input("MonthCount", monthCount);

    let where = `
      WHERE ISNULL(deleted,0) = 0
      AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
    `;

    parsedFilters.forEach((f, i) => {
      if (!f.pk || !f.values?.length) return;

      const params = f.values.map((v, j) => {
        const key = `f_${i}_${j}`;
        request.input(key, v);
        return `@${key}`;
      });

      where += ` AND ${f.pk} IN (${params.join(",")})`;
    });

    // =========================
    // RAW DATA (ONLY ONCE)
    // =========================
    const result = await request.query(`
      SELECT
        prd_code,
        billcycle_code,
        total_amount_aed
      FROM tbl_payment_transactions
      ${where}
    `);

    const rows = result.recordset || [];

    // =========================
    // GROUP PRODUCT
    // =========================
    const productMap = {};

    rows.forEach(r => {

      if (!productMap[r.prd_code]) {
        productMap[r.prd_code] = {
          product: r.prd_code,
          monthly_amount_aed: 0,
          yearly_amount_aed: 0
        };
      }

      // =========================
      // MONTHLY
      // =========================
      let monthlyValue = 0;

      switch (r.billcycle_code) {
        case "BC01":
          monthlyValue = r.total_amount_aed;
          break;
        case "BC08":
          monthlyValue = (r.total_amount_aed / 6) * monthCount;
          break;
        case "BC06":
          monthlyValue = (r.total_amount_aed / 12) * monthCount;
          break;
        case "BC11":
          monthlyValue = r.total_amount_aed;
          break;
        default:
          monthlyValue = r.total_amount_aed;
      }

      // =========================
      // YEARLY
      // =========================
      let yearlyValue = 0;

      switch (r.billcycle_code) {
        case "BC01":
          yearlyValue = r.total_amount_aed * 12;
          break;
        case "BC08":
          yearlyValue = r.total_amount_aed * 2;
          break;
        case "BC06":
          yearlyValue = r.total_amount_aed;
          break;
        case "BC11":
          yearlyValue = r.total_amount_aed;
          break;
        default:
          yearlyValue = r.total_amount_aed;
      }

      productMap[r.prd_code].monthly_amount_aed += monthlyValue;
      productMap[r.prd_code].yearly_amount_aed += yearlyValue;
    });

    let response = Object.values(productMap);

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const lookupMaps = {};

    await Promise.all(
      sectionColsRes.recordset.map(async (col) => {
        const masterDef = mastersRes.recordset.find(
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

    const productLookup = lookupMaps["prd_code"];

    response = response.map(r => ({
      ...r,
      product: productLookup?.[r.product] ?? r.product
    }));

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_PRODUCT_EQUIVALENT",
      action: "FETCH_REPORT",
      message: "Fetched Product Monthly & Yearly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(response);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getVendorEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;
    let monthCount = 1;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        monthCount =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      }
    }

    // =========================
    // FILTERS
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

    const request = pool.request();

    request.input("StartDate", startDate);
    request.input("EndDate", endDate);
    request.input("MonthCount", monthCount);

    let where = `
      WHERE ISNULL(deleted,0) = 0
      AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
    `;

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !f.values?.length) return;

      const params = f.values.map((v, j) => {
        const key = `f_${i}_${j}`;
        request.input(key, v);
        return `@${key}`;
      });

      where += ` AND ${f.pk} IN (${params.join(",")})`;
    });

    // =========================
    // BASE DATA
    // =========================
    const result = await request.query(`
      SELECT
        vend_code,
        billcycle_code,
        total_amount_aed
      FROM tbl_payment_transactions
      ${where}
    `);

    const rows = result.recordset || [];

    // =========================
    // GROUP VENDOR
    // =========================
    const vendorMap = {};

    rows.forEach(r => {

      if (!vendorMap[r.vend_code]) {
        vendorMap[r.vend_code] = {
          vendor: r.vend_code,
          monthly_amount_aed: 0,
          yearly_amount_aed: 0
        };
      }

      // =========================
      // MONTHLY LOGIC
      // =========================
      let monthlyValue = 0;

      switch (r.billcycle_code) {
        case "BC01":
          monthlyValue = r.total_amount_aed;
          break;
        case "BC08":
          monthlyValue = (r.total_amount_aed / 6) * monthCount;
          break;
        case "BC06":
          monthlyValue = (r.total_amount_aed / 12) * monthCount;
          break;
        case "BC11":
          monthlyValue = r.total_amount_aed;
          break;
        default:
          monthlyValue = r.total_amount_aed;
      }

      // =========================
      // YEARLY LOGIC
      // =========================
      let yearlyValue = 0;

      switch (r.billcycle_code) {
        case "BC01":
          yearlyValue = r.total_amount_aed * 12;
          break;
        case "BC08":
          yearlyValue = r.total_amount_aed * 2;
          break;
        case "BC06":
          yearlyValue = r.total_amount_aed;
          break;
        case "BC11":
          yearlyValue = r.total_amount_aed;
          break;
        default:
          yearlyValue = r.total_amount_aed;
      }

      vendorMap[r.vend_code].monthly_amount_aed += monthlyValue;
      vendorMap[r.vend_code].yearly_amount_aed += yearlyValue;
    });

    let response = Object.values(vendorMap);

    // =========================
    // MASTER MAPPING (vendor name)
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const lookupMaps = {};

    await Promise.all(
      sectionColsRes.recordset.map(async (col) => {
        const masterDef = mastersRes.recordset.find(
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

    const vendorLookup = lookupMaps["vend_code"];

    response = response.map(r => ({
      ...r,
      vendor: vendorLookup?.[r.vendor] ?? r.vendor
    }));

    console.log("Vendor Equivalent Report Response:", response);

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_VENDOR_EQUIVALENT",
      action: "FETCH_REPORT",
      message: "Fetched Vendor Monthly & Yearly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(response);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getCompanyYearlyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    const request = pool.request();

    request.input("StartDate", startDate);
    request.input("EndDate", endDate);

    let where = `
      WHERE ISNULL(t.deleted,0) = 0
      AND (@StartDate IS NULL OR CAST(t.[date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST(t.[date] AS DATE) <= @EndDate)
    `;

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !Array.isArray(f.values) || !f.values.length) return;

      const params = f.values.map((v, j) => {
        const param = `f_${i}_${j}`;
        request.input(param, v);
        return `@${param}`;
      });

      where += ` AND t.${f.pk} IN (${params.join(",")}) `;
    });

    // =========================
    // QUERY
    // =========================
    const result = await request.query(`
      WITH LatestRecords AS (
        SELECT
          t.*,
          ROW_NUMBER() OVER (
            PARTITION BY
              t.com_code,
              t.prd_code,
              t.plan_code,
              t.dep_code,
              t.dv_code,
              t.trntype_code,
              t.billcycle_code
            ORDER BY t.[date] DESC
          ) AS rn
        FROM tbl_payment_transactions t
        ${where}
      )

      SELECT
        com_code AS company,

        SUM(
          CASE billcycle_code
            WHEN 'BC01' THEN total_amount_aed * 12
            WHEN 'BC08' THEN total_amount_aed * 2
            WHEN 'BC06' THEN total_amount_aed
            WHEN 'BC11' THEN total_amount_aed
            ELSE total_amount_aed
          END
        ) AS Total_Amount_AED

      FROM LatestRecords
      WHERE rn = 1

      GROUP BY com_code
      ORDER BY com_code
    `);

    let rows = result.recordset || [];

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          (m) => m.master_name === col.master
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
    // COMPANY MAPPING
    // =========================
    rows = rows.map((row) => {
      const newRow = { ...row };

      const companyLookup = lookupMaps["com_code"];

      if (companyLookup && row.company != null) {
        newRow.company =
          companyLookup[row.company] ?? row.company;
      }

      return newRow;
    });

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R006",
      action: "FETCH_REPORT",
      message: "Fetched Company Yearly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getProductMonthlyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;



    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;
    let monthCount = 1;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        monthCount =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      }

      console.log("Month Count:", monthCount);
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    const request = pool.request();

    let where = `
      WHERE ISNULL(deleted,0) = 0
      AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
    `;

    request.input("StartDate", startDate || null);
    request.input("EndDate", endDate || null);
    request.input("MonthCount", monthCount || null);

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !f.values?.length) return;

      const params = f.values.map((v, j) => {
        const key = `f_${i}_${j}`;
        request.input(key, v);
        return `@${key}`;
      });

      where += ` AND ${f.pk} IN (${params.join(",")})`;
    });

    // =========================
    // QUERY
    // =========================
    const result = await request.query(`
      SELECT
          prd_code AS product,

          SUM(
              CASE billcycle_code
                  WHEN 'BC01' THEN total_amount_aed
                  WHEN 'BC08' THEN (total_amount_aed / 6.0) * @MonthCount
                  WHEN 'BC06' THEN (total_amount_aed / 12.0) * @MonthCount
                  WHEN 'BC11' THEN total_amount_aed
                  ELSE total_amount_aed
              END
          ) AS Total_Amount_AED

      FROM tbl_payment_transactions
      ${where}

      GROUP BY prd_code
      ORDER BY prd_code
    `);

    let rows = result.recordset || [];

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          (m) => m.master_name === col.master
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

    // product column contains prd_code
    rows = rows.map((row) => {
      const newRow = { ...row };

      const productLookup = lookupMaps["prd_code"];

      if (productLookup && row.product != null) {
        newRow.product =
          productLookup[row.product] ?? row.product;
      }

      return newRow;
    });

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R005",
      action: "FETCH_REPORT",
      message: "Fetched Product Monthly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getProductYearlyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    const request = pool.request();

    request.input("StartDate", startDate);
    request.input("EndDate", endDate);

    let where = `
      WHERE ISNULL(t.deleted,0) = 0
      AND (@StartDate IS NULL OR CAST(t.[date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST(t.[date] AS DATE) <= @EndDate)
    `;

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !Array.isArray(f.values) || !f.values.length) return;

      const params = f.values.map((v, j) => {
        const param = `f_${i}_${j}`;
        request.input(param, v);
        return `@${param}`;
      });

      where += ` AND t.${f.pk} IN (${params.join(",")}) `;
    });

    // =========================
    // QUERY
    // =========================
    const result = await request.query(`
      WITH LatestRecords AS (
        SELECT
          t.*,
          ROW_NUMBER() OVER (
            PARTITION BY
              t.com_code,
              t.prd_code,
              t.plan_code,
              t.dep_code,
              t.dv_code,
              t.trntype_code,
              t.billcycle_code
            ORDER BY t.[date] DESC
          ) AS rn
        FROM tbl_payment_transactions t
        ${where}
      )

      SELECT
        prd_code AS product,

        SUM(
          CASE billcycle_code
            WHEN 'BC01' THEN total_amount_aed * 12
            WHEN 'BC08' THEN total_amount_aed * 2
            WHEN 'BC06' THEN total_amount_aed
            WHEN 'BC11' THEN total_amount_aed
            ELSE total_amount_aed
          END
        ) AS Total_Amount_AED

      FROM LatestRecords
      WHERE rn = 1

      GROUP BY prd_code
      ORDER BY prd_code
    `);

    let rows = result.recordset || [];

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          (m) => m.master_name === col.master
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
    // COMPANY MAPPING
    // =========================
    rows = rows.map((row) => {
      const newRow = { ...row };

      const productLookup = lookupMaps["prd_code"];

      if (productLookup && row.product != null) {
        newRow.product =
          productLookup[row.product] ?? row.product;
      }

      return newRow;
    });

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R006",
      action: "FETCH_REPORT",
      message: "Fetched Product Yearly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getVendorMonthlyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;



    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;
    let monthCount = 1;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;

      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        monthCount =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()) +
          1;
      }

      console.log("Month Count:", monthCount);
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    const request = pool.request();

    let where = `
      WHERE ISNULL(deleted,0) = 0
      AND (@StartDate IS NULL OR CAST([date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST([date] AS DATE) <= @EndDate)
    `;

    request.input("StartDate", startDate || null);
    request.input("EndDate", endDate || null);
    request.input("MonthCount", monthCount || null);

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !f.values?.length) return;

      const params = f.values.map((v, j) => {
        const key = `f_${i}_${j}`;
        request.input(key, v);
        return `@${key}`;
      });

      where += ` AND ${f.pk} IN (${params.join(",")})`;
    });

    // =========================
    // QUERY
    // =========================
    const result = await request.query(`
      SELECT
          vend_code AS vendor,

          SUM(
              CASE billcycle_code
                  WHEN 'BC01' THEN total_amount_aed
                  WHEN 'BC08' THEN (total_amount_aed / 6.0) * @MonthCount
                  WHEN 'BC06' THEN (total_amount_aed / 12.0) * @MonthCount
                  WHEN 'BC11' THEN total_amount_aed
                  ELSE total_amount_aed
              END
          ) AS Total_Amount_AED

      FROM tbl_payment_transactions
      ${where}

      GROUP BY vend_code
      ORDER BY vend_code
    `);

    let rows = result.recordset || [];

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          (m) => m.master_name === col.master
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

    // vendor column contains vend_code
    rows = rows.map((row) => {
      const newRow = { ...row };

      const vendorLookup = lookupMaps["vend_code"];

      if (vendorLookup && row.vendor != null) {
        newRow.vendor =
          vendorLookup[row.vendor] ?? row.vendor;
      }

      return newRow;
    });

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R005",
      action: "FETCH_REPORT",
      message: "Fetched Vendor Monthly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getVendorYearlyEquivalentReport = async (req, res) => {
  let pool;

  try {
    const {
      activeUserEmail,
      dateFilters,
      filters
    } = req.query;

    pool = await poolPromise;

    // =========================
    // PARSE DATE FILTERS
    // =========================
    let startDate = null;
    let endDate = null;

    if (dateFilters) {
      const parsed = JSON.parse(dateFilters);

      startDate = parsed?.date?.startDate || null;
      endDate = parsed?.date?.endDate || null;
    }

    // =========================
    // PARSE FILTERS
    // =========================
    let parsedFilters = [];

    try {
      parsedFilters =
        typeof filters === "string"
          ? JSON.parse(filters)
          : filters || [];
    } catch (e) {
      parsedFilters = [];
    }

    const request = pool.request();

    request.input("StartDate", startDate);
    request.input("EndDate", endDate);

    let where = `
      WHERE ISNULL(t.deleted,0) = 0
      AND (@StartDate IS NULL OR CAST(t.[date] AS DATE) >= @StartDate)
      AND (@EndDate IS NULL OR CAST(t.[date] AS DATE) <= @EndDate)
    `;

    // =========================
    // DYNAMIC FILTERS
    // =========================
    parsedFilters.forEach((f, i) => {
      if (!f.pk || !Array.isArray(f.values) || !f.values.length) return;

      const params = f.values.map((v, j) => {
        const param = `f_${i}_${j}`;
        request.input(param, v);
        return `@${param}`;
      });

      where += ` AND t.${f.pk} IN (${params.join(",")}) `;
    });

    // =========================
    // QUERY
    // =========================
    const result = await request.query(`
      WITH LatestRecords AS (
        SELECT
          t.*,
          ROW_NUMBER() OVER (
            PARTITION BY
              t.com_code,
              t.prd_code,
              t.plan_code,
              t.dep_code,
              t.dv_code,
              t.trntype_code,
              t.billcycle_code
            ORDER BY t.[date] DESC
          ) AS rn
        FROM tbl_payment_transactions t
        ${where}
      )

      SELECT
        vend_code AS vendor,

        SUM(
          CASE billcycle_code
            WHEN 'BC01' THEN total_amount_aed * 12
            WHEN 'BC08' THEN total_amount_aed * 2
            WHEN 'BC06' THEN total_amount_aed
            WHEN 'BC11' THEN total_amount_aed
            ELSE total_amount_aed
          END
        ) AS Total_Amount_AED

      FROM LatestRecords
      WHERE rn = 1

      GROUP BY vend_code
      ORDER BY vend_code
    `);

    let rows = result.recordset || [];

    // =========================
    // MASTER MAPPING
    // =========================
    const sectionColsRes = await pool.request().query(`
      SELECT column_name, master
      FROM module_columns
      WHERE master IS NOT NULL
    `);

    const sectionColumns = sectionColsRes.recordset;

    const mastersRes = await pool.request().query(`
      SELECT master_name, master_key
      FROM masters
      WHERE is_active = 1
    `);

    const masterDefinitions = mastersRes.recordset;

    const lookupMaps = {};

    await Promise.all(
      sectionColumns.map(async (col) => {
        const masterDef = masterDefinitions.find(
          (m) => m.master_name === col.master
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
    // COMPANY MAPPING
    // =========================
    rows = rows.map((row) => {
      const newRow = { ...row };

      const vendorLookup = lookupMaps["vend_code"];

      if (vendorLookup && row.vendor != null) {
        newRow.vendor =
          vendorLookup[row.vendor] ?? row.vendor;
      }

      return newRow;
    });

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R006",
      action: "FETCH_REPORT",
      message: "Fetched Vendor Yearly Equivalent Report",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(rows);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};
