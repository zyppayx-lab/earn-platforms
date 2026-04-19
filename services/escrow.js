const db = require("../db");

// ======================
// CREATE ESCROW (LOCK FUNDS)
// ======================
async function createEscrow(userId, taskId, amount) {
  const escrow = await db.query(
    `INSERT INTO escrow (user_id, task_id, amount, status)
     VALUES ($1,$2,$3,'locked')
     RETURNING *`,
    [userId, taskId, amount]
  );

  return escrow.rows[0];
}

// ======================
// RELEASE ESCROW (SAFE)
// ======================
async function releaseEscrow(escrowId, userId, amount) {
  const client = await db.query("BEGIN");

  try {
    // 1. check escrow exists & still locked
    const escrow = await db.query(
      `SELECT * FROM escrow 
       WHERE id=$1 AND status='locked'`,
      [escrowId]
    );

    if (!escrow.rows.length) {
      throw new Error("Escrow not found or already released");
    }

    // 2. ensure correct user ownership
    if (escrow.rows[0].user_id !== userId) {
      throw new Error("Unauthorized escrow release");
    }

    // 3. mark escrow as released
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

    // 5. ledger entry (FINANCIAL CORE)
    await db.query(
      `INSERT INTO transaction_ledger (user_id, type, amount)
       VALUES ($1,'task_reward',$2)`,
      [userId, amount]
    );

    await db.query("COMMIT");

    return { success: true };

  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

module.exports = {
  createEscrow,
  releaseEscrow
};
