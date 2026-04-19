const db = require("../db");
const PERMISSIONS = require("../config/permissions");

// ======================
// 📊 DASHBOARD
// ======================
exports.getDashboard = async (req, res) => {
  try {
    const users = await db.query("SELECT COUNT(*) FROM users");
    const balance = await db.query("SELECT SUM(balance) FROM users");

    await log(req.user.id, "view_dashboard");

    res.json({
      total_users: users.rows[0].count,
      total_balance: balance.rows[0].sum || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 👑 CREATE ADMIN (TEMPLATE BASED)
// ======================
exports.createAdmin = async (req, res) => {
  const { email, type } = req.body;

  try {
    const template = PERMISSIONS[type];

    if (!template) {
      return res.status(400).json({ error: "Invalid admin type" });
    }

    await db.query(
      `UPDATE users
       SET role='admin', permissions=$1
       WHERE email=$2`,
      [template, email]
    );

    await log(req.user.id, "create_admin", { email, type });

    res.json({ message: "Admin created with template" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 💸 FINANCE
// ======================
exports.getFinance = async (req, res) => {
  try {
    const deposits = await db.query(
      "SELECT SUM(amount) FROM transactions WHERE type='deposit'"
    );

    await log(req.user.id, "view_finance");

    res.json({
      deposits: deposits.rows[0].sum || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 💳 APPROVE WITHDRAWAL
// ======================
exports.approveWithdrawal = async (req, res) => {
  const { withdrawal_id } = req.body;

  try {
    await db.query(
      "UPDATE withdrawals SET status='approved' WHERE id=$1",
      [withdrawal_id]
    );

    await log(req.user.id, "approve_withdrawal", { withdrawal_id });

    res.json({ message: "Withdrawal approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🚨 FRAUD
// ======================
exports.getFraud = async (req, res) => {
  try {
    const data = await db.query("SELECT * FROM fraud_flags");

    await log(req.user.id, "view_fraud");

    res.json(data.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🏦 ESCROW
// ======================
exports.viewEscrow = async (req, res) => {
  try {
    const data = await db.query("SELECT * FROM escrow");

    await log(req.user.id, "view_escrow");

    res.json(data.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🧾 ADMIN LOG HELPER
// ======================
async function log(adminId, action, metadata = {}) {
  await db.query(
    `INSERT INTO admin_logs (admin_id, action, metadata)
     VALUES ($1,$2,$3)`,
    [adminId, action, metadata]
  );
}
