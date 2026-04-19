const db = require("../db");

// ======================
// GET USER BALANCE
// ======================
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [userId]
    );

    res.json({
      balance: result.rows[0]?.balance || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// WITHDRAW REQUEST (USER)
// ======================
exports.requestWithdrawal = async (req, res) => {
  const userId = req.user.id;
  const { amount, bank_details } = req.body;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [userId]
    );

    if (user.rows[0].balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    await db.query("BEGIN");

    // deduct immediately (prevents double withdrawal)
    await db.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [amount, userId]
    );

    // create withdrawal request
    await db.query(
      `INSERT INTO withdrawals (user_id, amount, bank_details, status)
       VALUES ($1,$2,$3,'pending')`,
      [userId, amount, bank_details]
    );

    // log transaction
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'withdraw_request',$2)`,
      [userId, amount]
    );

    await db.query("COMMIT");

    res.json({
      message: "Withdrawal request submitted"
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
};

// ======================
// TRANSACTION HISTORY
// ======================
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT * FROM transactions
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
