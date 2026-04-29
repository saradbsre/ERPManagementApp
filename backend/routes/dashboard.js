const express = require("express");
const router = express.Router();
const { getTopExpensiveAssets, getAlertData, getRecentTransactions } = require("../controllers/dashboardController");

router.get("/top-expensive-assets", getTopExpensiveAssets);
router.get("/alerts", getAlertData);
router.get("/recent-transactions", getRecentTransactions);

module.exports = router;