// // db.js
// import { MongoClient } from "mongodb";
// import dotenv from "dotenv";
// import sql from "mssql";


// dotenv.config();


// // MONGO SETUP

// const uri = process.env.MONGO_URI;
// const client = new MongoClient(uri);
// const dbName = process.env.MONGO_DB_NAME;
// let db;



// export const connectMongo = async () => {
//   if (!db) {
//     await client.connect();
//     db = client.db(dbName);
//     console.log("✅ Connected to MongoDB Atlas:", dbName);
//   }
//   return db;
// };


// //MSSQL SETUP



// // const baseConfig = {
// //   user: process.env.MSSQL_USER,
// //   password: process.env.MSSQL_PASSWORD,
// //   server: process.env.MSSQL_SERVER,
// //   options: {
// //     encrypt: false,
// //     trustServerCertificate: true,
// //   },
// // };

// // const mssqlPools = {};
// // const dbName1 = process.env.MSSQL_DB_NAME;
// // export const connectMSSQL = async (dbName1) => {
// //   if (!mssqlPools[dbName1]) {
// //     try {
// //       const dbConfig = { ...baseConfig, database: dbName1 };
// //       const pool = new sql.ConnectionPool(dbConfig);
// //       await pool.connect();
// //       console.log(`✅ Connected to MSSQL DB: ${dbName1}`);
// //       mssqlPools[dbName1] = pool;
// //     } catch (error) {
// //       console.error(`❌ MSSQL connection error for ${dbName1}:`, error.message);
// //       throw error;
// //     }
// //   } else if (!mssqlPools[dbName1].connected) {
// //     // If pool exists but disconnected, reconnect
// //     try {
// //       await mssqlPools[dbName1].connect();
// //       console.log(`✅ Reconnected to MSSQL DB: ${dbName1}`);
// //     } catch (error) {
// //       console.error(`❌ MSSQL reconnection error for ${dbName}:`, error.message);
// //       throw error;
// //     }
// //   }
// //   return mssqlPools[dbName];
// // };


import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let isConnected = false;

export const connectMongo = async (dbName) => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("✅ Connected to MongoDB Atlas");
  }

  return client.db(dbName); // You now pass any db name you want
};

export const getMongoClient = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("✅ Connected to MongoDB Atlas");
  }
  return client; // Full MongoClient for admin access
};