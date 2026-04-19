const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const permit = require("../middleware/permission");

// ======================
// 📊 OVERVIEW (LIVE DASHBOARD)
// ======================
router.get(
  "/overview",
  auth,
  admin(),
  permit("can_view_dashboard"),
  async (req, res) => {
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
  }
);

module.exports = router;
