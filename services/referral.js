const db = require("../db");

// Generate referral code
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Check referral bonus eligibility
async function checkReferralBonus(userId) {
  // count completed tasks
  const tasks = await db.query(
    `SELECT COUNT(*) FROM task_submissions
     WHERE user_id=$1 AND status='approved'`,
    [userId]
  );

  return parseInt(tasks.rows[0].count) >= 2;
}

module.exports = { generateCode, checkReferralBonus };
