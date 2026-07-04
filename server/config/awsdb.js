
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const config = {
  user: process.env.AWS_USER,
  password: process.env.AWS_PASSWORD,
  server: process.env.AWS_SERVER,
  port: 14331,
  database: process.env.AWS_DATABASE,
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
   // console.log("AWS DB Config:", config);  // Debugging line
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(config).connect();
      console.log("AWS: MSSQL pool created");
    }
    return await poolPromise;
  } catch (err) {
    poolPromise = null;
    console.error("AWS: MSSQL connection error:", err);
    throw err;
  }
}
