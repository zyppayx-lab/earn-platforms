const db = require("../db");
const crypto = require("crypto");

// ======================
// SECURE REFERRAL CODE GENERATOR
// ======================
function generateCode() {
  // cryptographically strong + collision-resistant
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// ======================
// ENSURE UNIQUE REFERRAL CODE
// ======================
async function createUniqueCode() {
  let code;
  let exists = true;

  while (exists) {
    code = generateCode();

    const res = await db.query(
      "SELECT id FROM users WHERE referral_code=$1",
      [code]
    );

    exists = res.rows.length > 0;
  }

  return code;
}

// ======================
// REFERRAL BONUS ELIGIBILITY (OPTIMIZED + FRAUD-SAFE)
// ======================
async function checkReferralBonus(userId) {
  // count approved tasks
  const tasks = await db.query(
    `SELECT COUNT(*) 
     FROM task_submissions
     WHERE user_id=$1 AND status='approved'`,
    [userId]
  );

  const taskCount = Number(tasks.rows[0].count);

  // basic eligibility rule
  if (taskCount < 2) return false;

  // ======================
  // FRAUD GUARD (IMPORTANT)
  // ======================
  const fraudCheck = await db.query(
    `SELECT risk_score 
     FROM users 
     WHERE id=$1`,
    [userId]
  );

  const risk = fraudCheck.rows[0]?.risk_score || 0;

  // block high-risk users from referral rewards
  if (risk >= 70) return false;

  return true;
}

// ======================
// OPTIONAL: CACHE BOOST (REDIS READY HOOK)
// ======================
async function getReferralEligibilityCached(userId, redis) {
  const key = `referral:eligible:${userId}`;

  const cached = await redis.get(key);
  if (cached !== null) return cached === "true";

  const eligible = await checkReferralBonus(userId);

  await redis.set(key, eligible.toString(), "EX", 300); // 5 min cache

  return eligible;
}

module.exports = {
  generateCode,
  createUniqueCode,
  checkReferralBonus,
  getReferralEligibilityCached
};
