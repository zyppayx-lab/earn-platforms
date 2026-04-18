const cron = require("node-cron");
const db = require("../db");

const { releaseEscrow } = require("./escrow");
const { processReferralBonus } = require("./referralBonus");
const { detectFraud } = require("./fraud");
const { sendPush } = require("./notifications");

// run every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  console.log("⏱ Running auto-approval job...");

  try {
    const pending = await db.query(
      `SELECT ts.*, t.reward, t.escrow_id
       FROM task_submissions ts
       JOIN tasks t ON ts.task_id = t.id
       WHERE ts.status='pending'
       AND ts.created_at < NOW() - INTERVAL '24 hours'`
    );

    for (let sub of pending.rows) {
      const userId = sub.user_id;

      await db.query("BEGIN");

      // 💰 release escrow
      await releaseEscrow(sub.escrow_id, userId, sub.reward);

      // ✅ mark approved
      await db.query(
        "UPDATE task_submissions SET status='approved' WHERE id=$1",
        [sub.id]
      );

      // 🤖 fraud
      await detectFraud(userId);

      // 🔗 referral
      await processReferralBonus(userId);

      // 📲 notify
      await sendPush(
        userId,
        "Task Auto-Approved ✅",
        `₦${sub.reward} has been credited`
      );

      await db.query("COMMIT");

      console.log("✅ Auto-approved:", sub.id);
    }

  } catch (err) {
    console.error("Auto-approval error:", err);
  }
});
