import express from "express";
import dotenv from "dotenv";
import { connectMssql } from "./config/masterdb.js";
import cors from "cors";
import session from "express-session";
import authRoutes  from "./routes/auth.js"; // import auth routes
import itassetapi from "./itassetapi/server.js"
//import authRoutes , { preloadUserCompanies } from "./routes/auth.js";
dotenv.config();
import cookieParser from "cookie-parser";
const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174", // Added for local dev
    "https://erpwebapp-client.onrender.com",
    "https://erp.bsre.binshabibgroup.ae",
    "https://erp.saeedcont.binshabibgroup.ae",
    "https://erp.ralscont.binshabibgroup.ae",
    "https://erp.hamda.binshabibgroup.ae",
    "https://erp.cs.binshabibgroup.ae",
    "https://erp.manjal.binshabibgroup.ae",
    "https://erp.firehub.ae",
    "https://erp.awsinvestment.ae",
    "https://erp.bsreop.binshabibgroup.ae",
    "https://erp.csop.binshabibgroup.ae",
    "https://erp.op.awsinvestment.ae",
    "https://erp.saeedproperty.ae",
    "https://erpmanagementapp-frontend.onrender.com",
    "https://erp.binshabibgroup.ae",
    "https://erp.bank.binshabibgroup.ae"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use(express.json());
app.use(
  session({
    secret: "1234567890", // use a strong secret in production!
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using HTTPS
  })
);

// Mount auth routes under /api/auth
app.use("/api/auth", authRoutes);
app.use("/api/itasset", itassetapi); // Mount IT Asset API routes
app.use(cookieParser());




const moduleExePaths = {
  SYS: "C:\\VisualENTERPRISE.Net\\SYSADMIN\\sysadmin.exe",
  FIN: "C:\\VisualENTERPRISE.Net\\FINANCE\\finance.exe",
  PDC: "C:\\VisualENTERPRISE.Net\\PDC\\pdc.exe",
  OPS: "C:\\VisualENTERPRISE.Net\\OPERATIONS\\operations.exe",
  VES: "C:\\VisualENTERPRISE.Net\\VisualEstate\\Visual Estate.exe",
};

app.get('/api/modules/:moduleName/exe-path', (req, res) => {
  const moduleName = req.params.moduleName.toUpperCase();
  const exePath = moduleExePaths[moduleName];
  if (!exePath) {
    return res.status(404).json({ error: "Module not found" });
  }
  res.json({ exePath });
});

async function start() {
  try {
    await connectMssql();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

start();
