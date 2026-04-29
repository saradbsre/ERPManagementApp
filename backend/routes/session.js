const express = require("express");
const router = express.Router();

const { upsertModule, upsertModuleColumn, runModuleGeneration, getSections , dataTypes, currencises, getMasterValues, billingCycle  } = require("../controllers/sectionController");

router.post("/modules", upsertModule);
router.post("/columns", upsertModuleColumn);
router.post("/generate-modules", runModuleGeneration);
router.get("/sections", getSections);
router.get("/data-types", dataTypes);
router.get("/currencies", currencises);
router.get("/master-data", getMasterValues);
router.get("/billing-cycle", billingCycle);
module.exports = router;