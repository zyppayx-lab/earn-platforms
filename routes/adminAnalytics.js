const router = require("express").Router();
const db = require("../db");

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const permit = require("../middleware/permission");

// ======================
// 📊 PLATFORM OVERVIEW
// ======================
router.get(
  "/overview",
  auth,
  admin("analytics_admin", "super_admin"),
  permit("can_view_dashboard"),
  async (req, res) => {
    try {
      const [users, tasks, transactions, balance, withdrawals, fraud] = await Promise.all([
        db.query("SELECT COUNT(*) FROM users"),
        db.query("SELECT COUNT(*) FROM tasks"),
        db.query("SELECT COUNT(*) FROM transactions"),
        db.query("SELECT COALESCE(SUM(balance),0) FROM users"),
        db.query("SELECT COUNT(*) FROM withdrawals WHERE status='pending'"),
        db.query("SELECT COUNT(*) FROM fraud_flags WHERE status='open'")
      ]);

      res.json({
        total_users: users.rows[0].count,
        total_tasks: tasks.rows[0].count,
        total_transactions: transactions.rows[0].count,
        total_user_balance: balance.rows[0].coalesce,
        pending_withdrawals: withdrawals.rows[0].count,
        open_fraud_cases: fraud.rows[0].count
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ======================
// 💸 FINANCE
// ======================
router.get(
  "/finance",
  auth,
  admin("finance_admin", "super_admin"),
  permit("can_view_finance"),
  async (req, res) => {
    try {
      const [deposits, payouts, referrals, escrow] = await Promise.all([
        db.query("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='deposit'"),
        db.query("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='task_reward'"),
        db.query("SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='referral_bonus'"),
        db.query("SELECT COALESCE(SUM(amount),0) FROM escrow WHERE status='locked'")
      ]);

      res.json({
        total_deposits: deposits.rows[0].coalesce,
        total_payouts: payouts.rows[0].coalesce,
        referral_bonuses: referrals.rows[0].coalesce,
        escrow_locked: escrow.rows[0].coalesce,
        platform_profit:
          deposits.rows[0].coalesce -
          (payouts.rows[0].coalesce + referrals.rows[0].coalesce)
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ======================
// 👥 USERS (PAGINATED)
// ======================
router.get(
  "/users",
  auth,
  admin("admin", "super_admin"),
  permit("can_manage_users"),
  async (req, res) => {
    const limit = 50;
    const offset = req.query.page ? req.query.page * limit : 0;

    const result = await db.query(
      `SELECT id, email, role, balance, status, fraud_score, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  }
);

// ======================
// 🧩 TASK ANALYTICS
// ======================
router.get(
  "/tasks",
  auth,
  admin("analytics_admin", "super_admin"),
  permit("can_view_dashboard"),
  async (req, res) => {
    const status = await db.query(
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
      status_breakdown: status.rows,
      top_tasks: topTasks.rows
    });
  }
);

// ======================
// 🚨 FRAUD
// ======================
router.get(
  "/fraud",
  auth,
  admin("fraud_admin", "super_admin"),
  permit("can_manage_fraud"),
  async (req, res) => {
    const result = await db.query(
      `SELECT * FROM fraud_flags 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    res.json(result.rows);
  }
);

// ======================
// 💸 WITHDRAWALS
// ======================
router.get(
  "/withdrawals",
  auth,
  admin("finance_admin", "super_admin"),
  permit("can_approve_withdrawals"),
  async (req, res) => {
    const result = await db.query(
      `SELECT * FROM withdrawals 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    res.json(result.rows);
  }
);

module.exports = router;
