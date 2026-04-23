const db = require("../db");
const client = require("./redis");
const { emitEvent, OPS_CHANNELS } = require("./events");

// ======================
// THRESHOLDS (BASELINE)
// ======================
const THRESHOLDS = {
  LOW: 40,
  MEDIUM: 70,
  HIGH: 90
};

// ======================
// FEATURE BUILDER (KEY AI LAYER)
// ======================
async function buildFeatures(userId) {
  const [user, tasks, withdrawals] = await Promise.all([
    db.query("SELECT email, created_at FROM users WHERE id=$1", [userId]),

    db.query(
      `SELECT COUNT(*) FROM task_submissions
       WHERE user_id=$1
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    ),

    db.query(
      `SELECT COUNT(*) FROM withdrawals
       WHERE user_id=$1
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    )
  ]);

  const email = user.rows[0]?.email || "";

  const walletRaw = await client.get(`wallet_activity:${userId}`);
  const walletActivity = walletRaw ? JSON.parse(walletRaw).count : 0;

  return {
    taskVelocity: Number(tasks.rows[0].count),
    withdrawalVelocity: Number(withdrawals.rows[0].count),
    walletActivity,
    emailPattern: email.includes("+") ? 1 : 0,
    accountAgeHours:
      (Date.now() - new Date(user.rows[0]?.created_at || Date.now())) /
      (1000 * 60 * 60)
  };
}

// ======================
// AI SCORING ENGINE (HYBRID)
// ======================
function calculateRisk(features) {
  let score = 0;

  // velocity anomalies
  if (features.taskVelocity > 5) score += 25;
  if (features.taskVelocity > 15) score += 35;

  if (features.withdrawalVelocity > 3) score += 40;

  // wallet abnormal usage
  if (features.walletActivity > 10) score += 25;
  if (features.walletActivity > 20) score += 40;

  // email risk pattern
  if (features.emailPattern) score += 15;

  // new account risk
  if (features.accountAgeHours < 1) score += 20;
  if (features.accountAgeHours < 24) score += 10;

  return Math.min(score, 100);
}

// ======================
// DECISION ENGINE
// ======================
async function applyDecision(userId, riskScore, features) {
  let action = "allow";

  if (riskScore >= THRESHOLDS.HIGH) {
    action = "freeze";

    await db.query(
      `UPDATE users SET status='frozen' WHERE id=$1`,
      [userId]
    );

    await emitEvent(OPS_CHANNELS.FRAUD, {
      userId,
      riskScore,
      action,
      features
    }, "critical");
  }

  else if (riskScore >= THRESHOLDS.MEDIUM) {
    action = "restrict";

    await db.query(
      `UPDATE users SET status='restricted' WHERE id=$1`,
      [userId]
    );

    await emitEvent(OPS_CHANNELS.FRAUD, {
      userId,
      riskScore,
      action,
      features
    });
  }

  else {
    action = "allow";

    await emitEvent(OPS_CHANNELS.FRAUD, {
      userId,
      riskScore,
      action: "monitor",
      features
    });
  }

  return action;
}

// ======================
// MAIN FRAUD ENGINE
// ======================
async function detectFraud(userId) {
  const features = await buildFeatures(userId);

  const riskScore = calculateRisk(features);

  const action = await applyDecision(userId, riskScore, features);

  // store final state
  await client.set(
    `risk:${userId}`,
    JSON.stringify({
      riskScore,
      action,
      timestamp: Date.now()
    }),
    "EX",
    3600
  );

  return riskScore;
}

module.exports = { detectFraud };
