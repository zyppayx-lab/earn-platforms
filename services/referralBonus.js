const db = require("../db");
const { checkReferralBonus } = require("./referral");

async function processReferralBonus(userId) {
  const eligible = await checkReferralBonus(userId);

  if (!eligible) return;

  // find referrer
  const user = await db.query(
    "SELECT referred_by FROM users WHERE id=$1",
    [userId]
  );

  if (!user.rows[0].referred_by) return;

  const referrer = await db.query(
    "SELECT * FROM users WHERE referral_code=$1",
    [user.rows[0].referred_by]
  );

  if (!referrer.rows.length) return;

  const referrerId = referrer.rows[0].id;

  // prevent double payment
  const exists = await db.query(
    "SELECT * FROM referrals WHERE referred_id=$1",
    [userId]
  );

  if (exists.rows.length) return;

  await db.query("BEGIN");

  // credit referrer
  await db.query(
    "UPDATE users SET balance = balance + 300 WHERE id=$1",
    [referrerId]
  );

  // log referral
  await db.query(
    `INSERT INTO referrals (referrer_id, referred_id, bonus_paid)
     VALUES ($1,$2,true)`,
    [referrerId, userId]
  );

  // transaction log
  await db.query(
    `INSERT INTO transactions (user_id, type, amount)
     VALUES ($1,'referral_bonus',300)`,
    [referrerId]
  );

  await db.query("COMMIT");
}

module.exports = { processReferralBonus };
