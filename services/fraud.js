const db = require("../db");
const client = require("./redis");

// ======================
// THRESHOLDS (EASY TUNING LATER)
// ======================
const THRESHOLDS = {
  TASK_LOW: 5,
  TASK_HIGH: 15,
  WITHDRAWAL_LIMIT: 3,
  RISK_RESTRICT: 70,
  RISK_FREEZE: 90
};

// ======================
// FRAUD RISK ENGINE
// ======================
async function detectFraud(userId) {
  const user = await db.query(
    "SELECT id, email FROM users WHERE id=$1",
    [userId]
  );

  if (!user.rows.length) return 0;

  let risk = 0;
  const email = user.rows[0].email;

  // ======================
  // RULE 1: TASK ABUSE
  // ======================
  const recentTasks = await db.query(
    `SELECT COUNT(*) FROM task_submissions
     WHERE user_id=$1
     AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId]
  );

  const taskCount = Number(recentTasks.rows[0].count);

  if (taskCount > THRESHOLDS.TASK_LOW) risk += 30;
  if (taskCount > THRESHOLDS.TASK_HIGH) risk += 50;

  // ======================
  // RULE 2: WALLET ACTIVITY (REDIS)
  // ======================
  const key = `wallet_activity:${userId}`;
  const raw = await client.get(key);

  let activityCount = 0;

  if (raw) {
    try {
      const data = JSON.parse(raw);
      activityCount = data.count || 0;
    } catch {
      activityCount = 0;
    }
  }

  activityCount += 1;

  await client.set(
    key,
    JSON.stringify({ count: activityCount }),
    "EX",
    3600
  );

  if (activityCount > 10) risk += 30;
  if (activityCount > 20) risk += 50;

  // ======================
  // RULE 3: MULTI ACCOUNT
  // ======================
  if (email.includes("+")) {
    risk += 15;
  }

  // ======================
  // RULE 4: WITHDRAWALS
  // ======================
  const withdrawals = await db.query(
    `SELECT COUNT(*) FROM withdrawals
     WHERE user_id=$1
     AND created_at > NOW() - INTERVAL '24 hours'`,
    [userId]
  );

  const withdrawalCount = Number(withdrawals.rows[0].count);

  if (withdrawalCount > THRESHOLDS.WITHDRAWAL_LIMIT) {
    risk += 40;
  }

  // ======================
  // FINAL ACTION
  // ======================
  if (risk >= THRESHOLDS.RISK_RESTRICT && risk < THRESHOLDS.RISK_FREEZE) {
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

  if (risk >= THRESHOLDS.RISK_FREEZE) {
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
