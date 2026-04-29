const express = require("express");
const router = express.Router();
const { getModuleData, createModuleRow, updateModuleRow, deleteModuleRow} = require("../controllers/dataController");

router.get("/module-data/:module_id", getModuleData);
router.post("/module-data/:module_id", createModuleRow);
router.put("/module-data/:module_id/:row_id", updateModuleRow);
router.delete("/module-data/:module_id/:row_id", deleteModuleRow);

module.exports = router;