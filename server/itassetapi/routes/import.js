const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { exportColumnNames, importTable } = require("../controllers/importController");

router.get("/export-columns/:module_id", exportColumnNames);
router.post("/import-table/:module_id", upload.single("file"), importTable);

module.exports = router;