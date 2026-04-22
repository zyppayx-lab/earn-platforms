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
  admin(["analytics_admin", "super_admin"]),
  permit("can_view_dashboard"),
  async (req, res) => {
    try {
      const [users, tasks, transactions, balance, withdrawals, fraud] =
        await Promise.all([
          db.query("SELECT COUNT(*) AS total FROM users"),
          db.query("SELECT COUNT(*) AS total FROM tasks"),
          db.query("SELECT COUNT(*) AS total FROM transactions"),
          db.query("SELECT COALESCE(SUM(balance),0) AS total FROM users"),
          db.query("SELECT COUNT(*) AS total FROM withdrawals WHERE status='pending'"),
          db.query("SELECT COUNT(*) AS total FROM fraud_flags WHERE status='open'")
        ]);

      res.json({
        total_users: Number(users.rows[0].total),
        total_tasks: Number(tasks.rows[0].total),
        total_transactions: Number(transactions.rows[0].total),
        total_user_balance: Number(balance.rows[0].total),
        pending_withdrawals: Number(withdrawals.rows[0].total),
        open_fraud_cases: Number(fraud.rows[0].total)
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
  admin(["finance_admin", "super_admin"]),
  permit("can_view_finance"),
  async (req, res) => {
    try {
      const [deposits, payouts, referrals, escrow] = await Promise.all([
        db.query("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='deposit'"),
        db.query("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='task_reward'"),
        db.query("SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='referral_bonus'"),
        db.query("SELECT COALESCE(SUM(amount),0) AS total FROM escrow WHERE status='locked'")
      ]);

      const depositTotal = Number(deposits.rows[0].total);
      const payoutTotal = Number(payouts.rows[0].total);
      const referralTotal = Number(referrals.rows[0].total);
      const escrowTotal = Number(escrow.rows[0].total);

      res.json({
        total_deposits: depositTotal,
        total_payouts: payoutTotal,
        referral_bonuses: referralTotal,
        escrow_locked: escrowTotal,
        platform_profit: depositTotal - (payoutTotal + referralTotal)
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ======================
// 👥 USERS (PAGINATED SAFE)
// ======================
router.get(
  "/users",
  auth,
  admin(["admin", "super_admin"]),
  permit("can_manage_users"),
  async (req, res) => {
    try {
      const limit = 50;
      const page = Math.max(parseInt(req.query.page || "1"), 1);
      const offset = (page - 1) * limit;

      const result = await db.query(
        `SELECT id, email, role, balance, status, fraud_score, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      res.json({
        page,
        limit,
        data: result.rows
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ======================
// 🧩 TASK ANALYTICS
// ======================
router.get(
  "/tasks",
  auth,
  admin(["analytics_admin", "super_admin"]),
  permit("can_view_dashboard"),
  async (req, res) => {
    try {
      const [status, topTasks] = await Promise.all([
        db.query(
          `SELECT status, COUNT(*) AS count
           FROM task_submissions
           GROUP BY status`
        ),
        db.query(
          `SELECT task_id, COUNT(*) AS completions
           FROM task_submissions
           GROUP BY task_id
           ORDER BY completions DESC
           LIMIT 10`
        )
      ]);

      res.json({
        status_breakdown: status.rows,
        top_tasks: topTasks.rows
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ======================
// 🚨 FRAUD
// ======================
router.get(
  "/fraud",
  auth,
  admin(["fraud_admin", "super_admin"]),
  permit("can_manage_fraud"),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT * FROM fraud_flags
         ORDER BY created_at DESC
         LIMIT 50`
      );

      res.json(result.rows);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ======================
// 💸 WITHDRAWALS
// ======================
router.get(
  "/withdrawals",
  auth,
  admin(["finance_admin", "super_admin"]),
  permit("can_approve_withdrawals"),
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT * FROM withdrawals
         ORDER BY created_at DESC
         LIMIT 50`
      );

      res.json(result.rows);

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
