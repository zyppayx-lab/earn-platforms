const db = require("../db");

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
// REFUND ESCROW (ADMIN)
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

    await db.query("BEGIN");

    // mark escrow as refunded
    await db.query(
      `UPDATE escrow
       SET status='refunded'
       WHERE id=$1`,
      [escrow_id]
    );

    // return money to vendor
    await db.query(
      `UPDATE vendors
       SET balance = balance + $1
       WHERE id=$2`,
      [amount, vendor_id]
    );

    // log transaction
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'escrow_refund',$2)`,
      [vendor_id, amount]
    );

    await db.query("COMMIT");

    res.json({ message: "Escrow refunded to vendor" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
};
