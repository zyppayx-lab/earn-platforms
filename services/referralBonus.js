const db = require("../db");
const redis = require("../services/redis");

// ======================
// CONFIG
// ======================
const BONUS_AMOUNT = Number(process.env.REFERRAL_BONUS || 200);
const MIN_TASKS_REQUIRED = 2;
const LOCK_TTL = 300;

// ======================
// PROCESS REFERRAL BONUS (V3)
// ======================
async function processReferralBonus(userId) {
  const lockKey = `ref_bonus:v3:${userId}`;

  try {
    // ======================
    // 1. GLOBAL LOCK (IDEMPOTENCY)
    // ======================
    const lock = await redis.get(lockKey);
    if (lock) return { status: "locked" };

    await redis.set(lockKey, "1", "EX", LOCK_TTL);

    // ======================
    // 2. FETCH USER (single query)
    // ======================
    const userRes = await db.query(
      `SELECT id, referred_by FROM users WHERE id=$1`,
      [userId]
    );

    if (!userRes.rows.length) {
      return { status: "user_not_found" };
    }

    const { referred_by } = userRes.rows[0];

    if (!referred_by) {
      return { status: "no_referrer" };
    }

    // ======================
    // 3. FIND REFERRER
    // ======================
    const refRes = await db.query(
      `SELECT id FROM users WHERE referral_code=$1`,
      [referred_by]
    );

    if (!refRes.rows.length) {
      return { status: "referrer_not_found" };
    }

    const referrerId = refRes.rows[0].id;

    if (referrerId === userId) {
      return { status: "self_referral_blocked" };
    }

    // ======================
    // 4. CHECK ALREADY PAID (IMPORTANT IDENTITY RULE)
    // ======================
    const exists = await db.query(
      `SELECT 1 FROM referrals WHERE referred_id=$1 LIMIT 1`,
      [userId]
    );

    if (exists.rows.length) {
      return { status: "already_paid" };
    }

    // ======================
    // 5. TASK COMPLETION RULE
    // ======================
    const taskRes = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM task_submissions
       WHERE user_id=$1 AND status='approved'`,
      [userId]
    );

    const completed = taskRes.rows[0].count;

    if (completed < MIN_TASKS_REQUIRED) {
      return { status: "not_eligible" };
    }

    // ======================
    // 6. TRANSACTION (SAFE ATOMIC BLOCK)
    // ======================
    await db.query("BEGIN");

    // credit referrer
    await db.query(
      `UPDATE users SET balance = balance + $1 WHERE id=$2`,
      [BONUS_AMOUNT, referrerId]
    );

    // referral record
    await db.query(
      `INSERT INTO referrals (referrer_id, referred_id, bonus_paid)
       VALUES ($1,$2,true)`,
      [referrerId, userId]
    );

    // ledger (enterprise tracking)
    await db.query(
      `INSERT INTO transaction_ledger (user_id, type, amount, metadata)
       VALUES ($1,'referral_bonus',$2,$3)`,
      [
        referrerId,
        BONUS_AMOUNT,
        JSON.stringify({ referredUserId: userId })
      ]
    );

    await db.query("COMMIT");

    return { status: "success", bonus: BONUS_AMOUNT };

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("ReferralBonusV3 error:", err.message);
    throw err;

  } finally {
    await redis.del(lockKey);
  }
}

module.exports = {
  processReferralBonus
};
