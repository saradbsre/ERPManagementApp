const sql = require("mssql");
require("dotenv").config();

const config = {
  user: process.env.ITASSET_DB_USER,
  password: process.env.ITASSET_DB_PASSWORD,
  server: process.env.ITASSET_DB_SERVER,
  database: process.env.ITASSET_DB_NAME,
  port: 14331,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to SQL Server");
    return pool;
  })
  .catch(err => console.log("DB Connection Failed:", err));

module.exports = { sql, poolPromise };