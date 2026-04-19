const db = require("../db");

// ======================
// CREDIT USER (ALL INCOME)
// ======================
async function credit(userId, amount, type, metadata = {}) {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // 1. validate user exists
    const user = await client.query(
      "SELECT id FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      throw new Error("User not found");
    }

    // 2. update wallet
    await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [amount, userId]
    );

    // 3. ledger entry (safe JSON)
    await client.query(
      `INSERT INTO transaction_ledger (user_id, type, amount, metadata)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, JSON.stringify(metadata)]
    );

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ======================
// DEBIT USER (ALL OUTGOING)
// ======================
async function debit(userId, amount, type, metadata = {}) {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    // 🔒 LOCK ROW to prevent race condition
    const user = await client.query(
      "SELECT balance FROM users WHERE id=$1 FOR UPDATE",
      [userId]
    );

    if (!user.rows.length) {
      throw new Error("User not found");
    }

    const balance = Number(user.rows[0].balance);

    if (balance < amount) {
      throw new Error("Insufficient balance");
    }

    // 1. deduct wallet
    await client.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [amount, userId]
    );

    // 2. ledger entry
    await client.query(
      `INSERT INTO transaction_ledger (user_id, type, amount, metadata)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, JSON.stringify(metadata)]
    );

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  credit,
  debit
};
