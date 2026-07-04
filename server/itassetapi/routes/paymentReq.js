const express = require("express");
const router = express.Router();

const { createPaymentRequest, getPaymentRequestById, getPaymentRequests, updatePaymentRequest, getLastPRFNumber, deletePaymentRequest, updateGenarate, getVatPercentage, createPRF, getApprovalWorkflow, getPreviewPRF, incrementPRFExportCount, unpostPRFTransaction, postPRFTransaction } = require("../controllers/paymentReqController");

router.post("/payment-requests", createPaymentRequest);
router.get("/payment-requests/:id", getPaymentRequestById);
router.get("/payment-requests", getPaymentRequests);
router.put("/payment-requests/:id", updatePaymentRequest);
router.delete("/payment-requests/:id", deletePaymentRequest);
router.get("/last-prf-number", getLastPRFNumber);
router.put("/payment-requests/:id/generate", updateGenarate);
router.get("/vat-percentage", getVatPercentage);
router.get("/approval-workflow", getApprovalWorkflow);
router.post("/create-prf", createPRF);
router.get("/preview-prf/:prfNum", getPreviewPRF);
router.post("/prf-export/:prfNum", incrementPRFExportCount);
router.put("/unpost-prf/:prfNum", unpostPRFTransaction);
router.put("/post-prf/:prfNum", postPRFTransaction);
module.exports = router;