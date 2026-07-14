const express = require("express");
const router = express.Router();
const { extractPdfData } = require("../controllers/pdfController");
const { authenticateToken } = require("../middleware/auth");

router.post("/extract", authenticateToken, extractPdfData);

module.exports = router;

