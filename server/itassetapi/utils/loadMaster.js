const masterCache = require("./masterCache");

async function loadMaster(pool, masterName, displayColumn) {
  if (masterCache[masterName]) {
    return masterCache[masterName];
  }

  const pkRes = await pool.request().query(`
    SELECT KU.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS TC
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KU
      ON TC.CONSTRAINT_NAME = KU.CONSTRAINT_NAME
    WHERE TC.TABLE_NAME = '${masterName}'
      AND TC.CONSTRAINT_TYPE = 'PRIMARY KEY'
  `);

  const pk = pkRes.recordset[0]?.COLUMN_NAME;
  if (!pk) return { lookup: {} };

  const dataRes = await pool.request().query(`
    SELECT ${pk} AS code, ${displayColumn} AS value
    FROM ${masterName}
  `);

  const lookup = {};
  dataRes.recordset.forEach(r => {
    lookup[r.code] = r.value;
  });

  const result = { lookup };

  masterCache[masterName] = result;

  return result;
}

module.exports = loadMaster;