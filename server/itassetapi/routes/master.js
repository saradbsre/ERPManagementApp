const express = require("express");
const router = express.Router();

const { getMasters, getMasterData, createMasterData, updateMasterData, deleteMasterData, saveProviderPlans, getProviderPlans, addMasterData  } = require("../controllers/masterController");

router.get("/masters", getMasters);
router.get("/masters/:master_name", getMasterData);
router.post("/masters/:master_name", createMasterData);
router.put("/masters/:master_name/:id", updateMasterData);
router.delete("/masters/:master_name/:id", deleteMasterData);
router.post("/providers/plans", saveProviderPlans);
router.get("/providers/:provider_id/plans", getProviderPlans);
router.post("/masters/:master_name/add", addMasterData);

module.exports = router;