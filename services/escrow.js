const db = require("../db");
const Redis = require("ioredis");

const client = new Redis(process.env.REDIS_URL);

// ======================
// CREATE ESCROW (LOCK FUNDS)
// ======================
async function createEscrow(userId, taskId, amount) {
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

  // Redis lock
  await client.set(
    `escrow:${taskId}`,
    JSON.stringify({
      userId,
      amount,
      status: "locked"
    }),
    "EX",
    3600
  );

  return escrow.rows[0];
}

// ======================
// RELEASE ESCROW
// ======================
async function releaseEscrow(escrowId, userId, amount) {
  const lockKey = `escrow-release:${escrowId}`;

  const lock = await client.get(lockKey);
  if (lock) {
    throw new Error("Escrow already processing");
  }

  await client.set(lockKey, "locked", "EX", 30);

  try {
    await db.query("BEGIN");

    const escrow = await db.query(
      `SELECT * FROM escrow 
       WHERE id=$1 AND status='locked'`,
      [escrowId]
    );

    if (!escrow.rows.length) {
      throw new Error("Escrow not found or already released");
    }

    if (escrow.rows[0].user_id !== userId) {
      throw new Error("Unauthorized escrow release");
    }

    await db.query(
      `UPDATE escrow SET status='released' WHERE id=$1`,
      [escrowId]
    );

    await db.query(
      `UPDATE users SET balance = balance + $1 WHERE id=$2`,
      [amount, userId]
    );

    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'task_reward',$2)`,
      [userId, amount]
    );

    await db.query("COMMIT");

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
