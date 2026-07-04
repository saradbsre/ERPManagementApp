const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");

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
      `SELECT * FROM reports ORDER BY sysdate DESC`
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
      reportType = "summary"
    } = req.query;
    
    pool = await poolPromise;

    // ======================================
    // CALL CORRECT STORED PROCEDURE
    // ======================================
    const spName =
      reportType === "detailed"
        ? "GetCompanyWiseDetailReport"
        : "GetCompanyWiseReport";

    const result = await pool.request().execute(spName);

    const rows = result.recordset;

    // ======================================
    // AUDIT LOG
    // ======================================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R001",
      action: "FETCH_REPORT",
      message: `Fetched Company Wise ${reportType} Report (${spName})`,
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

exports.getVendorWiseReport = async (req, res) => {
  let pool;

  try {
    const { activeUserEmail, reportType = "summary" } = req.query;

    pool = await poolPromise;

    // ======================================
    // CALL STORED PROCEDURE
    // ======================================
    const spName =
      reportType === "detailed"
        ? "GetVendorWiseDetailReport"
        : "GetVendorWiseReport";

    const result = await pool.request().execute(spName);

    let rows = result.recordset;

    // ======================================
    // AUDIT LOG
    // ======================================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R002",
      action: "FETCH_REPORT",
      message: `Fetched Vendor Wise ${reportType} Report (${spName})`,
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

exports.getProductWiseReport = async (req, res) => {
  let pool;

  try {
    const { activeUserEmail, reportType = "summary", dateFilters } = req.query;

    console.log("req.query:", req.query);

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

    pool = await poolPromise;

    // =========================
    // CALL PROCEDURE
    // =========================
    const spName =
      // reportType === "detailed"
      //   ? "GetProductWiseDetailedReport"
      //   : "GetProductWiseReport";

       reportType === "detailed"
        ? "GetProductWiseReport"
        : "GetProductWiseDetailedReport";

    const request = pool.request();

    // 👉 PASS DATES TO SP
    request.input("StartDate", startDate);
    request.input("EndDate", endDate);

    const result = await request.execute(spName);

    let rows = result.recordset || [];

    // =========================
    // REMOVE EMPTY COLUMNS
    // =========================
    if (rows.length > 0) {
      const columnsToKeep = Object.keys(rows[0]).filter((col) =>
        rows.some(
          (row) =>
            row[col] !== null &&
            row[col] !== undefined &&
            row[col] !== ""
        )
      );

      rows = rows.map((row) => {
        const filteredRow = {};
        columnsToKeep.forEach((col) => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });
    }

    // =========================
    // AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "REPORT_R004",
      action: "FETCH_REPORT",
      message: `Fetched Product Wise ${reportType} Report (${spName})`,
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