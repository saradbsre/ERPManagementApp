import WinReg from "winreg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { connectMongo } from "../dbmongo.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

const regKey = new WinReg({
  hive: WinReg.HKLM,
  key: "\\SOFTWARE\\TwoBase.Net",
});

// Fallback for 32-bit systems (optional)
const fallbackKey = new WinReg({
  hive: WinReg.HKLM,
  key: "\\SOFTWARE\\Wow6432Node\\TwoBase.Net",
});

export const getRegistryDataPath = async () => {
  return new Promise((resolve, reject) => {
    regKey.get("DataPath", (err, item) => {
      if (err || !item) {
        // Try fallback
        fallbackKey.get("DataPath", (fallbackErr, fallbackItem) => {
          if (fallbackErr || !fallbackItem) {
            reject(
              new Error("Unable to read 'DataPath' from registry under either path.")
            );
          } else {
            resolve(fallbackItem.value);
          }
        });
      } else {
        resolve(item.value);
      }
    });
  });
};

export function parseConnectionString(connectionString) {
  const parts = connectionString.split(';').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      acc[key.trim().toLowerCase()] = value.trim();
    }
    return acc;
  }, {});
  return {
    host: parts["data source"] || "",
    user: parts["uid"] || "",
    pwd: parts["pwd"] || "",
    database: parts["initial catalog"] || "",
  };
}

// export const login = async (req, res) => {
//   const { username /*, password */ } = req.body;
//   const trimmedUsername = username?.trim();
//   // const trimmedPassword = password?.trim();

//   if (!trimmedUsername /* || !trimmedPassword */) {
//     return res.status(400).json({ message: "Username is required." });
//   }

//   try {
//     const db = await connectMongo();

//     // Step 1: Check user from central db (assuming you store all users in master DB)
//     const user = await db.collection("dbo.tbluser").findOne({
//       Uname: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
//     });

//     if (!user) return res.status(401).json({ message: "User not found." });
//     if (user.disabled === true) return res.status(403).json({ message: "Account is disabled." });

//     // Password check skipped (for development/testing only)
//     // let hashedPassword = user.password;
//     // if (hashedPassword && typeof hashedPassword === "object" && hashedPassword.buffer) {
//     //   hashedPassword = Buffer.from(hashedPassword.buffer).toString("utf8");
//     // }

//     // const isMatch = await bcrypt.compare(trimmedPassword, hashedPassword);
//     // if (!isMatch) return res.status(401).json({ message: "Invalid password." });

//     // Step 2: Get company access based on user role or access table
//     let accessibleCompanies = [];

//     if (["SYS ADMIN", "System Administrator"].includes(user.roleid)) {
//       // Admins see all companies
//       accessibleCompanies = await db.collection("company").find({}).toArray();
//     } else {
//       // For others, check division access
//       const accessDocs = await db.collection("user_division").find({ uname: trimmedUsername }).toArray();
//       const allowedCodes = accessDocs.map(d => d.dv_serial);

//       accessibleCompanies = await db.collection("company").find({
//         cocode: { $in: allowedCodes }
//       }).toArray();
//     }

//     // Step 3: Return token + company list
//     const token = jwt.sign({
//       id: user._id,
//       username: user.Uname,
//       role: user.roleid,
//       userid: user.userid
//     }, JWT_SECRET, { expiresIn: "2h" });

//     return res.status(200).json({
//       message: "Login successful (username only)",
//       token,
//       username: user.Uname,
//       userid: user.userid,
//       role: user.roleid,
//       companies: accessibleCompanies.map(comp => ({
//         name: comp.coname,
//         code: comp.cocode,
//         db: comp.EstateDBName
//       }))
//     });

//   } catch (err) {
//     console.error("Login error:", err.message);
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// export const login = async (req, res) => {
//   const { username, password } = req.body;
//   const trimmedUsername = username?.trim();
//   const trimmedPassword = password?.trim();
//   if (!trimmedUsername || !trimmedPassword) {
//     return res.status(400).json({ message: "Username and password are required." });
//   }
//   try {
//     const db = await connectMongo();
//     // Step 1: Check user from central db (assuming you store all users in master DB)
//     const user = await db.collection("dbo.tbluser").findOne({
//       Uname: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
//     });
//     if (!user) return res.status(401).json({ message: "User not found." });
//     if (user.disabled === true) return res.status(403).json({ message: "Account is disabled." });

//     let hashedPassword = user.password;
//     if (hashedPassword && typeof hashedPassword === "object" && hashedPassword.buffer) {
//       hashedPassword = Buffer.from(hashedPassword.buffer).toString("utf8");
//     }
//     const isMatch = await bcrypt.compare(trimmedPassword, hashedPassword);
//     if (!isMatch) return res.status(401).json({ message: "Invalid password." });
//     // Step 2: Get company access based on user role or access table
//     let accessibleCompanies = [];
//     if (["SYS ADMIN", "System Administrator"].includes(user.roleid)) {
//       // Admins see all companies
//       accessibleCompanies = await db.collection("company").find({}).toArray();
//     } else {
//       // For others, check division access
//       const accessDocs = await db.collection("user_division").find({ uname: trimmedUsername }).toArray();
//       const allowedCodes = accessDocs.map(d => d.dv_serial);
//       accessibleCompanies = await db.collection("company").find({
//         cocode: { $in: allowedCodes }
//       }).toArray();
//     }
//     // Step 3: Return token + company list
//     const token = jwt.sign({
//       id: user._id,
//       username: user.Uname,
//       role: user.roleid,
//       userid: user.userid
//     }, JWT_SECRET, { expiresIn: "2h" });
//     return res.status(200).json({
//       message: "Login successful",
//       token,
//       username: user.Uname,
//       userid: user.userid,
//       role: user.roleid,
//       companies: accessibleCompanies.map(comp => ({
//         name: comp.coname,
//         code: comp.cocode,
//         db: comp.EstateDBName
//       }))
//     });
//   } catch (err) {
//     console.error("Login error:", err.message);
//     return res.status(500).json({ message: "Server error", error: err.message });
//   }
// };