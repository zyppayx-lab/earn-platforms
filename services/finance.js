const db = require("../db");
const crypto = require("crypto");
const redis = require("../services/redis");
const { emitEvent, OPS_CHANNELS } = require("./events");

// ======================
// GENERATE IDEMPOTENCY KEY
// ======================
function generateKey(userId, type, metadata) {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${type}:${JSON.stringify(metadata)}`)
    .digest("hex");
}

// ======================
// CREDIT USER (BANK-GRADE)
// ======================
async function credit(userId, amount, type, metadata = {}) {
  const client = await db.pool.connect();
  const idempotencyKey = generateKey(userId, type, metadata);

  try {
    // ======================
    // IDEMPOTENCY CHECK (REDIS)
    // ======================
    const exists = await redis.get(`credit:${idempotencyKey}`);
    if (exists) return;

    await redis.set(`credit:${idempotencyKey}`, "1", "EX", 3600);

    await client.query("BEGIN");

    const user = await client.query(
      "SELECT id FROM users WHERE id=$1 FOR UPDATE",
      [userId]
    );

    if (!user.rows.length) {
      throw new Error("User not found");
    }

    // ======================
    // WALLET UPDATE
    // ======================
    await client.query(
      `UPDATE users SET balance = balance + $1 WHERE id=$2`,
      [amount, userId]
    );

    // ======================
    // LEDGER ENTRY (SOURCE OF TRUTH)
    // ======================
    await client.query(
      `INSERT INTO transaction_ledger 
       (user_id, type, amount, metadata)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, JSON.stringify(metadata)]
    );

    await client.query("COMMIT");

    // ======================
    // OPS EVENT (REAL-TIME SYSTEM)
    // ======================
    await emitEvent(OPS_CHANNELS.TRANSACTIONS, {
      action: "CREDIT",
      userId,
      amount,
      type,
      metadata
    });

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;

  } finally {
    client.release();
  }
}

// ======================
// DEBIT USER (BANK-GRADE)
// ======================
async function debit(userId, amount, type, metadata = {}) {
  const client = await db.pool.connect();
  const idempotencyKey = generateKey(userId, type, metadata);

  try {
    const exists = await redis.get(`debit:${idempotencyKey}`);
    if (exists) return;

    await redis.set(`debit:${idempotencyKey}`, "1", "EX", 3600);

    await client.query("BEGIN");

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

    // ======================
    // DEDUCT WALLET
    // ======================
    await client.query(
      `UPDATE users SET balance = balance - $1 WHERE id=$2`,
      [amount, userId]
    );

    // ======================
    // LEDGER ENTRY
    // ======================
    await client.query(
      `INSERT INTO transaction_ledger 
       (user_id, type, amount, metadata)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, amount, JSON.stringify(metadata)]
    );

    await client.query("COMMIT");

    // ======================
    // OPS EVENT
    // ======================
    await emitEvent(OPS_CHANNELS.TRANSACTIONS, {
      action: "DEBIT",
      userId,
      amount,
      type,
      metadata
    });

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
