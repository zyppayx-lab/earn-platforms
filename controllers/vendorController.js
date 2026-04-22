const db = require("../db");

// ======================
// CREATE VENDOR PROFILE
// ======================
exports.createVendor = async (req, res) => {
  const userId = req.user.id;

  try {
    const existing = await db.query(
      "SELECT id FROM vendors WHERE id=$1",
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Already a vendor" });
    }

    await db.query(
      `INSERT INTO vendors (id, balance)
       VALUES ($1, 0)`,
      [userId]
    );

    await db.query(
      `UPDATE users SET role='vendor' WHERE id=$1`,
      [userId]
    );

    res.json({ message: "Vendor account created" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// ADD FUNDS (USER WALLET → VENDOR WALLET) FIXED
// ======================
exports.addFunds = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    if (Number(user.rows[0].balance) < amount) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    const vendor = await db.query(
      "SELECT id FROM vendors WHERE id=$1",
      [userId]
    );

    if (!vendor.rows.length) {
      return res.status(400).json({ error: "Vendor account not found" });
    }

    await db.query("BEGIN");

    // deduct user wallet
    await db.query(
      `UPDATE users
       SET balance = balance - $1
       WHERE id=$2`,
      [amount, userId]
    );

    // credit vendor wallet (FIXED)
    await db.query(
      `UPDATE vendors
       SET balance = balance + $1
       WHERE id=$2`,
      [amount, userId]
    );

    // log transaction
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'vendor_funding',$2)`,
      [userId, amount]
    );

    await db.query("COMMIT");

    res.json({ message: "Vendor wallet funded successfully" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
};

// ======================
// VENDOR DASHBOARD (FIXED COALESCE)
// ======================
exports.dashboard = async (req, res) => {
  const vendorId = req.user.id;

  try {
    const balance = await db.query(
      "SELECT balance FROM vendors WHERE id=$1",
      [vendorId]
    );

    const tasks = await db.query(
      `SELECT * FROM tasks
       WHERE vendor_id=$1
       ORDER BY created_at DESC`,
      [vendorId]
    );

    const spent = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total
       FROM escrow
       WHERE vendor_id=$1`,
      [vendorId]
    );

    res.json({
      balance: Number(balance.rows[0]?.balance || 0),
      total_tasks: tasks.rows.length,
      tasks: tasks.rows,
      total_spent: Number(spent.rows[0].total)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
