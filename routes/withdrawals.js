const router = require("express").Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const db = require("../db");

// ======================
// REQUEST WITHDRAWAL (USER)
// ======================
router.post("/request", auth, async (req, res) => {
  const { amount, bank_name, account_number } = req.body;

  try {
    const userId = req.user.id;

    // check balance
    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [userId]
    );

    if (user.rows[0].balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const withdrawal = await db.query(
      `INSERT INTO withdrawals (user_id, amount, bank_name, account_number, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [userId, amount, bank_name, account_number]
    );

    res.json(withdrawal.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// GET USER WITHDRAWALS
// ======================
router.get("/", auth, async (req, res) => {
  const data = await db.query(
    "SELECT * FROM withdrawals WHERE user_id=$1",
    [req.user.id]
  );

  res.json(data.rows);
});

// ======================
// ADMIN: VIEW ALL
// ======================
router.get("/admin", auth, admin("admin"), async (req, res) => {
  const data = await db.query("SELECT * FROM withdrawals ORDER BY created_at DESC");
  res.json(data.rows);
});

// ======================
// ADMIN: APPROVE
// ======================
router.post("/approve", auth, admin("admin"), async (req, res) => {
  const { withdrawal_id } = req.body;

  const wd = await db.query(
    "UPDATE withdrawals SET status='approved' WHERE id=$1 RETURNING *",
    [withdrawal_id]
  );

  res.json(wd.rows[0]);
});

// ======================
// ADMIN: MARK PAID (after manual transfer)
// ======================
router.post("/paid", auth, admin("admin"), async (req, res) => {
  const { withdrawal_id } = req.body;

  const wd = await db.query(
    "UPDATE withdrawals SET status='paid' WHERE id=$1 RETURNING *",
    [withdrawal_id]
  );

  // deduct wallet
  await db.query(
    "UPDATE users SET balance = balance - $1 WHERE id=$2",
    [wd.rows[0].amount, wd.rows[0].user_id]
  );

  res.json({ message: "Marked as paid" });
});

module.exports = router;
