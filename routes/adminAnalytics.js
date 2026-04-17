const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

// simple role guard
function adminOnly(req, res, next) {
  if (!req.user || !["admin", "super_admin", "finance_admin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

router.use(auth);
router.use(adminOnly);

// ======================
// 📊 PLATFORM OVERVIEW
// ======================
router.get("/overview", async (req, res) => {
  try {
    const users = await db.query("SELECT COUNT(*) FROM users");
    const tasks = await db.query("SELECT COUNT(*) FROM tasks");
    const transactions = await db.query("SELECT COUNT(*) FROM transactions");

    const balance = await db.query(
      "SELECT SUM(balance) FROM users"
    );

    const withdrawals = await db.query(
      "SELECT COUNT(*) FROM withdrawals WHERE status='pending'"
    );

    const fraud = await db.query(
      "SELECT COUNT(*) FROM fraud_flags WHERE status='open'"
    );

    res.json({
      total_users: users.rows[0].count,
      total_tasks: tasks.rows[0].count,
      total_transactions: transactions.rows[0].count,
      total_user_balance: balance.rows[0].sum || 0,
      pending_withdrawals: withdrawals.rows[0].count,
      open_fraud_cases: fraud.rows[0].count
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 💸 FINANCIAL REPORT
// ======================
router.get("/finance", async (req, res) => {
  try {
    const deposits = await db.query(
      "SELECT SUM(amount) FROM transactions WHERE type='deposit'"
    );

    const payouts = await db.query(
      "SELECT SUM(amount) FROM transactions WHERE type='task_reward'"
    );

    const referrals = await db.query(
      "SELECT SUM(amount) FROM transactions WHERE type='referral_bonus'"
    );

    const escrow = await db.query(
      "SELECT SUM(amount) FROM escrow WHERE status='locked'"
    );

    res.json({
      total_deposits: deposits.rows[0].sum || 0,
      total_payouts: payouts.rows[0].sum || 0,
      referral_bonuses: referrals.rows[0].sum || 0,
      escrow_locked: escrow.rows[0].sum || 0,
      platform_profit:
        (deposits.rows[0].sum || 0) -
        ((payouts.rows[0].sum || 0) + (referrals.rows[0].sum || 0))
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 👥 USERS ANALYTICS
// ======================
router.get("/users", async (req, res) => {
  const result = await db.query(
    `SELECT id, email, role, balance, status, fraud_score, created_at
     FROM users ORDER BY created_at DESC LIMIT 100`
  );

  res.json(result.rows);
});

// ======================
// 🧩 TASK ANALYTICS
// ======================
router.get("/tasks", async (req, res) => {
  const result = await db.query(
    `SELECT status, COUNT(*) 
     FROM task_submissions 
     GROUP BY status`
  );

  const topTasks = await db.query(
    `SELECT task_id, COUNT(*) as completions
     FROM task_submissions
     GROUP BY task_id
     ORDER BY completions DESC
     LIMIT 10`
  );

  res.json({
    status_breakdown: result.rows,
    top_tasks: topTasks.rows
  });
});

// ======================
// 🚨 FRAUD DASHBOARD
// ======================
router.get("/fraud", async (req, res) => {
  const result = await db.query(
    `SELECT * FROM fraud_flags ORDER BY created_at DESC LIMIT 50`
  );

  res.json(result.rows);
});

// ======================
// 💸 WITHDRAWALS CONTROL
// ======================
router.get("/withdrawals", async (req, res) => {
  const result = await db.query(
    `SELECT * FROM withdrawals ORDER BY created_at DESC`
  );

  res.json(result.rows);
});

module.exports = router;
