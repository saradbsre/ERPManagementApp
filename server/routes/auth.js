// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import sql from "mssql";
import { connectMssql as connectMasterPool } from "../config/masterdb.js";
import os from "os";
import pkg from "node-machine-id";
import CryptoJS from "crypto-js";
const { machineIdSync } = pkg;
import { DateTime } from "luxon";

import * as bsredb from "../config/bsredb.js";
import * as ralsdb from "../config/ralsdb.js";
import * as awsdb from "../config/awsdb.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// ---------- helpers ----------
function safeDbName(name) {
  return String(name || "").replace(/[^a-zA-Z0-9_]/g, "");
}

function pickDomainFromSessionOrProvided(req, provided) {
  console.log("pickDomainFromSessionOrProvided called with provided:", provided);
  let domainName = provided;
  if (!domainName && req.session?.companyDataSources) {
    const keys = Object.keys(req.session.companyDataSources);
    if (keys.length === 1) domainName = keys[0];
  }
  console.log("Picked domainName:", domainName);
  return domainName;
}

// Helper to get DB pool by domainName
async function getDbByDomain(domainName) {
  const bsreDomains = [
    "erp.bsre.binshabibgroup.ae",
    "erp.cs.binshabibgroup.ae",
    "erp.hamda.binshabibgroup.ae",
    "erp.csop.binshabibgroup.ae",
    "erp.bsreop.binshabibgroup.ae"
  ];
  const ralsDomains = [
    "erp.saeedcont.binshabibgroup.ae",
    "erp.manjal.binshabibgroup.ae",
    "erp.firehub.ae",
    "erp.saeedproperty.ae",
    "erp.bank.binshabibgroup.ae"
  ];

  const awsDomains = [
    "erp.ralscont.binshabibgroup.ae",
    "erp.awsinvestment.ae",
    "erp.op.awsinvestment.ae"
  ];

  if (bsreDomains.includes(domainName)) {
    return { db: await bsredb.connectMssql(), configName: "bsredb" };
  } else if (ralsDomains.includes(domainName)) {
    return { db: await ralsdb.connectMssql(), configName: "ralsdb" };
  } else if (awsDomains.includes(domainName)) {
    return { db: await awsdb.connectMssql(), configName: "awsdb" };
  }
  throw new Error("Unknown domain/server for DB connection: " + domainName);
}

// const allowedDomains = [".binshabibgroup.ae", ".manjalgranites.ae", ".firehub.ae"];
// let cookieDomain = null;
// if (allowedDomains.includes(domainName)) {
//   cookieDomain = domainName;
// }

// ---------- routes ----------

// POST /user/divisions
router.post("/user/divisions", async (req, res) => {
  const { username, password, companyid } = req.body;

  if (!username)
    return res.status(200).json({ success: false, message: "Username is required." });
  if (!password)
    return res.status(200).json({ success: false, message: "Password is required." });
  if (!companyid)
    return res.status(200).json({ success: false, message: "companyid is required." });

  try {
    // MASTER pool (CENTRALIZEDDB lives here)
    const masterPool = await connectMasterPool();

    // Use fully qualified table name so we don't need "USE CENTRALIZEDDB"
    const companiesResult = await masterPool
      .request()
      .input("companyid", sql.VarChar, companyid)
      .query(
        `SELECT * FROM CENTRALIZEDDB.dbo.IntegratedCompany WHERE domainLink1 = @companyid`
      );

    const companies = companiesResult.recordset || [];
    companies.sort((a, b) => new Date(b.afDate) - new Date(a.afDate));

    const grouped = {};
    for (const comp of companies) {
      const name = comp.companyName;
      if (!grouped[name]) grouped[name] = comp; // keep most recent due to sort
    }

    const mostRecentCompanies = Object.values(grouped);

    if (mostRecentCompanies.length === 0) {
      return res.status(200).json({ success: false, message: "No companies found." });
    }

    const foundCompanies = [];

    for (const company of mostRecentCompanies) {
      const dbName = safeDbName(company.CompanyDb);
      if (!dbName) continue;

      let dbPool, configName;
      try {
        console.log("Getting DB for domain:", company.domainLink1);
        ({ db: dbPool, configName } = await getDbByDomain(company.domainLink1));
      } catch (err) {
        console.error("Unknown domain for company:", company.domainLink1);
        continue;
      }

      console.log(
        `Using DB config: ${configName} for company: ${company.companyName}, domain: ${company.domainLink1}, db: ${dbName}`
      );

      const userQuery = `
        SELECT TOP (1) roleid
        FROM [${dbName}].dbo.tbluser
        WHERE Uname COLLATE Latin1_General_CS_AS = @uname
          AND CAST(DECRYPTBYPASSPHRASE('I CANT TELL YOU', password) AS VARCHAR(8000)) = @pw and disabled = 0
      `;

      const userResult = await dbPool
        .request()
        .input("uname", sql.VarChar, username)
        .input("pw", sql.VarChar, password)
        .query(userQuery);

      const user = userResult.recordset?.[0];
      if (!user) continue;

      foundCompanies.push({
        CompanyName: company.companyName,
        dbName: company.CompanyDb,
        CompanyCode: company.Cocode,
        CompanyStartDate: company.afDate,
        CompanyEndDate: company.alDate,
        roleid: user.roleid,
        exeServerPath: company.LocalFolderpath,
      });
    }

    if (foundCompanies.length === 0) {
      return res.status(200).json({ success: false, message: "Incorrect username or password." });
    }

    // keep unique format
    const uniqueCompanies = foundCompanies.map(
      ({ CompanyName, CompanyCode, dbName, CompanyStartDate, CompanyEndDate, roleid, exeServerPath }) => ({
        CompanyName,
        CompanyCode,
        dbName,
        CompanyStartDate,
        CompanyEndDate,
        roleid,
        exeServerPath,
      })
    );

    return res.status(200).json({ success: true, companies: uniqueCompanies });
  } catch (error) {
    console.error("Internal server error:", error);
    return res.status(200).json({ success: false, message: "Internal server error" });
  }
});

// GET /company/datasource?domainName=...
router.get("/company/datasource", async (req, res) => {
  const { domainName } = req.query;
  if (!domainName) {
    return res.status(400).json({ success: false, message: "domainName is required" });
  }

  try {
    const masterPool = await connectMasterPool();

    const companiesResult = await masterPool
      .request()
      .input("domainName", sql.VarChar, domainName)
      .query(
        "SELECT * FROM CENTRALIZEDDB.dbo.IntegratedCompany WHERE domainLink1 = @domainName"
      );

    const companies = companiesResult.recordset || [];
    if (companies.length === 0) {
      return res.status(404).json({ success: false, message: "No companies found for this domain" });
    }

    const grouped = {};
    for (const comp of companies) {
      const name = comp.companyName;
      if (!grouped[name] || new Date(comp.afDate) > new Date(grouped[name].afDate)) {
        grouped[name] = comp;
      }
    }
    const mostRecentCompanies = Object.values(grouped);

    const companyList = mostRecentCompanies.map((company) => {
      let dataSource = null;
      if (company.VEconnstring) {
        const match = company.VEconnstring.match(/Data Source=([^;]+)/i);
        if (match) dataSource = match[1];
      }
      return {
        CompanyName: company.companyName,
        dbName: company.CompanyDb,
        dataSource,
        domainLink1: company.domainLink1,
      };
    });

    // ✅ store BOTH datasource and dbName for the domain
    if (req.session) {
      if (!req.session.companyDataSources) req.session.companyDataSources = {};
      if (companyList.length > 0) {
        req.session.companyDataSources[domainName] = {
          domainLink1: companyList[0].domainLink1,
          dataSource: companyList[0].dataSource,
          dbName: companyList[0].dbName,
        };
      }
    }

    console.log("Session Data Sources:", req.session?.companyDataSources);

    return res.status(200).json({ success: true, companies: companyList });
  } catch (error) {
    console.error("Error in /company/datasource:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /companies/fiscal-years?companyName=...&companyid=...&username=...&password=...&domainName=...
router.get("/companies/fiscal-years", async (req, res) => {
  const { companyName, companyid, username, password, domainName: queryDomain } = req.query;

  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);
  if (!domainName) {
    return res.status(400).json({
      message:
        "Domain name not set in session or query. Please call /company/datasource first or provide domainName in query.",
    });
  }

  let dbPool, configName;
  try {
    ({ db: dbPool, configName } = await getDbByDomain(domainName));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  console.log(`Using DB config: ${configName}, domainName: ${domainName}`);

  try {
    // Query CENTRALIZEDDB from MASTER pool (not domain pool)
    const masterPool = await connectMasterPool();

    const companiesResult = await masterPool
      .request()
      .input("companyName", sql.VarChar, companyName)
      .input("companyid", sql.VarChar, companyid)
      .query(`
        SELECT companyName, Cocode, CompanyDb, afDate, alDate, LocalFolderpath
        FROM CENTRALIZEDDB.dbo.IntegratedCompany
        WHERE companyName = @companyName
          AND domainLink1 = @companyid
      `);

      console.log("Fetched companies for fiscal years:", companiesResult.recordset);

    const companies = companiesResult.recordset || [];
    companies.sort((a, b) => new Date(b.afDate) - new Date(a.afDate));
    if (companies.length === 0) return res.json([]);

    const checks = companies.map(async (c) => {
      const dbName = safeDbName(c.CompanyDb);
      if (!dbName) return null;

      const userQuery = `
        SELECT TOP (1) roleid
        FROM [${dbName}].dbo.tbluser
        WHERE Uname COLLATE Latin1_General_CS_AS = @uname
          AND CAST(DECRYPTBYPASSPHRASE('I CANT TELL YOU', password) AS VARCHAR(8000)) = @pw and disabled = 0
      `;

      // ✅ use the selected domain pool, not global sql.Request()
      const userResult = await dbPool
        .request()
        .input("uname", sql.VarChar, username)
        .input("pw", sql.VarChar, password)
        .query(userQuery);

      const user = userResult.recordset?.[0];
      if (!user) return null;
       console.log("User found in company DB:", dbName, user);
      return {
        CompanyName: c.companyName,
        CompanyCode: c.Cocode,
        dbName: c.CompanyDb,
        CompanyStartDate: c.afDate,
        CompanyEndDate: c.alDate,
        roleid: user.roleid,
      };
    });

    const result = (await Promise.all(checks)).filter(Boolean);
    return res.json(result);
  } catch (error) {
    console.error("Internal server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /modules
router.post("/modules", async (req, res) => {
  const { username, companydb, domainName: queryDomain } = req.body;

  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);
  if (!domainName) {
    return res.status(400).json({
      message:
        "Domain name not set in session or body. Please call /company/datasource first or provide domainName in body.",
    });
  }

  let dbPool, configName;
  try {
    ({ db: dbPool, configName } = await getDbByDomain(domainName));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  console.log(`Using DB config: ${configName}, domainName: ${domainName}`);

  if (!username || !companydb) {
    return res.status(400).json({ message: "username and companydb are required" });
  }

  try {
    const dbName = safeDbName(companydb);
    if (!dbName) return res.status(400).json({ message: "Invalid companydb" });

    const userResult = await dbPool
      .request()
      .input("uname", sql.VarChar, username)
      .query(`
        SELECT TOP (1) roleid
        FROM [${dbName}].dbo.tbluser
        WHERE Uname COLLATE Latin1_General_CS_AS = @uname AND disabled = 0
      `);

    const user = userResult.recordset?.[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const rolesResult = await dbPool
      .request()
      .input("roleid", sql.VarChar, String(user.roleid))
      .query(`
        SELECT DISTINCT App_Id
        FROM [${dbName}].dbo.role2
        WHERE roleid = @roleid AND access = 'YES'
      `);

    const allowedApps = rolesResult.recordset.map((r) => r.App_Id);
    return res.status(200).json({ allowedApps });
  } catch (error) {
    console.error("Error fetching allowed modules:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /login
router.post("/login", async (req, res) => {
  const { username, dbName, region, browser, domainName } = req.body;
  console.log("Login Request -----------------------------------------------")
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });

  function generateSessionId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const computerName = os.hostname();
  const machineId = machineIdSync();
  const sessionId = generateSessionId() + computerName;
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" });
  console.log("login time:", now);
  const nowDubai = new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" });
  const dt = new Date(nowDubai);
  const formatted = DateTime.now().setZone("Asia/Dubai").toFormat("yyyy-MM-dd HH:mm:ss.SSS");

  console.log(formatted);
  let dbPool, configName;
  try {
    ({ db: dbPool, configName } = await getDbByDomain(domainName));
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  console.log(`Using DB config: ${configName}, domainName: ${domainName}`);

  try {
    const safeDb = safeDbName(dbName);
    if (!safeDb) return res.status(400).json({ success: false, message: "Invalid dbName" });

    const trimmedUsername = String(username || "").trim();

    const checkResult = await dbPool
      .request()
      .input("uname", sql.VarChar, trimmedUsername)
      .query(`
        SELECT TOP 1 * FROM [${safeDb}].dbo.WebLoginSessions
        WHERE RTRIM(LTRIM(Username)) = @uname
      `);

    if (checkResult.recordset.length > 0) {
      return res.status(200).json({
        success: false,
        message: "User is already logged in another session.",
      });
    }
   
    await dbPool
      .request()
      .input("SessionID", sql.VarChar, sessionId)
      .input("MachineID", sql.VarChar, machineId)
      .input("ComputerName", sql.VarChar, computerName)
      .input("Username", sql.VarChar, trimmedUsername)
      .input("Region", sql.VarChar, region || "")
      .input("Browser", sql.VarChar, browser || "")
      .input("DomainName", sql.VarChar, domainName || "")
      .input("StartTime", sql.VarChar, formatted)
      .input("LastUpdatedTime", sql.VarChar, formatted)
      .query(`
        INSERT INTO [${safeDb}].dbo.WebLoginSessions
          (SessionID, MachineID, ComputerName, Username, Region, Browser, DomainName, StartTime, LastUpdatedTime)
        VALUES
          (@SessionID, @MachineID, @ComputerName, @Username, @Region, @Browser, @DomainName, @StartTime, @LastUpdatedTime)
      `);

    const sessionData = {
      sessionId,
      machineId,
      computerName,
      uname: trimmedUsername,
      region,
      browser,
      startTime: formatted,
    };

    const secret = process.env.COOKIE_SECRET;
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(sessionData), secret).toString();

    let cookieDomain = null;
    if (domainName.endsWith(".binshabibgroup.ae")) {
      cookieDomain = ".binshabibgroup.ae";
    } else if (domainName.endsWith(".manjalgranites.ae")) {
      cookieDomain = ".manjalgranites.ae";
    } else if (domainName.endsWith(".firehub.ae")) {
      cookieDomain = ".firehub.ae";
    } else if (domainName.endsWith(".awsinvestment.ae")) {
      cookieDomain = ".awsinvestment.ae";
    } else if (domainName.endsWith(".saeedproperty.ae")) {
      cookieDomain = ".saeedproperty.ae";
    }

    // NOTE: I kept your cookie settings as-is, but security-wise httpOnly should be true.
    res.cookie("erp_session", encrypted, {
      httpOnly: false,
      secure: true,    // true for live
      sameSite: "none",   // none for live
      maxAge: 5 * 60 * 60 * 1000,
      path: "/",
      //domain: ".binshabibgroup.ae",

      /* For future addition of domain just create sub domain 
      based on parent domain and point to api service */
      ...(cookieDomain ? { domain: cookieDomain } : {})
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      username: trimmedUsername,
      sessionId,
    });
  } catch (err) {
    console.error("Error in LoginSessions:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /logged-in-users?dbName=...&domainName=...
router.get("/logged-in-users", async (req, res) => {
  const { dbName, domainName: queryDomain } = req.query;
  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);

  if (!dbName || !domainName) {
    return res.status(400).json({ message: "dbName and domainName are required" });
  }

  try {
    const { db: dbPool } = await getDbByDomain(domainName);
    const safeDb = safeDbName(dbName);
    if (!safeDb) return res.status(400).json({ message: "Invalid dbName" });

    const result = await dbPool.request().query(`
      SELECT Username, ComputerName, StartTime, SessionID
      FROM [${safeDb}].dbo.WebLoginSessions
    `);

    return res.status(200).json({ users: result.recordset });
  } catch (error) {
    console.error("Error fetching logged-in users:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/get-connection", async (req, res) => {
  const { companydb } = req.query;
  if (!companydb) {
    return res.status(400).json({ message: "companydb is required" });
  }

  try {
    const masterPool = await connectMasterPool();

    const companyResult = await masterPool
      .request()
      .input("companydb", sql.VarChar, companydb)
      .query(
        "SELECT VEconnstring FROM CENTRALIZEDDB.dbo.IntegratedCompany WHERE CompanyDb = @companydb"
      );

    const company = companyResult.recordset?.[0];
    if (!company?.VEconnstring) {
      return res.status(404).json({ message: "VEconnstring not found for this companydb" });
    }
    return res.json({ VEconnstring: company.VEconnstring });
  } catch (error) {
    console.error("Error fetching TBConnStr:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

// POST /logout
router.post("/logout", async (req, res) => {
  const { username, dbName, domainName: queryDomain } = req.body;
  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);

  if (!username || !dbName || !domainName) {
    return res.status(400).json({
      success: false,
      message: "Username, dbName, and domainName are required",
    });
  }

  try {
    const { db: dbPool } = await getDbByDomain(domainName);
    const safeDb = safeDbName(dbName);
    if (!safeDb) return res.status(400).json({ success: false, message: "Invalid dbName" });


    let cookieDomain = null;
    if (domainName.endsWith(".binshabibgroup.ae")) {
      cookieDomain = ".binshabibgroup.ae";
    } else if (domainName.endsWith(".manjalgranites.ae")) {
      cookieDomain = ".manjalgranites.ae";
    } else if (domainName.endsWith(".firehub.ae")) {
      cookieDomain = ".firehub.ae";
    } else if (domainName.endsWith(".awsinvestment.ae")) {
      cookieDomain = ".awsinvestment.ae";
    } else if (domainName.endsWith(".saeedproperty.ae")) {
      cookieDomain = ".saeedproperty.ae";
    }
    const result = await dbPool
      .request()
      .input("username", sql.VarChar, username)
      .query(`DELETE FROM [${safeDb}].[dbo].[WebLoginSessions] WHERE [Username] = @username`);


    res.clearCookie("erp_session", {
      httpOnly: false,
      secure: true,  // true for live
      sameSite: "none",  // none for live
      path: "/",
      //domain: ".binshabibgroup.ae",
      ...(cookieDomain ? { domain: cookieDomain } : {})   // For future addition of domain just create sub domain
    });

    // console.log("---- COOKIE DEBUG ----");
    // console.log("Request Host:", req.headers.host);
    // console.log("domainName from body:", domainName);
    // console.log("cookieDomain to be set:", cookieDomain);
    // console.log("Cookie options:", {
    //   httpOnly: false,
    //   secure: false,
    //   sameSite: "lax",
    //   maxAge: 5 * 60 * 60 * 1000,
    //   path: "/",
    //  // ...(cookieDomain ? { domain: cookieDomain } : {})   // For future addition of domain just create sub domain
    // });

    if (req.session) {
      req.session.destroy((err) => {
        if (err) console.error("Error destroying session:", err);
      });
    }

    return res.status(200).json({
      success: true,
      deletedSessions: result.rowsAffected?.[0] || 0,
      message: "User logged out successfully.",
    });
  } catch (err) {
    console.error("Error during logout:", err);
    return res.status(200).json({
      success: true,
      warning: true,
      message: "User logged out successfully, but session cleanup could not be completed.",
      errorCode: "SESSION_CLEANUP_WARNING",
    });
  }
});

// POST /update-activity
router.post("/update-activity", async (req, res) => {
  const { username, sessionId, dbName, domainName: queryDomain } = req.body;
  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);

  if (!username || !sessionId || !dbName || !domainName) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const { db: dbPool } = await getDbByDomain(domainName);
    const safeDb = safeDbName(dbName);
    if (!safeDb) return res.status(400).json({ success: false, message: "Invalid dbName" });

   const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" });
 // console.log("login time:", now);
  const nowDubai = new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" });
  const dt = new Date(nowDubai);
  const formatted = DateTime.now().setZone("Asia/Dubai").toFormat("yyyy-MM-dd HH:mm:ss.SSS");

  const result = await dbPool
  .request()
  .input("now", sql.VarChar, formatted)
  .input("username", sql.VarChar, username)
  .input("sessionId", sql.VarChar, sessionId)
  .query(`
    UPDATE [${safeDb}].dbo.WebLoginSessions
    SET LastUpdatedTime = @now
    WHERE Username = @username 
  `);

  // WHERE Username = @username AND SessionID = @sessionId  removed by agalya by 03/02/2026

console.log("Update result:", result.rowsAffected);
if (result.rowsAffected[0] === 0) {
  console.warn("No session updated! Check username/sessionId/dbName/domainName.");
  console.log("updated username:", username);
  console.log("parameters:", { username, sessionId, dbName, domainName });
}

    return res.json({ success: true });
  } catch (err) {
    console.error("update-activity error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});


router.post("/update-computername", async (req, res) => {
  const { username, sessionId, dbName, domainName: queryDomain, computerName } = req.body;
  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);

  if (!username || !sessionId || !dbName || !domainName || !computerName) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const { db: dbPool } = await getDbByDomain(domainName);
    const safeDb = safeDbName(dbName);
    if (!safeDb) return res.status(400).json({ success: false, message: "Invalid dbName" });

    const formatted = DateTime.now().setZone("Asia/Dubai").toFormat("yyyy-MM-dd HH:mm:ss.SSS");

    const result = await dbPool
      .request()
      .input("now", sql.VarChar, formatted)
      .input("username", sql.VarChar, username)
      .input("sessionId", sql.VarChar, sessionId)
      .input("computerName", sql.VarChar, computerName)
      .query(`
        UPDATE [${safeDb}].dbo.WebLoginSessions
        SET  ComputerName = @computerName
        WHERE Username = @username AND SessionID = @sessionId
      `);

    console.log("Update result:", computerName, result.rowsAffected);
    if (result.rowsAffected[0] === 0) {
      console.warn("No session updated! Check username/sessionId/dbName/domainName.");
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("update-computername error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /session-info
router.get("/session-info", async (req, res) => {
  const { username, sessionId, dbName, domainName: queryDomain } = req.query;
  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);

  if (!username || !sessionId || !dbName || !domainName) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  try {
    const { db: dbPool } = await getDbByDomain(domainName);
    const safeDb = safeDbName(dbName);
    if (!safeDb) return res.status(400).json({ success: false, message: "Invalid dbName" });

    const result = await dbPool
      .request()
      .input("username", sql.VarChar, username)
      .input("sessionId", sql.VarChar, sessionId)
      .query(`
        SELECT LastUpdatedTime
        FROM [${safeDb}].dbo.WebLoginSessions
        WHERE Username = @username AND SessionID = @sessionId
      `);

    if (!result.recordset?.[0]) return res.json({ success: false });

    return res.json({ success: true, lastUpdatedTime: result.recordset[0].LastUpdatedTime });
  } catch (err) {
    console.error("session-info error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// debug
router.get("/debug/list-dbs", async (req, res) => {
  try {
    const dbPool = await ralsdb.connectMssql();
    const result = await dbPool.request().query("SELECT name FROM sys.databases");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/modules/:moduleName/allow-multiple-tabs?companydb=...
router.get("/modules/:moduleName/allow-multiple-tabs", async (req, res) => {
  const { moduleName } = req.params;
  const { companydb, domainName: queryDomain } = req.query;
  const domainName = pickDomainFromSessionOrProvided(req, queryDomain);

  if (!moduleName || !companydb || !domainName) {
    return res.status(400).json({ success: false, message: "moduleName, companydb, and domainName are required" });
  }

  try {
    // Get the correct DB pool based on domain
    let dbPool, configName;
    try {
      ({ db: dbPool, configName } = await getDbByDomain(domainName));
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const safeDb = safeDbName(companydb);
    if (!safeDb) {
      return res.status(400).json({ success: false, message: "Invalid companydb" });
    }

    // Query the ModuleConfiguration table in the selected DB for the Limit flag
    const result = await dbPool.request()
      .input("moduleName", sql.VarChar, moduleName)
      .query(`
        SELECT CuncurrentExe
        FROM [${safeDb}].dbo.tblapplication
        WHERE App_id = @moduleName
      `);

    if (!result.recordset[0]) {
      return res.status(404).json({ success: false, message: "Module not found" });
    }
   // console.log("Module allow-multiple-tabs result:", result);

    return res.json({
      success: true,
      limit: result.recordset[0].CuncurrentExe
    });
  } catch (err) {
    console.error("allow-multiple-tabs error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/company/connstring", async (req, res) => {
  const { companyCode, dbName } = req.query;
  if (!companyCode || !dbName) {
    return res.status(400).json({ success: false, message: "companyCode and dbName are required" });
  }

  try {
    // Query CENTRALIZEDDB for the company
    const masterPool = await connectMasterPool();
    const result = await masterPool
      .request()
      .input("companyCode", sql.VarChar, companyCode)
      .input("dbName", sql.VarChar, dbName)
      .query(`
        SELECT VEconnstring, ESTconnstring
        FROM CENTRALIZEDDB.dbo.IntegratedCompany
        WHERE Cocode = @companyCode AND CompanyDb = @dbName
      `);

    const company = result.recordset?.[0];
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    // Return both connection strings
    return res.status(200).json({
      success: true,
      VEconnstring: company.VEconnstring || "",
      ESTconnstring: company.ESTconnstring || ""
    });
  } catch (error) {
    console.error("Error in /company/connstring:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

async function cleanupWebLoginSessions() {
  try {
    const masterPool = await connectMasterPool();
    const result = await masterPool.request().query(`
      SELECT companyName, domainLink1, CompanyDb, afDate
      FROM CENTRALIZEDDB.dbo.IntegratedCompany
      WHERE domainLink1 IS NOT NULL AND domainLink1 <> ''
    `);

    // Group by (domainLink1, companyName), pick the latest afDate for each
    const grouped = {};
    for (const row of result.recordset) {
      const key = `${row.domainLink1}||${row.companyName}`;
      if (!grouped[key] || new Date(row.afDate) > new Date(grouped[key].afDate)) {
        grouped[key] = row;
      }
    }

    for (const key in grouped) {
      const { domainLink1, CompanyDb, companyName } = grouped[key];
      if (!CompanyDb) continue;
      let dbPool;
      try {
        ({ db: dbPool } = await getDbByDomain(domainLink1));
      } catch (err) {
        console.error(`[CLEANUP] Skipping unknown domain: ${domainLink1}`);
        continue;
      }
      try {
        // 1. Get expired sessions
        const expired = await dbPool.request().query(`
          SELECT Username, LastUpdatedTime
          FROM [${CompanyDb}].dbo.WebLoginSessions
          WHERE DATEDIFF(MINUTE, LastUpdatedTime, GETDATE()) > 20
        `);

        const now = new Date();
        if (expired.recordset.length === 0) {
          //console.log(`[CLEANUP] No expired sessions in ${CompanyDb} (${domainLink1}, ${companyName})`);
        } else {
          for (const user of expired.recordset) {
            console.log(
              `[CLEANUP] Deleting user "${user.Username}" from ${CompanyDb} (${domainLink1}, ${companyName}) | LastUpdatedTime: ${user.LastUpdatedTime} | DeletedAt: ${now.toISOString()}`
            );
          }
        }

        // 2. Delete expired sessions
        await dbPool.request().query(`
          DELETE FROM [${CompanyDb}].dbo.WebLoginSessions
          WHERE DATEDIFF(MINUTE, LastUpdatedTime, GETDATE()) > 20
        `);
      } catch (err) {
        console.error(`[CLEANUP ERROR] in ${CompanyDb}:`, err);
      }
    }
  } catch (err) {
    console.error("[CLEANUP] Master DB error:", err);
  }
}

// Run every 5 minutes
setInterval(cleanupWebLoginSessions, 5 * 60 * 1000);
cleanupWebLoginSessions(); // Also run once on startup




export default router;
