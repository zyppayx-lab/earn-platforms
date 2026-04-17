const db = require("../db");

async function detectFraud(userId) {
  const user = await db.query("SELECT * FROM users WHERE id=$1", [userId]);

  let risk = 0;

  // RULE 1: too many tasks too fast
  const tasks = await db.query(
    `SELECT COUNT(*) FROM task_submissions WHERE user_id=$1`,
    [userId]
  );

  if (parseInt(tasks.rows[0].count) > 20) risk += 40;

  // RULE 2: multiple accounts same device (future upgrade)
  if (user.rows[0].email.includes("+")) risk += 20;

  // RULE 3: rapid withdrawals pattern (future data)
  if (risk >= 70) {
    await db.query(
      "UPDATE users SET status='frozen' WHERE id=$1",
      [userId]
    );

    await db.query(
      `INSERT INTO fraud_flags (user_id, severity, reason)
       VALUES ($1,'high','Auto fraud detection triggered')`,
      [userId]
    );
  }

  return risk;
}

module.exports = { detectFraud };
