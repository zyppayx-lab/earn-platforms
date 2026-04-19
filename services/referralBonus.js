const db = require("../db");
const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.connect();

// ======================
// PROCESS REFERRAL BONUS
// ======================
async function processReferralBonus(userId) {
  const lockKey = `ref_bonus:${userId}`;

  try {
    // 🔒 prevent duplicate processing
    const locked = await client.get(lockKey);

    if (locked) return;

    await client.set(lockKey, "processing", { EX: 300 });

    // ======================
    // GET USER
    // ======================
    const user = await db.query(
      "SELECT id, referred_by FROM users WHERE id=$1",
      [userId]
    );

    if (!user.rows.length) {
      await client.del(lockKey);
      return;
    }

    const refCode = user.rows[0].referred_by;

    if (!refCode) {
      await client.del(lockKey);
      return;
    }

    // ======================
    // FIND REFERRER
    // ======================
    const referrer = await db.query(
      "SELECT id FROM users WHERE referral_code=$1",
      [refCode]
    );

    if (!referrer.rows.length) {
      await client.del(lockKey);
      return;
    }

    const referrerId = referrer.rows[0].id;

    // prevent self referral
    if (referrerId === userId) {
      await client.del(lockKey);
      return;
    }

    // ======================
    // CHECK IF ALREADY PAID
    // ======================
    const exists = await db.query(
      "SELECT id FROM referrals WHERE referred_id=$1",
      [userId]
    );

    if (exists.rows.length) {
      await client.del(lockKey);
      return;
    }

    // ======================
    // TASK COMPLETION RULE
    // ======================
    const taskCheck = await db.query(
      `SELECT COUNT(*) FROM task_submissions
       WHERE user_id=$1 AND status='approved'`,
      [userId]
    );

    const completedTasks = Number(taskCheck.rows[0].count);

    if (completedTasks < 2) {
      await client.del(lockKey);
      return;
    }

    // ======================
    // BONUS CONFIG
    // ======================
    const BONUS_AMOUNT = Number(process.env.REFERRAL_BONUS || 200);

    await db.query("BEGIN");

    // credit referrer
    await db.query(
      `UPDATE users
       SET balance = balance + $1
       WHERE id=$2`,
      [BONUS_AMOUNT, referrerId]
    );

    // referral log
    await db.query(
      `INSERT INTO referrals (referrer_id, referred_id, bonus_paid)
       VALUES ($1,$2,true)`,
      [referrerId, userId]
    );

    // transaction log
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'referral_bonus',$2)`,
      [referrerId, BONUS_AMOUNT]
    );

    await db.query("COMMIT");

    await client.del(lockKey);

  } catch (err) {
    await db.query("ROLLBACK");

    // 🔥 ALWAYS CLEAN LOCK
    await client.del(lockKey);

    console.error("Referral bonus error:", err);
  }
}

module.exports = { processReferralBonus };
