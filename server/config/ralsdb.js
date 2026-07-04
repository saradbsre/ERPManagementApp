// config/ralsdb.js
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const config = {
  user: process.env.RALS_USER,
  password: process.env.RALS_PASSWORD,
  server: process.env.RALS_SERVER,
  database: process.env.RALS_DATABASE,
  port: 14331,
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
   // console.log("Rals DB Config:", config);
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
      console.log("RALS: MSSQL pool created");
    }
    const promise = await poolPromise
   // console.log("Rals Connection", promise)
    return promise;
  } catch (err) {
    poolPromise = null;
    console.error("RALS: MSSQL connection error:", err);
    throw err;
  }
}
