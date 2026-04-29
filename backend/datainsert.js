const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { sql, poolPromise } = require("./db/db");

const router = express.Router();
const upload = multer({ dest: "uploads/" });


router.post("/upload-subscription", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) {
      return res.status(400).json({ message: "Excel is empty" });
    }

    const pool = await poolPromise;

    for (const row of data) {
      await pool.request()
        .input("provider_name", sql.VarChar(50), row["Provider Name"])
        .input("planprovider", sql.VarChar(20), row["Plan/Provider"])
        .input("company_name", sql.VarChar(30), row["Company Name"])
        .input("term", sql.VarChar(10), row["Term"])
        .input("payment_method", sql.VarChar(50), row["Payment Method"])
        .input("card_handle", sql.VarChar(50), row["Credit Card Handling By"])

        .input("amount_aed", sql.Int, parseNumber(row["Amount(AED)"]))
        .input("amount_usd", sql.Int, parseNumber(row["Amount(USD)"]))
        .input("amount_eur", sql.Int, parseNumber(row["Amount(EUR)"]))
        .input("amount_gbp", sql.Int, parseNumber(row["Amount(GBP)"]))

        .input("monthly", sql.Int, parseNumber(row["Total Cost Monthly(AED)"]))
        .input("yearly", sql.Int, parseNumber(row["Total Cost Yearly(AED)"]))

        .input("userid", sql.NVarChar(30), "admin")

        .query(`
          INSERT INTO tbl_subscription (
            provider_name,
            planprovider,
            company_name,
            term,
            payment_method,
            card_handle,
            amount_aed,
            amount_usd,
            amount_eur,
            amount_gbp,
            total_cost_monthly_aed,
            total_cost_yearly_aed,
            is_active,
            created_at,
            sysdate,
            userid,
            audit_rev
          )
          VALUES (
            @provider_name,
            @planprovider,
            @company_name,
            @term,
            @payment_method,
            @card_handle,
            @amount_aed,
            @amount_usd,
            @amount_eur,
            @amount_gbp,
            @monthly,
            @yearly,
            1,
            GETDATE(),
            GETDATE(),
            @userid,
            1
          )
        `);
    }

    res.json({ message: "Subscription data inserted ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🔧 helper to clean numbers like "1,294.29"
function parseNumber(val) {
  if (!val) return null;
  return parseFloat(val.toString().replace(/,/g, ""));
}

module.exports = router;