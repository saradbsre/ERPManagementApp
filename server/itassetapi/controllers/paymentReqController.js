const { sql, poolPromise } = require("../db/db");
require("dotenv").config();
const { auditLogger } = require("../utils/auditLogger");

exports.createPaymentRequest = async (req, res) => {
  let pool;

  try {
    const { activeUserEmail } = req.query;
    const { header, details } = req.body;

    pool = await poolPromise;

    if (!header) {
      return res.status(400).json({ error: "Header data required" });
    }

    // =========================
    // 1. INSERT HEADER
    // =========================
    const request = pool.request();

    const headerResult = await request
      .input("userid", sql.NVarChar, req.user?.email || activeUserEmail || "UNKNOWN")
      .input("paid_to", sql.NVarChar, header.paid_to)
      .input("prf_number", sql.NVarChar, header.prf_number)
      .input("product_type", sql.NVarChar, header.product_type)
      .input("division", sql.NVarChar, header.division)
      .input("billing_cycle", sql.NVarChar, header.billing_cycle || 0)
      .input("mode", sql.NVarChar, header.mode)
      .input("currency", sql.NVarChar, header.currency)
      .input("payment_mode", sql.NVarChar, header.payment_mode)
      .input("description", sql.NVarChar(sql.MAX), header.description)
      
      .input("paid_by", sql.NVarChar, header.paid_by)
      .input("prepared_by", sql.NVarChar, header.prepared_by)
      .input("checked_by", sql.NVarChar, header.checked_by)
      .input("verified_by", sql.NVarChar, header.verified_by)
      .input("signed_by", sql.NVarChar, header.signed_by)
      .input("approved_by", sql.NVarChar, header.approved_by)
      .input("is_generated", sql.Bit, 0)
      .input("deleted", sql.Bit, 0)
      .query(`
        INSERT INTO payment_request (
          userid,
          paid_to, prf_number, product_type,
          division, billing_cycle, mode, currency,
          payment_mode, description,
          paid_by, prepared_by, checked_by,
          verified_by, signed_by, approved_by, is_generated, deleted
        )
        VALUES (
          @userid,
          @paid_to, @prf_number, @product_type,
          @division, @billing_cycle, @mode, @currency,
          @payment_mode, @description,
          @paid_by, @prepared_by, @checked_by,
          @verified_by, @signed_by, @approved_by, @is_generated, @deleted
        );

        SELECT SCOPE_IDENTITY() AS id;
      `);

    const headerId = headerResult.recordset[0].id;

    // =========================
    // 2. INSERT DETAILS
    // =========================
    if (details && details.length > 0) {
      for (let i = 0; i < details.length; i++) {
        const item = details[i];

        await pool.request()
          .input("header_id", sql.Int, headerId)
          .input("userid", sql.NVarChar, req.user?.email || activeUserEmail || "UNKNOWN")
          .input("doc_date", sql.Date, item.doc_date)
          .input("doc_no", sql.NVarChar, item.doc_no)
          .input("narration", sql.NVarChar(sql.MAX), item.narration)
          .input("amount", sql.Decimal(18,2), item.amount || 0)
          .input("vat", sql.Decimal(18,2), item.vat || 0)
          .input("total_amount", sql.Decimal(18,2), item.total_amount || 0)

          .query(`
            INSERT INTO payment_req_details (
              header_id,
              userid,
              doc_date,
              doc_no,
              narration,
              amount,
              vat,
              total_amount
            )
            VALUES (
              @header_id,
              @userid,
              @doc_date,
              @doc_no,
              @narration,
              @amount,
              @vat,
              @total_amount
            )
          `);
      }
    }

    // =========================
    // 3. AUDIT LOG
    // =========================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "payment_request",
      action: "CREATE",
      message: `Created payment request PRF ${header.prf_number}`,
      status: "SUCCESS",
      userid: req.user?.email || activeUserEmail || "UNKNOWN"
    });

    // =========================
    // 4. RESPONSE
    // =========================
    return res.status(201).json({
      message: "Payment Request created successfully",
      id: headerId
    });

  } catch (err) {
    console.error("CreatePaymentRequest Error:", err);

    await auditLogger({
      pool,
      transaction_id: req.query.activeUserEmail || "UNKNOWN",
      log_type: "ERROR",
      module_name: "payment_request",
      action: "CREATE",
      message: "Failed to create payment request",
      status: "FAILED",
      error_message: err.message,
      userid: req.query.activeUserEmail || "UNKNOWN"
    });

    return res.status(500).json({
      error: err.message
    });
  }
};

exports.getPaymentRequests = async (req, res) => {
  let pool;

  try {
    console.log("GetPaymentRequests called with query:", req.query); // <-- add this
    const { activeUserEmail } = req.query;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    pool = await poolPromise;

    // Fetch all payment requests
    const paymentRequestsResult = await pool.request()
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate)
      .query(`
        SELECT * FROM payment_request WHERE created_at >= @startDate AND created_at <= @endDate AND deleted = 0 ORDER BY id DESC
      `);
    const paymentRequests = paymentRequestsResult.recordset;

    // Fetch all payment_req_details
    const detailsResult = await pool.request().query(`
      SELECT * FROM payment_req_details
    `);
    const allDetails = detailsResult.recordset;

    // Attach details to each payment request
    const requestsWithDetails = paymentRequests.map(pr => {
      const details = allDetails.filter(d => d.header_id === pr.id);
      return { ...pr, details };
    });

    // ================= AUDIT =================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "payment_request",
      action: "GET",
      message: "Fetched payment requests",
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json(requestsWithDetails);

  } catch (err) {
    console.error("GetPaymentRequests Error:", err);

    await auditLogger({
      pool,
      transaction_id: req.query.activeUserEmail || "UNKNOWN",
      log_type: "ERROR",
      module_name: "payment_request",
      action: "GET",
      message: "Failed to fetch payment requests",
      status: "FAILED",
      error_message: err.message,
      userid: req.query.activeUserEmail || "UNKNOWN"
    });

    return res.status(500).json({ error: err.message });
  }
};

exports.getPaymentRequestById = async (req, res) => {
  let pool;

  try {
    const { id } = req.params;

    pool = await poolPromise;

    // HEADER
    const headerResult = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT * 
        FROM payment_request
        WHERE id = @id AND deleted = 0
      `);

    if (headerResult.recordset.length === 0) {
      return res.status(404).json({ message: "Not found" });
    }

    // DETAILS
    const detailsResult = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT *
        FROM payment_req_details
        WHERE header_id = @id
      `);

    return res.json({
      header: headerResult.recordset[0],
      details: detailsResult.recordset
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updatePaymentRequest = async (req, res) => {
  let pool;

  try {
    const { id } = req.params;
    const { activeUserEmail } = req.query;
    const { header, details } = req.body;

    pool = await poolPromise;

    // ================= UPDATE HEADER =================
    await pool.request()
      .input("id", sql.Int, id)
      .input("paid_to", sql.NVarChar, header.paid_to)
      .input("prf_number", sql.NVarChar, header.prf_number)
      .input("product_type", sql.NVarChar, header.product_type)
      .input("division", sql.NVarChar, header.division)
      .input("billing_cycle", sql.NVarChar, header.billing_cycle || 0)
      .input("mode", sql.NVarChar, header.mode)
      .input("currency", sql.NVarChar, header.currency)
      .input("payment_mode", sql.NVarChar, header.payment_mode)
      .input("description", sql.NVarChar(sql.MAX), header.description)

      .input("paid_by", sql.NVarChar, header.paid_by)
      .input("prepared_by", sql.NVarChar, header.prepared_by)
      .input("checked_by", sql.NVarChar, header.checked_by)
      .input("verified_by", sql.NVarChar, header.verified_by)
      .input("signed_by", sql.NVarChar, header.signed_by)
      .input("approved_by", sql.NVarChar, header.approved_by)

      .query(`
        UPDATE payment_request
        SET 
          paid_to = @paid_to,
          prf_number = @prf_number,
          product_type = @product_type,
          division = @division,
          billing_cycle = @billing_cycle,
          mode = @mode,
          currency = @currency,
          payment_mode = @payment_mode,
          description = @description,
          paid_by = @paid_by,
          prepared_by = @prepared_by,
          checked_by = @checked_by,
          verified_by = @verified_by,
          signed_by = @signed_by,
          approved_by = @approved_by,
            sysdate = GETDATE()
        WHERE id = @id
      `);

    // ================= DELETE OLD DETAILS =================
    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM payment_req_details
        WHERE header_id = @id
      `);

    // ================= INSERT NEW DETAILS =================
    for (let item of details) {
      await pool.request()
        .input("header_id", sql.Int, id)
        .input("userid", sql.NVarChar, activeUserEmail || "UNKNOWN")
        .input("doc_date", sql.Date, item.doc_date)
        .input("doc_no", sql.NVarChar, item.doc_no)
        .input("narration", sql.NVarChar(sql.MAX), item.narration)
        .input("amount", sql.Decimal(18,2), item.amount || 0)
          .input("vat", sql.Decimal(18,2), item.vat || 0)
          .input("total_amount", sql.Decimal(18,2), item.total_amount || 0)

        .query(`
          INSERT INTO payment_req_details (
            header_id,
            userid,
            doc_date,
            doc_no,
            narration,
            amount,
            vat,
            total_amount
          )
          VALUES (
            @header_id,
            @userid,
            @doc_date,
            @doc_no,
            @narration,
            @amount,
            @vat,
            @total_amount
          )
        `);
    }

    // ================= AUDIT =================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "payment_request",
      action: "UPDATE",
      message: `Updated payment request ID ${id}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json({
      message: "Updated successfully"
    });

  } catch (err) {
    console.error("UpdatePaymentRequest Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deletePaymentRequest = async (req, res) => {
  let pool;
  try {
    const { id } = req.params;
    const { activeUserEmail } = req.query;

    pool = await poolPromise;
    // ================= DELETE DETAILS =================
    // await pool.request()
    //   .input("id", sql.Int, id)
    //   .query(`
    //     UPDATE payment_req_details
    //     SET deleted = 1
    //     WHERE header_id = @id
    //   `);
    // ================= DELETE HEADER =================
    await pool.request()
      .input("id", sql.Int, id)
      .query(`
        UPDATE payment_request
        SET deleted = 1
        WHERE id = @id
      `);

    // ================= AUDIT =================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "payment_request",
      action: "DELETE",
      message: `Deleted payment request ID ${id}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DeletePaymentRequest Error:", err);
    // Audit log for error
    try {
      await auditLogger({
        pool,
        transaction_id: req.query.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "payment_request",
        action: "DELETE",
        message: `Failed to delete payment request ID ${req.params.id}`,
        status: "FAILED",
        error_message: err.message,
        userid: req.query.activeUserEmail || "UNKNOWN"
      });
    } catch (auditErr) {
      console.error("Audit log error (delete):", auditErr);
    }
    return res.status(500).json({ error: err.message });
  }
};

exports.getLastPRFNumber = async (req, res) => {
  let pool;
  try{
    pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT TOP 1 prf_num
      FROM prf
      WHERE prf_num IS NOT NULL
      ORDER BY id DESC
    `);
    const lastPRFNumber = result.recordset.length > 0 ? result.recordset[0].prf_num : null;
    return res.json({ lastPRFNumber });
  } catch (err) {
    console.error("GetLastPRFNumber Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateGenarate = async (req, res) => {
  let pool;

  try {
    const prf_number = decodeURIComponent(req.params.id);

    pool = await poolPromise;

    await pool.request()
      .input("prf_number", sql.NVarChar, prf_number)
      .query(`
        UPDATE payment_request
        SET is_generated = 1
        WHERE prf_number = @prf_number
      `);

    console.log("PRF number updated to generated:", prf_number);

    return res.json({
      success: true,
      message: "PRF number updated successfully"
    });

  } catch (err) {
    console.error("UpdateGenerate Error:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getVatPercentage = async (req, res) => {
  let pool;

  try {
    pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT TOP 1 setting_value
      FROM system_settings
      WHERE setting_key = 'VAT_PERCENT'
      ORDER BY id DESC
    `);

    const vatPercentage =
      result.recordset.length > 0
        ? result.recordset[0].setting_value
        : null;

    return res.json({ vatPercentage });

  } catch (err) {
    console.error("GetVatPercentage Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getApprovalWorkflow = async (req, res) => {
  let pool;

  try {
    pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT TOP 1 setting_value
      FROM system_settings
      WHERE setting_key = 'APPROVAL_WORKFLOW'
      ORDER BY id DESC
    `);

    const approvalWorkflow =
      result.recordset.length > 0
        ? result.recordset[0].setting_value
        : null;

    return res.json({ approvalWorkflow });

  } catch (err) {
    console.error("GetApprovalWorkflow Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.createPRF = async (req, res) => {
  let pool;

  try {
    // Parse selectedRow array from query params
    let selectedRows = [];
    Object.keys(req.query).forEach(key => {
      const match = key.match(/^selectedRow\[(\d+)\]\[(.+)\]$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        const field = match[2];
        if (!selectedRows[idx]) selectedRows[idx] = {};
        selectedRows[idx][field] = req.query[key];
      }
    });

    const { activeUserEmail } = req.query;
    const payload = req.body;

    pool = await poolPromise;

    const cleanDocDate = payload.doc_date
      ? new Date(payload.doc_date).toISOString().split("T")[0]
      : null;

    const cleanPrfDate = Date.now() ? new Date().toISOString().split("T")[0] : null;

    const request = pool.request();

    // ================= INSERT PRF =================
    const result = await request
      .input("prf_date", sql.Date, cleanPrfDate)
      .input("prf_num", sql.VarChar(50), payload.prf_num || null)
      .input("amount", sql.Decimal(18,2), payload.amount || 0)
      .input("vat_amount", sql.Decimal(18,2), payload.vat_amount || 0)
      .input("total_amount", sql.Decimal(18,2), payload.total_amount || 0)
      .input("paid_by", sql.VarChar(100), payload.paid_by || "")
      .input("prepared_by", sql.VarChar(100), payload.prepared_by || "")
      .input("checked_by", sql.VarChar(100), payload.checked_by || "")
      .input("verified_by_it", sql.VarChar(100), payload.verified_by_it || "")
      .input("verified_by", sql.VarChar(100), payload.verified_by || "")
      .input("signed_by", sql.VarChar(100), payload.signed_by || "")
      .input("approved_by", sql.VarChar(100), payload.approved_by || "")
      .input("userid", sql.VarChar(100), activeUserEmail || null)
      .input("receipt_number", sql.VarChar(100), payload.receipt_number || null)
      .input("exchange_rate", sql.Decimal(18,6), payload.exchange_rate || 1)
      .input("is_advertising", sql.Bit, payload.is_advertising || 0)
      .input("remarks", sql.VarChar(500), payload.remarks || null)
      .query(`
        INSERT INTO prf (
          prf_date,
          prf_num,
          amount,
          vat_amount,
          total_amount,
          paid_by,
          prepared_by,
          checked_by,
          verified_by_it,
          verified_by,
          signed_by,
          approved_by,
          receipt_number,
          exchange_rate,
          userid,
          is_advertising,
          remarks
        )
        VALUES (
          @prf_date,
          @prf_num,
          @amount,
          @vat_amount,
          @total_amount,
          @paid_by,
          @prepared_by,
          @checked_by,
          @verified_by_it,
          @verified_by,
          @signed_by,
          @approved_by,
          @receipt_number,
          @exchange_rate,
          @userid,
          @is_advertising,
          @remarks
        )
      `);

    // ================= UPDATE TRANSACTIONS FOR ALL SELECTED ROWS =================
    if (selectedRows.length > 0 && payload.prf_num) {
      for (const row of selectedRows) {
        if (row.id) {
          await pool.request()
            .input("id", sql.Int, row.id)
            .input("prf_num", sql.VarChar(50), payload.prf_num)
            .query(`
              UPDATE tbl_payment_transactions
              SET prf_num = @prf_num, is_posted = 1
              WHERE id = @id
            `);
        }
      }
    }

    // ================= AUDIT LOG =================
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "PRF",
      action: "CREATE",
      message: `Created PRF ${payload.prf_num}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json({
      success: true,
      message: "PRF created and transactions updated successfully",
      data: result
    });

  } catch (err) {
    console.error("Create PRF Error:", err);
    await auditLogger({
      pool,
      transaction_id: req.query.activeUserEmail || "UNKNOWN",
      log_type: "ERROR",
      module_name: "PRF",
      action: "CREATE",
      message: `Failed to create PRF ${req.body.prf_num}`,
      status: "FAILURE",
      userid: req.query.activeUserEmail || "UNKNOWN"
    });
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.unpostPRFTransaction = async (req, res) => {
  let pool;
  try {
    const prfNum = decodeURIComponent(req.params.prfNum);
    const { activeUserEmail } = req.query;
    console.log("Unpost PRF Transaction called with prfNum:", prfNum, "activeUserEmail:", activeUserEmail); // <-- add this
    if (!prfNum) {
      return res.status(400).json({ error: "Valid PRF number is required" });
    }

    pool = await poolPromise;

    const result = await pool.request()
      .input("prfNum", sql.VarChar, prfNum)
      .query(`
        UPDATE tbl_payment_transactions
        SET is_posted = 0
        WHERE prf_num = @prfNum
      `);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "PRF",
      action: "UNPOST",
      message: "Unposted transaction id " + prfNum,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json({
      success: true,
      message: "Transaction unposted successfully"
    });
  } catch (err) {
    try {
      if (pool) {
        await auditLogger({
          pool,
          transaction_id: req.query.activeUserEmail || "UNKNOWN",
          log_type: "ERROR",
          module_name: "PRF",
          action: "UNPOST",
          message: "Failed to unpost transaction id " + req.params.prfNum,
          status: "FAILURE",
          error_message: err.message,
          userid: req.query.activeUserEmail || "UNKNOWN"
        });
      }
    } catch (auditErr) {
      console.error("Audit log error (unpost):", auditErr);
    }
    console.error("Unpost PRF Transaction Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.postPRFTransaction = async (req, res) => {
  let pool;
  try {
    const prfNum = decodeURIComponent(req.params.prfNum);
    const { activeUserEmail } = req.query;
    console.log("Post PRF Transaction called with prfNum:", prfNum, "activeUserEmail:", activeUserEmail); // <-- add this
    if (!prfNum) {
      return res.status(400).json({ error: "Valid PRF number is required" });
    }

    pool = await poolPromise;

    const result = await pool.request()
      .input("prfNum", sql.VarChar, prfNum)
      .query(`
        UPDATE tbl_payment_transactions
        SET is_posted = 1
        WHERE prf_num = @prfNum
      `);

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "PRF",
      action: "POST",
      message: "Posted transaction id " + prfNum,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json({
      success: true,
      message: "Transaction posted successfully"
    });
  } catch (err) {
    try {
      if (pool) {
        await auditLogger({
          pool,
          transaction_id: req.query.activeUserEmail || "UNKNOWN",
          log_type: "ERROR",
          module_name: "PRF",
          action: "POST",
          message: "Failed to post transaction id " + req.params.prfNum,
          status: "FAILURE",
          error_message: err.message,
          userid: req.query.activeUserEmail || "UNKNOWN"
        });
      }
    } catch (auditErr) {
      console.error("Audit log error (post):", auditErr);
    }
    console.error("Post PRF Transaction Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPreviewPRF = async (req, res) => {
  let pool;

  try {
    const { prfNum } = req.params;

    pool = await poolPromise;

    // Headers
    const headersResult = await pool.request()
      .input("prfNum", sql.VarChar, prfNum)
      .query(`
        SELECT t.*, c.crcd_holder_name
        FROM tbl_payment_transactions t
        LEFT JOIN credit_card c
          ON t.crcd_code = c.crcd_code
        WHERE t.prf_num = @prfNum
      `);

    const headers = headersResult.recordset;
    console.log("Preview PRF Headers:", headers); // <-- add this
    // Single PRF summary row
    const detailsResult = await pool.request()
      .input("prfNum", sql.VarChar, prfNum)
      .query(`
        SELECT *
        FROM prf
        WHERE prf_num = @prfNum
      `);

    const detail = detailsResult.recordset[0] || null;

    return res.json({
      headers,
      paid_by: headers[0]?.crcd_holder_name || "",
      details: detail
    });

  } catch (err) {
    console.error("getPreviewPRF Error:", err);
    return res.status(500).json({
      error: err.message
    });
  }
};

exports.incrementPRFExportCount = async (req, res) => {
  let pool;
  try {
    const { prfNum } = req.params;
    const { success, activeUserEmail } = req.body; // or req.query if you send as query param

    if (success !== true && success !== "true") {
      return res.status(400).json({ message: "Export not confirmed as successful." });
    }

    pool = await poolPromise;

    // Increment export_count
    const result = await pool.request()
      .input("prfNum", sql.VarChar, prfNum)
      .query(`
        UPDATE prf
        SET export_count = ISNULL(export_count, 0) + 1
        WHERE prf_num = @prfNum
      `);

    // Audit log
    await auditLogger({
      pool,
      transaction_id: activeUserEmail || "UNKNOWN",
      log_type: "INFO",
      module_name: "PRF",
      action: "EXPORT",
      message: `Exported PRF ${prfNum}`,
      status: "SUCCESS",
      userid: activeUserEmail || "UNKNOWN"
    });

    return res.json({ success: true, message: "Export count incremented." });
  } catch (err) {
    console.error("incrementPRFExportCount Error:", err);
    try {
      await auditLogger({
        pool,
        transaction_id: req.body.activeUserEmail || "UNKNOWN",
        log_type: "ERROR",
        module_name: "PRF",
        action: "EXPORT",
        message: `Failed to increment export_count for PRF ${req.params.prfNum}`,
        status: "FAILURE",
        error_message: err.message,
        userid: req.body.activeUserEmail || "UNKNOWN"
      });
    } catch (auditErr) {
      console.error("Audit log error (export):", auditErr);
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};