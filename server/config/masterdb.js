// config/masterdb.js
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const config = {
  user: process.env.MASTER_USER,
  password: process.env.MASTER_PASSWORD,
  server: process.env.MASTER_SERVER,
  database: process.env.MASTER_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  requestTimeout: 60000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

export async function connectMssql() {
  try {
   // console.log("Master DB Config:", config);
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
      console.log("MASTER: MSSQL pool created");
    }
    return await poolPromise;
  } catch (err) {
    poolPromise = null;
    console.error("MASTER: MSSQL connection error:", err);
    throw err;
  }
}
