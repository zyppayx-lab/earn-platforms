const db = require("../db");
const redis = require("redis");

// assume redis client already configured elsewhere
const client = redis.createClient();
client.connect();

// ======================
// CREATE ESCROW (LOCK FUNDS)
// ======================
async function createEscrow(userId, taskId, amount) {
  // prevent duplicate escrow (important)
  const existing = await db.query(
    `SELECT * FROM escrow 
     WHERE task_id=$1 AND status='locked'`,
    [taskId]
  );

  if (existing.rows.length > 0) {
    throw new Error("Escrow already exists for this task");
  }

  const escrow = await db.query(
    `INSERT INTO escrow (user_id, task_id, amount, status)
     VALUES ($1,$2,$3,'locked')
     RETURNING *`,
    [userId, taskId, amount]
  );

  // store lock in Redis (prevents race conditions)
  await client.set(
    `escrow:${taskId}`,
    JSON.stringify({
      userId,
      amount,
      status: "locked"
    }),
    { EX: 3600 }
  );

  return escrow.rows[0];
}

// ======================
// RELEASE ESCROW (SAFE + ATOMIC)
// ======================
async function releaseEscrow(escrowId, userId, amount) {
  const redisKey = `escrow-release:${escrowId}`;

  // 🔒 IDENTITY LOCK (prevents double payout)
  const lock = await client.get(redisKey);
  if (lock) {
    throw new Error("Escrow already processing");
  }

  await client.set(redisKey, "locked", { EX: 30 });

  try {
    await db.query("BEGIN");

    // 1. verify escrow
    const escrow = await db.query(
      `SELECT * FROM escrow 
       WHERE id=$1 AND status='locked'`,
      [escrowId]
    );

    if (!escrow.rows.length) {
      throw new Error("Escrow not found or already released");
    }

    // 2. ownership check
    if (escrow.rows[0].user_id !== userId) {
      throw new Error("Unauthorized escrow release");
    }

    // 3. update escrow
    await db.query(
      `UPDATE escrow 
       SET status='released'
       WHERE id=$1`,
      [escrowId]
    );

    // 4. credit wallet
    await db.query(
      `UPDATE users 
       SET balance = balance + $1
       WHERE id=$2`,
      [amount, userId]
    );

    // 5. unified transaction log (IMPORTANT FIX)
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'task_reward',$2)`,
      [userId, amount]
    );

    await db.query("COMMIT");

    // remove redis lock
    await client.del(redisKey);

    return { success: true };

  } catch (err) {
    await db.query("ROLLBACK");
    await client.del(redisKey);
    throw err;
  }
}

module.exports = {
  createEscrow,
  releaseEscrow
};
