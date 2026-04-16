const db = require("../db");

// CREATE ESCROW WHEN TASK IS FUNDED
async function createEscrow(userId, taskId, amount) {
  const escrow = await db.query(
    `INSERT INTO escrow (user_id, task_id, amount, status)
     VALUES ($1,$2,$3,'locked') RETURNING *`,
    [userId, taskId, amount]
  );

  return escrow.rows[0];
}

// RELEASE ESCROW TO USER
async function releaseEscrow(escrowId, userId, amount) {
  await db.query("BEGIN");

  // mark escrow as released
  await db.query(
    "UPDATE escrow SET status='released' WHERE id=$1",
    [escrowId]
  );

  // credit wallet
  await db.query(
    "UPDATE users SET balance = balance + $1 WHERE id=$2",
    [amount, userId]
  );

  // transaction log
  await db.query(
    `INSERT INTO transactions (user_id, type, amount)
     VALUES ($1,'task_reward',$2)`,
    [userId, amount]
  );

  await db.query("COMMIT");
}

module.exports = { createEscrow, releaseEscrow };
