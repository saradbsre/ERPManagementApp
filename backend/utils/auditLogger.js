const { poolPromise, sql } = require("../db/db");

async function auditLogger({
  pool,
  transaction_id,
  log_type = "INFO",
  module_name,
  action,
  message,
  status = "SUCCESS",
  error_message = null,
  userid
}) {
  await pool.request()
    .input("transaction_id", sql.VarChar, transaction_id)
    .input("log_type", sql.VarChar, log_type)
    .input("module_name", sql.VarChar, module_name)
    .input("action", sql.VarChar, action)
    .input("message", sql.NVarChar, message)
    .input("status", sql.VarChar, status)
    .input("error_message", sql.NVarChar, error_message)
    .input("userid", sql.VarChar, userid)
    .query(`
      INSERT INTO audit_logs (
        transaction_id,
        log_type,
        module_name,
        action,
        message,
        status,
        error_message,
        userid
      )
      VALUES (
        @transaction_id,
        @log_type,
        @module_name,
        @action,
        @message,
        @status,
        @error_message,
        @userid
      )
    `);
}

module.exports = { auditLogger };