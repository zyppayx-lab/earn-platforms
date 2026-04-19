const db = require("../db");
const redis = require("redis");

// ======================
// REDIS CLIENT (SAFE INIT)
// ======================
const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.connect();

// ======================
// CREATE ESCROW (LOCK FUNDS)
// ======================
async function createEscrow(userId, taskId, amount) {

  // 🔒 DB-level protection (prevents duplicates)
  const existing = await db.query(
    `SELECT id FROM escrow 
     WHERE task_id=$1 AND status='locked'`,
    [taskId]
  );

  if (existing.rows.length > 0) {
    throw new Error("Escrow already exists for this task");
  }

  await db.query("BEGIN");

  try {
    // create escrow in DB
    const escrow = await db.query(
      `INSERT INTO escrow (user_id, task_id, amount, status)
       VALUES ($1,$2,$3,'locked')
       RETURNING *`,
      [userId, taskId, amount]
    );

    const escrowId = escrow.rows[0].id;

    // 🔒 Redis lock (fast lookup + race protection)
    await client.set(
      `escrow:${taskId}`,
      JSON.stringify({
        escrowId,
        userId,
        amount,
        status: "locked"
      }),
      {
        EX: 3600 // 1 hour expiry safety
      }
    );

    await db.query("COMMIT");

    return escrow.rows[0];

  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

// ======================
// RELEASE ESCROW (ATOMIC + SAFE)
// ======================
async function releaseEscrow(escrowId, userId, amount) {

  const lockKey = `escrow-release:${escrowId}`;

  // 🔒 prevent double execution
  const existingLock = await client.get(lockKey);

  if (existingLock) {
    throw new Error("Escrow already processing");
  }

  await client.set(lockKey, "locked", { EX: 30 });

  await db.query("BEGIN");

  try {

    // 1. verify escrow
    const escrow = await db.query(
      `SELECT * FROM escrow 
       WHERE id=$1 AND status='locked'`,
      [escrowId]
    );

    if (!escrow.rows.length) {
      throw new Error("Escrow not found or already released");
    }

    // 2. ownership validation
    if (escrow.rows[0].user_id !== userId) {
      throw new Error("Unauthorized escrow release");
    }

    // 3. update escrow status
    await db.query(
      `UPDATE escrow 
       SET status='released'
       WHERE id=$1`,
      [escrowId]
    );

    // 4. credit user wallet
    await db.query(
      `UPDATE users 
       SET balance = balance + $1
       WHERE id=$2`,
      [amount, userId]
    );

    // 5. transaction log (standardized)
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'task_reward',$2)`,
      [userId, amount]
    );

    await db.query("COMMIT");

    // cleanup redis lock
    await client.del(lockKey);

    return { success: true };

  } catch (err) {
    await db.query("ROLLBACK");

    await client.del(lockKey);
    throw err;
  }
}

module.exports = {
  createEscrow,
  releaseEscrow
};
