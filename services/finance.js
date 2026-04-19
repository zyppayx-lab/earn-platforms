const db = require("../db");

// ======================
// CREDIT USER (ALL INCOME)
// ======================
async function credit(userId, amount, type, metadata = {}) {
  await db.query("BEGIN");

  try {
    // 1. update wallet
    await db.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [amount, userId]
    );

    // 2. ledger (mandatory)
    await db.query(
      `INSERT INTO transaction_ledger (user_id, type, amount, metadata)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, metadata]
    );

    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

// ======================
// DEBIT USER (ALL OUTGOING)
// ======================
async function debit(userId, amount, type, metadata = {}) {
  await db.query("BEGIN");

  try {
    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [userId]
    );

    if (user.rows[0].balance < amount) {
      throw new Error("Insufficient balance");
    }

    // 1. update wallet
    await db.query(
      "UPDATE users SET balance = balance - $1 WHERE id=$2",
      [amount, userId]
    );

    // 2. ledger
    await db.query(
      `INSERT INTO transaction_ledger (user_id, type, amount, metadata)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, metadata]
    );

    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

module.exports = {
  credit,
  debit
};
