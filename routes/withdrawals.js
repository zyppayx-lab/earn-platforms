const router = require("express").Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const db = require("../db");
const { logAction } = require("../services/audit");

// ======================
// REQUEST WITHDRAWAL
// ======================
router.post("/request", auth, async (req, res) => {
  const { amount } = req.body;

  try {
    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [req.user.id]
    );

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (user.rows[0].balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const wd = await db.query(
      `INSERT INTO withdrawals (user_id, amount, status)
       VALUES ($1,$2,'pending') RETURNING *`,
      [req.user.id, amount]
    );

    res.json(wd.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// APPROVE WITHDRAWAL
// ======================
router.post("/approve", auth, admin("admin"), async (req, res) => {
  const { id } = req.body;

  const wdCheck = await db.query(
    "SELECT * FROM withdrawals WHERE id=$1",
    [id]
  );

  if (!wdCheck.rows.length) {
    return res.status(404).json({ error: "Withdrawal not found" });
  }

  if (wdCheck.rows[0].status !== "pending") {
    return res.status(400).json({ error: "Already processed" });
  }

  const wd = await db.query(
    `UPDATE withdrawals 
     SET status='approved'
     WHERE id=$1
     RETURNING *`,
    [id]
  );

  await logAction(req.user.id, "withdrawal_approved", wd.rows[0]);

  res.json(wd.rows[0]);
});

// ======================
// MARK AS PAID (SAFE FINANCIAL TRANSACTION)
// ======================
router.post("/paid", auth, admin("admin"), async (req, res) => {
  const { id } = req.body;

  const client = await db.query("BEGIN");

  try {
    const wdRes = await db.query(
      "SELECT * FROM withdrawals WHERE id=$1",
      [id]
    );

    if (!wdRes.rows.length) {
      throw new Error("Withdrawal not found");
    }

    const wd = wdRes.rows[0];

    if (wd.status !== "approved") {
      throw new Error("Withdrawal not approved");
    }

    // prevent double processing
    if (wd.status === "paid") {
      throw new Error("Already paid");
    }

    // update withdrawal
    await db.query(
      "UPDATE withdrawals SET status='paid' WHERE id=$1",
      [id]
    );

    // deduct wallet
    await db.query(
      `UPDATE users 
       SET balance = balance - $1
       WHERE id=$2`,
      [wd.amount, wd.user_id]
    );

    // ledger entry (IMPORTANT)
    await db.query(
      `INSERT INTO transaction_ledger (user_id, type, amount)
       VALUES ($1,'withdrawal',$2)`,
      [wd.user_id, wd.amount]
    );

    await logAction(req.user.id, "withdrawal_paid", {
      withdrawal_id: id,
      amount: wd.amount,
      user_id: wd.user_id
    });

    await db.query("COMMIT");

    res.json({ message: "Paid successfully" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
