const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// =====================
// 📊 PLATFORM STATS
// =====================
router.get("/stats", auth, admin(["admin", "super_admin"]), async (req, res) => {
  const users = await db.query("SELECT COUNT(*) FROM users");
  const transactions = await db.query("SELECT COUNT(*) FROM transactions");
  const withdrawals = await db.query("SELECT COUNT(*) FROM withdrawals");

  res.json({
    users: users.rows[0].count,
    transactions: transactions.rows[0].count,
    withdrawals: withdrawals.rows[0].count
  });
});

// =====================
// 👥 ALL USERS
// =====================
router.get("/users", auth, admin(["admin", "super_admin"]), async (req, res) => {
  const result = await db.query("SELECT id, email, role, status, balance FROM users");
  res.json(result.rows);
});

// =====================
// 🚨 SUSPEND USER
// =====================
router.post("/users/suspend", auth, admin(["admin", "super_admin"]), async (req, res) => {
  const { userId } = req.body;

  await db.query(
    "UPDATE users SET status='suspended' WHERE id=$1",
    [userId]
  );

  res.json({ message: "User suspended" });
});

// =====================
// 💸 WITHDRAWALS (VIEW)
// =====================
router.get("/withdrawals", auth, admin(["finance_admin", "super_admin"]), async (req, res) => {
  const result = await db.query("SELECT * FROM withdrawals ORDER BY created_at DESC");
  res.json(result.rows);
});

// =====================
// ✅ APPROVE WITHDRAWAL
// =====================
router.post("/withdrawals/approve", auth, admin(["finance_admin", "super_admin"]), async (req, res) => {
  const { id } = req.body;

  await db.query(
    "UPDATE withdrawals SET status='approved' WHERE id=$1",
    [id]
  );

  res.json({ message: "Withdrawal approved" });
});

// =====================
// 🚨 FRAUD FLAGS
// =====================
router.get("/fraud", auth, admin(["fraud_admin", "super_admin"]), async (req, res) => {
  const result = await db.query("SELECT * FROM fraud_flags ORDER BY created_at DESC");
  res.json(result.rows);
});

// =====================
// ⚙️ UPDATE SETTINGS (PRICES)
// =====================
router.post("/settings", auth, admin(["super_admin"]), async (req, res) => {
  const { key, value } = req.body;

  await db.query(
    "INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
    [key, value]
  );

  res.json({ message: "Setting updated" });
});

module.exports = router;
