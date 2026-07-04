const express = require("express");
const router = express.Router();
const { getDisplayname, getModuleData, createModuleRow, updateModuleRow, deleteModuleRow, upsertSavedFilter, getCustomizedColumns, upsertCustomizedColumns, cancelModuleRow, undoCancelModuleRow} = require("../controllers/dataController");

router.get("/displayname", getDisplayname);
router.get("/module-data/:module_id", getModuleData);
router.post("/module-data/:module_id", createModuleRow);
router.put("/module-data/:module_id/:row_id", updateModuleRow);
router.delete("/module-data/:module_id/:row_id", deleteModuleRow);
router.post("/saved-filters/:user_id", upsertSavedFilter);
router.get("/custom-columns/:module_id", getCustomizedColumns);
router.post("/custom-columns/:module_id", upsertCustomizedColumns);
router.delete("/module-data/:module_id/:row_id/cancel", cancelModuleRow);
router.post("/module-data/:module_id/:row_id/undo-cancel", undoCancelModuleRow);
module.exports = router;