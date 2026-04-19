const db = require("../db");
const redis = require("redis");

const client = redis.createClient();
client.connect();

// ======================
// FRAUD RISK ENGINE
// ======================
async function detectFraud(userId) {
  const user = await db.query(
    "SELECT * FROM users WHERE id=$1",
    [userId]
  );

  if (!user.rows.length) return 0;

  let risk = 0;

  // ======================
  // RULE 1: TASK ABUSE (TIME-BASED)
  // ======================
  const recentTasks = await db.query(
    `SELECT COUNT(*) FROM task_submissions
     WHERE user_id=$1
     AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId]
  );

  const taskCount = parseInt(recentTasks.rows[0].count);

  if (taskCount > 5) risk += 30;
  if (taskCount > 15) risk += 50;

  // ======================
  // RULE 2: RAPID WALLET ACTIVITY (REDIS TRACKING)
  // ======================
  const key = `wallet_activity:${userId}`;
  const activity = await client.get(key);

  if (activity) {
    const data = JSON.parse(activity);

    if (data.count > 10) risk += 30;
    if (data.count > 20) risk += 50;
  }

  // update activity tracker
  await client.set(
    key,
    JSON.stringify({ count: (activity ? JSON.parse(activity).count : 0) + 1 }),
    { EX: 3600 }
  );

  // ======================
  // RULE 3: MULTI ACCOUNT SIGNAL (WEAK SIGNAL IMPROVED)
  // ======================
  const email = user.rows[0].email;

  if (email.includes("+")) {
    risk += 15;
  }

  // ======================
  // RULE 4: LOW BALANCE ABUSE PATTERN
  // ======================
  const withdrawals = await db.query(
    `SELECT COUNT(*) FROM withdrawals
     WHERE user_id=$1
     AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );

  if (parseInt(withdrawals.rows[0].count) > 3) {
    risk += 40;
  }

  // ======================
  // FINAL DECISION LOGIC
  // ======================

  if (risk >= 70 && risk < 90) {
    await db.query(
      `UPDATE users SET status='restricted' WHERE id=$1`,
      [userId]
    );

    await db.query(
      `INSERT INTO fraud_flags (user_id, severity, reason)
       VALUES ($1,'medium','Auto restriction triggered')`,
      [userId]
    );
  }

  if (risk >= 90) {
    await db.query(
      `UPDATE users SET status='frozen' WHERE id=$1`,
      [userId]
    );

    await db.query(
      `INSERT INTO fraud_flags (user_id, severity, reason)
       VALUES ($1,'high','Critical fraud detected')`,
      [userId]
    );
  }

  return risk;
}

module.exports = { detectFraud };
