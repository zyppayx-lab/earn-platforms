const db = require("../db");

// ======================
// 📊 DASHBOARD
// ======================
exports.getDashboard = async (req, res) => {
  try {
    const users = await db.query("SELECT COUNT(*) FROM users");
    const vendors = await db.query("SELECT COUNT(*) FROM vendors");
    const tasks = await db.query("SELECT COUNT(*) FROM tasks");

    res.json({
      users: users.rows[0].count,
      vendors: vendors.rows[0].count,
      tasks: tasks.rows[0].count
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 👑 CREATE ADMIN (SUPER ADMIN ONLY)
// ======================
exports.createAdmin = async (req, res) => {
  const { email, role, permissions } = req.body;

  try {
    await db.query(
      `INSERT INTO admins (email, role, permissions)
       VALUES ($1,$2,$3)`,
      [email, role, permissions || []]
    );

    res.json({ message: "Admin created" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 💸 FINANCE OVERVIEW
// ======================
exports.getFinance = async (req, res) => {
  try {
    const deposits = await db.query(
      "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type='deposit'"
    );

    const withdrawals = await db.query(
      "SELECT COALESCE(SUM(amount),0) FROM withdrawals WHERE status='approved'"
    );

    const escrow = await db.query(
      "SELECT COALESCE(SUM(amount),0) FROM escrow WHERE status='locked'"
    );

    res.json({
      deposits: deposits.rows[0].coalesce,
      withdrawals: withdrawals.rows[0].coalesce,
      escrow_locked: escrow.rows[0].coalesce
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 💳 APPROVE WITHDRAWAL (FINANCE ADMIN)
// ======================
exports.approveWithdrawal = async (req, res) => {
  const { withdrawal_id } = req.body;

  try {
    const wd = await db.query(
      "SELECT * FROM withdrawals WHERE id=$1",
      [withdrawal_id]
    );

    if (!wd.rows.length) {
      return res.status(404).json({ error: "Not found" });
    }

    if (wd.rows[0].status !== "pending") {
      return res.status(400).json({ error: "Already processed" });
    }

    await db.query("BEGIN");

    await db.query(
      `UPDATE withdrawals SET status='approved' WHERE id=$1`,
      [withdrawal_id]
    );

    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'withdrawal',$2)`,
      [wd.rows[0].user_id, wd.rows[0].amount]
    );

    await db.query("COMMIT");

    res.json({ message: "Withdrawal approved" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🚨 FRAUD SYSTEM (FREEZE USER)
// ======================
exports.getFraud = async (req, res) => {
  try {
    const frauds = await db.query(
      "SELECT * FROM fraud_flags ORDER BY created_at DESC LIMIT 100"
    );

    res.json(frauds.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// ❄️ FREEZE USER ACCOUNT
// ======================
exports.freezeUser = async (req, res) => {
  const { user_id } = req.body;

  try {
    await db.query(
      `UPDATE users SET status='frozen' WHERE id=$1`,
      [user_id]
    );

    res.json({ message: "User frozen" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🔓 SUSPEND USER
// ======================
exports.suspendUser = async (req, res) => {
  const { user_id } = req.body;

  try {
    await db.query(
      `UPDATE users SET status='suspended' WHERE id=$1`,
      [user_id]
    );

    res.json({ message: "User suspended" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🏦 ESCROW VIEW
// ======================
exports.viewEscrow = async (req, res) => {
  try {
    const escrow = await db.query(
      "SELECT * FROM escrow ORDER BY created_at DESC LIMIT 100"
    );

    res.json(escrow.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 👥 GET USERS
// ======================
exports.getUsers = async (req, res) => {
  try {
    const users = await db.query(
      `SELECT id, email, role, balance, status, created_at
       FROM users ORDER BY created_at DESC LIMIT 100`
    );

    res.json(users.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🧑‍💼 GET VENDORS
// ======================
exports.getVendors = async (req, res) => {
  try {
    const vendors = await db.query(
      `SELECT * FROM vendors ORDER BY id DESC`
    );

    res.json(vendors.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
