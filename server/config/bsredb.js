// config/bsredb.js
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const config = {
  user: process.env.BSRE_USER,
  password: process.env.BSRE_PASSWORD,
  server: process.env.BSRE_SERVER,
  database: process.env.BSRE_DATABASE,
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
   // console.log("BSRE DB Config:", config);
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
      // optional: you can attach error handler
      // (await poolPromise).on("error", (err) => console.error("BSRE pool error", err));
      console.log("BSRE: MSSQL pool created");
    }
    return await poolPromise;
  } catch (err) {
    poolPromise = null; // reset so next call retries
    console.error("BSRE: MSSQL connection error:", err);
    throw err;
  }
}
