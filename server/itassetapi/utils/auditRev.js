const { poolPromise, sql } = require("../db/db");

/**
 * Increments audit_rev by +1 for a given table row
 * @param {string} tableName
 * @param {number|string} id
 */
const incrementAuditRev = async (tableName, id) => {
  const pool = await poolPromise;

  await pool.request()
    .input("id", sql.Int, id)
    .query(`
      UPDATE ${tableName}
      SET audit_rev = ISNULL(audit_rev, 0) + 1
      WHERE id = @id
    `);
};

module.exports = { incrementAuditRev };