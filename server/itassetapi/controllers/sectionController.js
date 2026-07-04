const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { processModules } = require("../services/sectionServices");
const { auditLogger } = require("../utils/auditLogger");
const { resolveCol } = require("../utils/resolveCol");

exports.upsertModule = async (req, res) => {
  let pool; // ✅ declare outside

  try {
    const {
      id,
      module_name,
      display_name,
      description,
      is_active = true,
      can_edit = true,
      userid
    } = req.body;

    pool = await poolPromise; // ✅ assign here

    let result;

    if (id) {
      // ✅ UPDATE
      await pool.request()
        .input("id", sql.Int, id)
        .input("module_name", sql.VarChar(50), module_name)
        .input("display_name", sql.VarChar(50), display_name)
        .input("description", sql.VarChar(60), description)
        .input("is_active", sql.Bit, is_active)
        .input("can_edit", sql.Bit, can_edit)
        .input("userid", sql.VarChar(30), userid)
        .query(`
          UPDATE modules
          SET 
            module_name = @module_name,
            display_name = @display_name,
            description = @description,
            is_active = @is_active,
            can_edit = @can_edit,
            userid = @userid,
            sysdate = GETDATE(),
            audit_rev = ISNULL(audit_rev, 0) + 1
          WHERE id = @id
        `);

      result = { id };

    } else {
      // ✅ INSERT
      const insertResult = await pool.request()
        .input("module_name", sql.VarChar(50), module_name)
        .input("display_name", sql.VarChar(50), display_name)
        .input("description", sql.VarChar(60), description)
        .input("is_active", sql.Bit, is_active)
        .input("can_edit", sql.Bit, can_edit)
        .input("userid", sql.VarChar(30), userid)
        .query(`
          INSERT INTO modules (
            module_name,
            display_name,
            description,
            is_active,
            can_edit,
            sysdate,
            created_at,
            audit_rev,
            userid
          )
          OUTPUT INSERTED.id
          VALUES (
            @module_name,
            @display_name,
            @description,
            @is_active,
            @can_edit,
            GETDATE(),
            GETDATE(),
            0,
            @userid
          )
        `);

      result = insertResult.recordset[0];
    }

    // ✅ AUDIT SUCCESS
    await auditLogger({
      pool,
      transaction_id: userid || "UNKNOWN",
      log_type: "INFO",
      module_name: "sections",
      action: id ? "UPDATE_MODULE" : "CREATE_MODULE",
      message: `Module ${id ? "updated" : "created"}: ${module_name}`,
      status: "SUCCESS",
      userid: userid || "UNKNOWN"
    });

    res.json({
      id: result.id,
      message: "Module saved successfully"
    });

  } catch (err) {
    console.error("Error in upsertModule:", err);

    // ✅ NOW pool is accessible
    if (pool) {
      await auditLogger({
        pool,
        transaction_id: req.body.userid || "UNKNOWN",
        log_type: "ERROR",
        module_name: "sections",
        action: req.body.id ? "UPDATE_MODULE" : "CREATE_MODULE",
        message: "Failed to save module",
        status: "FAILED",
        error_message: err.message,
        userid: req.body.userid || "UNKNOWN"
      });
    }

    res.status(500).json({ error: err.message });
  }
};

// exports.upsertModuleColumn = async (req, res) => {
//   let pool;
//   try {
//     const {
//       id,
//       module_id,
//       column_name,
//       display_name,
//       description,
//       data_type,
//       length,
//       is_active = true,
//       can_edit = true,
//       userid,
//       master
//     } = req.body;

//     const pool = await poolPromise;

//     await pool.request()
//       .input("id", sql.Int, id)
//       .input("module_id", sql.Int, module_id)
//       .input("column_name", sql.VarChar(50), column_name)
//       .input("display_name", sql.VarChar(50), display_name)
//       .input("description", sql.VarChar(50), description)
//       .input("data_type", sql.VarChar(50), data_type)
//       .input("length", sql.Int, length)
//       .input("is_active", sql.Bit, is_active)
//       .input("can_edit", sql.Bit, can_edit)
//       .input("userid", sql.VarChar(30), userid)
//       .input("master", sql.VarChar(50), master)
//       .query(`
//         IF EXISTS (SELECT 1 FROM module_columns WHERE id = @id)
//         BEGIN
//           UPDATE module_columns
//           SET 
//             module_id = @module_id,
//             column_name = @column_name,
//             display_name = @display_name,
//             description = @description,
//             data_type = @data_type,
//             length = @length,
//             is_active = @is_active,
//             can_edit = @can_edit,
//             userid = @userid,
//             master = @master,
//             sysdate = GETDATE(),
//             audit_rev = ISNULL(audit_rev, 0) + 1
//           WHERE id = @id
//         END
//         ELSE
//         BEGIN
//           INSERT INTO module_columns (
//             module_id,
//             column_name,
//             display_name,
//             description,
//             data_type,
//             length,
//             is_active,
//             can_edit,
//             master,
//             sysdate,
//             audit_rev,
//             userid
//           )
//           VALUES (
//             @module_id,
//             @column_name,
//             @display_name,
//             @description,
//             @data_type,
//             @length,
//             @is_active,
//             @can_edit,
//             @master,
//             GETDATE(),
//               0,
//             @userid
//           )
//         END
//       `);

//     // 🔥 RUN SECOND FUNCTION AFTER SAVE
//     const result = await processModules();

//     // audit log
//     await auditLogger({
//       pool,
//       transaction_id: userid || "UNKNOWN",
//       log_type: "INFO",
//       module_name: "sections",
//       action: id ? "UPDATE_MODULE_COLUMN" : "CREATE_MODULE_COLUMN",
//       message: `Module column ${id ? "updated" : "created"}: ${column_name} in module_id: ${module_id}`,
//       status: "SUCCESS",
//       userid: userid || "UNKNOWN"
//     });

    

//     return res.json({
//       message: "Column saved successfully",
//       moduleResult: result
//     });

//   } catch (err) {
//     console.error("Error in upsertModuleColumn:", err);
//     if (pool) {
//       await auditLogger({
//         pool,
//         transaction_id: userid || "UNKNOWN",
//         log_type: "ERROR",
//         module_name: "sections",
//         action: id ? "UPDATE_MODULE_COLUMN" : "CREATE_MODULE_COLUMN",
//         message: "Failed to save module column",
//         status: "FAILED",
//         error_message: err.message,
//         userid: userid || "UNKNOWN"
//       });
//     }
//     res.status(500).json({ error: err.message });
//   }
// };



exports.upsertModuleColumn = async (req, res) => {
  let pool;

  try {
    const { columns, userid } = req.body;

    pool = await poolPromise;

    for (const col of columns) {
      await pool.request()
        .input("id", sql.Int, col.id || null)
        .input("module_id", sql.Int, col.module_id)
        .input("column_name", sql.VarChar(50), col.column_name)
        .input("display_name", sql.VarChar(50), col.display_name)
        .input("description", sql.VarChar(50), col.description)
        .input("data_type", sql.VarChar(50), col.data_type)
        .input("length", sql.Int, col.length)
        .input("is_active", sql.Bit, col.is_active ?? true)
        .input("can_edit", sql.Bit, col.can_edit ?? true)
        .input("userid", sql.VarChar(30), userid)
        .input("master", sql.VarChar(50), col.master)
        .query(`
          IF EXISTS (SELECT 1 FROM module_columns WHERE id = @id)
          BEGIN
            UPDATE module_columns
            SET 
              column_name = @column_name,
              display_name = @display_name,
              description = @description,
              data_type = @data_type,
              length = @length,
              is_active = @is_active,
              can_edit = @can_edit,
              master = @master,
              sysdate = GETDATE(),
              audit_rev = ISNULL(audit_rev, 0) + 1
            WHERE id = @id
          END
          ELSE
          BEGIN
            INSERT INTO module_columns (
              module_id,
              column_name,
              display_name,
              description,
              data_type,
              length,
              is_active,
              can_edit,
              master,
              sysdate,
              audit_rev,
              userid
            )
            VALUES (
              @module_id,
              @column_name,
              @display_name,
              @description,
              @data_type,
              @length,
              @is_active,
              @can_edit,
              @master,
              GETDATE(),
              0,
              @userid
            )
          END
        `);
    }

    // ✅ RUN ONCE AFTER ALL INSERTS
    const result = await processModules();

    return res.json({
      message: "All columns saved & module processed",
      result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


exports.runModuleGeneration = async (req, res) => {
  try {
    const result = await processModules();
    res.json({ message: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSections = async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT 
        m.id AS module_id,
        m.module_name,
        m.display_name AS module_display_name,
        m.description AS module_description,
        m.is_active AS module_is_active,
        m.can_edit AS module_can_edit,
        m.created_at AS module_created_at,
        m.sysdate AS module_updated_at,
        m.userid AS module_created_by,
       
        c.id AS column_id,
        c.column_name,
        c.display_name AS column_display_name,
        c.description AS column_description,
        c.data_type,
        c.length,
        c.is_active AS column_is_active,
        c.can_edit AS column_can_edit,
        c.master AS column_master,
        c.master1 AS column_master1

      FROM modules m
      LEFT JOIN module_columns c 
        ON m.id = c.module_id
      ORDER BY m.id
    `);

    const rows = result.recordset;

    // 🔥 GROUPING LOGIC
    const modulesMap = {};

    rows.forEach(row => {
      if (!modulesMap[row.module_id]) {
        modulesMap[row.module_id] = {
          module_id: row.module_id,
          module_name: row.module_name,
          display_name: row.module_display_name,
          description: row.module_description,
          is_active: row.module_is_active,
          can_edit: row.module_can_edit,
          created_at: row.module_created_at,
          updated_at: row.module_updated_at,
          created_by: row.module_created_by,
         
          columns: []
        };
      }

      // push column only if exists
      if (row.column_id) {
        modulesMap[row.module_id].columns.push({
          column_id: row.column_id,
          column_name: row.column_name,
          display_name: row.column_display_name,
          description: row.column_description,
          data_type: row.data_type,
          length: row.length,
          is_active: row.column_is_active,
          can_edit: row.column_can_edit,
          master: row.column_master,
          master1: row.column_master1,
        });
      }
    });

    const response = Object.values(modulesMap);

    res.json(response);

  } catch (err) {
    console.error("Error fetching sections:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.dataTypes = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM data_types");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.currencises = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM currency");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMasterValues = async (req, res) => {
  try {
    const { master } = req.query;

    const pool = await poolPromise;

    // =========================
    // GET MASTER CONFIG
    // =========================
    const masterResult = await pool.request()
      .input("master", master)
      .query(`
        SELECT master_key
        FROM masters
        WHERE master_name = @master
      `);

    if (masterResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Master not found"
      });
    }

    const masterKey = masterResult.recordset[0].master_key;

    // =========================
    // GET TABLE COLUMNS
    // =========================
    const colsRes = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${master}'
    `);

    const columns = colsRes.recordset.map(c => c.COLUMN_NAME);

    // =========================
    // GET PRIMARY KEY COLUMN
    // =========================
    const pkRes = await pool.request().query(`
      SELECT KU.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KU
        ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME
      WHERE TC.TABLE_NAME = '${master}'
        AND TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
    `);

    const primaryKeyCol = pkRes.recordset[0]?.COLUMN_NAME;

    // =========================
    // RESOLVE COLUMNS
    // =========================
    const valueCol = resolveCol(columns, masterKey);

    const codeCol =
      primaryKeyCol ||
      resolveCol(columns, "code") ||
      resolveCol(columns, `${master}_code`) ||
      resolveCol(columns, "id");

    const activeCol = resolveCol(columns, "is_active");
    const deletedCol = resolveCol(columns, "deleted");

    if (!valueCol || !codeCol) {
      return res.status(400).json({
        message: "Required columns not found"
      });
    }

    // =========================
    // BUILD QUERY
    // =========================
    let query = `
      SELECT
        ${codeCol} AS code,
        ${valueCol} AS value
      FROM ${master}
    `;

    const conditions = [];

    if (activeCol) {
      conditions.push(`${activeCol} = 1`);
    }

    if (deletedCol) {
      conditions.push(`ISNULL(${deletedCol},0) <> 1`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY ${valueCol}`;

    // =========================
    // EXECUTE QUERY
    // =========================
    const result = await pool.request().query(query);

    // =========================
    // RESPONSE
    // =========================
    res.json({
      master,
      key: masterKey,
      pk: primaryKeyCol,
      data: result.recordset.map(r => ({
        key: r.code,
        value: r.value
      }))
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
};

exports.billingCycle = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM billing_cycle");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};