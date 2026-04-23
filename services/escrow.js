const db = require("../db");
const Redis = require("ioredis");
const { writeLedger } = require("./ledgerEngine");

const client = new Redis(process.env.REDIS_URL);

const ESCROW_STATUS = {
  CREATED: "created",
  LOCKED: "locked",
  RELEASED: "released",
  REFUNDED: "refunded",
  FAILED: "failed"
};

// ======================
// CREATE ESCROW
// ======================
async function createEscrow(userId, taskId, amount) {
  const lockKey = `escrow:create:${taskId}`;

  try {
    const locked = await client.get(lockKey);
    if (locked) throw new Error("Escrow creation in progress");

    await client.set(lockKey, "1", "EX", 20);

    const existing = await db.query(
      `SELECT id FROM escrow WHERE task_id=$1`,
      [taskId]
    );

    if (existing.rows.length) {
      throw new Error("Escrow already exists");
    }

    const escrow = await db.query(
      `INSERT INTO escrow (user_id, task_id, amount, status)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [userId, taskId, amount, ESCROW_STATUS.LOCKED]
    );

    await writeLedger({
      escrowId: escrow.rows[0].id,
      userId,
      type: "ESCROW_LOCKED",
      amount
    });

    await client.del(lockKey);

    return escrow.rows[0];

  } catch (err) {
    await client.del(lockKey);
    throw err;
  }
}

// ======================
// RELEASE ESCROW (BANK SAFE)
// ======================
async function releaseEscrow(escrowId) {
  const lockKey = `escrow:release:${escrowId}`;

  try {
    const lock = await client.get(lockKey);
    if (lock) throw new Error("Escrow processing");

    await client.set(lockKey, "1", "EX", 20);

    await db.query("BEGIN");

    const esc = await db.query(
      `SELECT * FROM escrow WHERE id=$1 FOR UPDATE`,
      [escrowId]
    );

    if (!esc.rows.length) throw new Error("Not found");

    const escrow = esc.rows[0];

    if (escrow.status !== ESCROW_STATUS.LOCKED) {
      throw new Error("Invalid state transition");
    }

    // ======================
    // STATE CHANGE FIRST
    // ======================
    await db.query(
      `UPDATE escrow SET status=$1 WHERE id=$2`,
      [ESCROW_STATUS.RELEASED, escrowId]
    );

    // ======================
    // BALANCE UPDATE
    // ======================
    await db.query(
      `UPDATE users 
       SET balance = balance + $1 
       WHERE id=$2`,
      [escrow.amount, escrow.user_id]
    );

    // ======================
    // LEDGER ENTRY (TRUTH LAYER)
    // ======================
    await writeLedger({
      escrowId,
      userId: escrow.user_id,
      type: "ESCROW_RELEASED",
      amount: escrow.amount
    });

    await db.query("COMMIT");

    await client.del(lockKey);

    return { success: true };

  } catch (err) {
    try {
      await db.query("ROLLBACK");
    } catch (_) {}

    await client.del(lockKey);
    throw err;
  }
}

// ======================
// REFUND ESCROW (ADMIN SAFETY PATH)
// ======================
async function refundEscrow(escrowId) {
  await db.query("BEGIN");

  const esc = await db.query(
    `SELECT * FROM escrow WHERE id=$1 FOR UPDATE`,
    [escrowId]
  );

  if (!esc.rows.length) throw new Error("Not found");

  const escrow = esc.rows[0];

  if (escrow.status !== ESCROW_STATUS.LOCKED) {
    throw new Error("Cannot refund non-locked escrow");
  }

  await db.query(
    `UPDATE escrow SET status=$1 WHERE id=$2`,
    [ESCROW_STATUS.REFUNDED, escrowId]
  );

  await db.query(
    `UPDATE vendors 
     SET balance = balance + $1
     WHERE id=$2`,
    [escrow.amount, escrow.user_id]
  );

  await writeLedger({
    escrowId,
    userId: escrow.user_id,
    type: "ESCROW_REFUNDED",
    amount: escrow.amount
  });

  await db.query("COMMIT");

  return true;
}

module.exports = {
  createEscrow,
  releaseEscrow,
  refundEscrow
};
