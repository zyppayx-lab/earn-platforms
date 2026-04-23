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
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [req.user.id]
    );

    const balance = user.rows?.[0]?.balance || 0;

    if (balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const wd = await db.query(
      `INSERT INTO withdrawals (user_id, amount, status)
       VALUES ($1,$2,'pending')
       RETURNING *`,
      [req.user.id, amount]
    );

    return res.json(wd.rows[0]);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ======================
// APPROVE WITHDRAWAL
// ======================
router.post("/approve", auth, admin(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.body;

  try {
    const wd = await db.query(
      `SELECT * FROM withdrawals WHERE id=$1 FOR UPDATE`,
      [id]
    );

    if (!wd.rows.length) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    if (wd.rows[0].status !== "pending") {
      return res.status(400).json({ error: "Already processed" });
    }

    await db.query(
      `UPDATE withdrawals SET status='approved' WHERE id=$1`,
      [id]
    );

    await logAction(req.user.id, "withdrawal_approved", wd.rows[0]);

    return res.json(wd.rows[0]);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ======================
// MARK AS PAID (BANK-GRADE SAFE)
// ======================
router.post("/paid", auth, admin(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.body;

  try {
    await db.query("BEGIN");

    const wdRes = await db.query(
      `SELECT * FROM withdrawals WHERE id=$1 FOR UPDATE`,
      [id]
    );

    if (!wdRes.rows.length) {
      throw new Error("Withdrawal not found");
    }

    const wd = wdRes.rows[0];

    if (wd.status !== "approved") {
      throw new Error("Withdrawal not approved");
    }

    if (wd.status === "paid") {
      throw new Error("Already paid");
    }

    // mark paid FIRST (prevents double spend race)
    await db.query(
      `UPDATE withdrawals SET status='paid' WHERE id=$1`,
      [id]
    );

    // deduct user balance
    await db.query(
      `UPDATE users 
       SET balance = balance - $1
       WHERE id=$2`,
      [wd.amount, wd.user_id]
    );

    // ledger
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

    return res.json({ message: "Paid successfully" });

  } catch (err) {
    await db.query("ROLLBACK");
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
