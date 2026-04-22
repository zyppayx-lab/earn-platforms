const db = require("../db");
const { logAction } = require("../services/audit");
const { publishEvent, publishDashboardUpdate } = require("../services/events");

// ======================
// VIEW ESCROW (ADMIN)
// ======================
exports.getEscrow = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM escrow
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// REFUND ESCROW (ADMIN SAFE)
// ======================
exports.refundEscrow = async (req, res) => {
  const { escrow_id } = req.body;

  try {
    const esc = await db.query(
      "SELECT * FROM escrow WHERE id=$1",
      [escrow_id]
    );

    if (!esc.rows.length) {
      return res.status(404).json({ error: "Escrow not found" });
    }

    if (esc.rows[0].status !== "locked") {
      return res.status(400).json({ error: "Escrow already processed" });
    }

    const { vendor_id, amount } = esc.rows[0];

    await db.transaction(async (client) => {

      // 1. mark escrow refunded
      await client.query(
        `UPDATE escrow SET status='refunded' WHERE id=$1`,
        [escrow_id]
      );

      // 2. refund vendor
      await client.query(
        `UPDATE vendors SET balance = balance + $1 WHERE id=$2`,
        [amount, vendor_id]
      );

      // 3. log transaction
      await client.query(
        `INSERT INTO transactions (user_id, type, amount)
         VALUES ($1,'escrow_refund',$2)`,
        [vendor_id, amount]
      );
    });

    // ======================
    // AUDIT + REAL-TIME OPS
    // ======================
    await logAction(req.user.id, "ESCROW_REFUND", {
      escrow_id,
      vendor_id,
      amount
    });

    await publishEvent("finance_update", {
      type: "escrow_refund",
      escrow_id,
      vendor_id,
      amount
    });

    await publishDashboardUpdate({
      source: "escrow_refunded"
    });

    res.json({ message: "Escrow refunded to vendor" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
