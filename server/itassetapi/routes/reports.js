const express = require("express");
const router = express.Router();
const { getReportFilters, getFilteredReports, getReportMenu, getCompanyWiseReport, getVendorWiseReport, getVendorCostByCompanyReport,
        getProductWiseReport, getCompanyMonthlyEquivalentReport, getCompanyYearlyEquivalentReport, getProductMonthlyEquivalentReport,
        getProductYearlyEquivalentReport, getVendorYearlyEquivalentReport , getVendorMonthlyEquivalentReport,getCompanyEquivalentReport,getProductEquivalentReport, getVendorEquivalentReport } = require("../controllers/reportController");

router.get("/reports", getReportFilters);
router.post("/reports/data", getFilteredReports);
router.get("/reports/menu", getReportMenu);
router.get("/reports/R001", getCompanyWiseReport);
router.get("/reports/R002", getVendorWiseReport);
router.get("/reports/R003", getVendorCostByCompanyReport);
router.get("/reports/R004", getProductWiseReport);
router.get("/reports/R005", getCompanyEquivalentReport);
router.get("/reports/R006", getCompanyYearlyEquivalentReport);
router.get("/reports/R007", getProductEquivalentReport);
router.get("/reports/R008", getProductYearlyEquivalentReport);
router.get("/reports/R009", getVendorEquivalentReport);
router.get("/reports/R010", getVendorMonthlyEquivalentReport);
module.exports = router;
