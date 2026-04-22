const db = require("../db");
const { publishDashboardUpdate, publishEvent } = require("../services/events");
const { logAction } = require("../services/audit");

// safe wrapper for transactions
const safeTransaction = async (callback) => {
  return await db.transaction(async (client) => {
    return await callback(client);
  });
};

// ======================
// 📊 DASHBOARD
// ======================
exports.getDashboard = async (req, res) => {
  try {
    const users = await db.query("SELECT COUNT(*) AS total FROM users");
    const vendors = await db.query("SELECT COUNT(*) AS total FROM vendors");
    const tasks = await db.query("SELECT COUNT(*) AS total FROM tasks");

    res.json({
      users: Number(users.rows[0].total),
      vendors: Number(vendors.rows[0].total),
      tasks: Number(tasks.rows[0].total)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 👑 CREATE ADMIN
// ======================
exports.createAdmin = async (req, res) => {
  const { email, role, permissions } = req.body;

  try {
    await db.query(
      `INSERT INTO admins (email, role, permissions)
       VALUES ($1,$2,$3)`,
      [email, role, permissions || []]
    );

    await logAction(req.user.id, "CREATE_ADMIN", { email, role });

    await publishDashboardUpdate({ source: "admin_created" });

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
      "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type='deposit'"
    );

    const withdrawals = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM withdrawals WHERE status='approved'"
    );

    const escrow = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM escrow WHERE status='locked'"
    );

    res.json({
      deposits: Number(deposits.rows[0].total),
      withdrawals: Number(withdrawals.rows[0].total),
      escrow_locked: Number(escrow.rows[0].total)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 💳 APPROVE WITHDRAWAL (FIXED SAFE FLOW)
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

    await safeTransaction(async (client) => {

      await client.query(
        `UPDATE withdrawals SET status='approved' WHERE id=$1`,
        [withdrawal_id]
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount)
         VALUES ($1,'withdrawal',$2)`,
        [wd.rows[0].user_id, wd.rows[0].amount]
      );
    });

    await logAction(req.user.id, "APPROVE_WITHDRAWAL", { withdrawal_id });

    await publishDashboardUpdate({
      source: "withdrawal_approved"
    });

    res.json({ message: "Withdrawal approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// 🚨 FRAUD SYSTEM
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
// ❄️ FREEZE USER
// ======================
exports.freezeUser = async (req, res) => {
  const { user_id } = req.body;

  try {
    await db.query(
      `UPDATE users SET status='frozen' WHERE id=$1`,
      [user_id]
    );

    await logAction(req.user.id, "FREEZE_USER", { user_id });

    await publishEvent("user_status_change", {
      userId: user_id,
      status: "frozen"
    });

    await publishDashboardUpdate({
      source: "user_frozen"
    });

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

    await logAction(req.user.id, "SUSPEND_USER", { user_id });

    await publishEvent("user_status_change", {
      userId: user_id,
      status: "suspended"
    });

    await publishDashboardUpdate({
      source: "user_suspended"
    });

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
// 👥 USERS
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
// 🧑‍💼 VENDORS
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
