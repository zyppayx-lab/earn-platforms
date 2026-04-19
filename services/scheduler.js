const cron = require("node-cron");
const db = require("../db");
const redis = require("./redis");

const { releaseEscrow } = require("./escrow");
const { processReferralBonus } = require("./referralBonus");
const { detectFraud } = require("./fraud");
const { sendNotification } = require("./notifications");

const client = redis;

// ======================
// AUTO TASK APPROVAL JOB
// ======================
cron.schedule("*/10 * * * *", async () => {
  console.log("⏱ Running auto-approval job...");

  // 🔒 global lock (prevents multi-instance duplication)
  const lock = await client.get("auto_approval_lock");
  if (lock) return;

  await client.set("auto_approval_lock", "1", { EX: 600 });

  try {
    const pending = await db.query(
      `SELECT ts.*, t.reward, t.escrow_id
       FROM task_submissions ts
       JOIN tasks t ON ts.task_id = t.id
       WHERE ts.status='pending'
       AND ts.created_at < NOW() - INTERVAL '24 hours'
       LIMIT 50`
    );

    for (let sub of pending.rows) {
      const userId = sub.user_id;

      // 🔒 per-task lock (prevents double processing)
      const taskLockKey = `task_process:${sub.id}`;
      const taskLock = await client.get(taskLockKey);

      if (taskLock) continue;

      await client.set(taskLockKey, "1", { EX: 3600 });

      try {
        // ======================
        // 1. RELEASE ESCROW
        // ======================
        await releaseEscrow(
          sub.escrow_id,
          userId,
          sub.reward
        );

        // ======================
        // 2. MARK APPROVED
        // ======================
        await db.query(
          "UPDATE task_submissions SET status='approved' WHERE id=$1",
          [sub.id]
        );

        // ======================
        // 3. FRAUD CHECK
        // ======================
        const risk = await detectFraud(userId);

        // ======================
        // 4. REFERRAL BONUS
        // ======================
        await processReferralBonus(userId);

        // ======================
        // 5. NOTIFICATION (NEW SYSTEM)
        // ======================
        await sendNotification(
          userId,
          "Task Auto-Approved ✅",
          `₦${sub.reward} has been credited`
        );

        console.log(`✅ Auto-approved task: ${sub.id}`);

      } catch (err) {
        console.error(`❌ Task failed ${sub.id}:`, err.message);
      }
    }

  } catch (err) {
    console.error("Auto-approval job error:", err);

  } finally {
    await client.del("auto_approval_lock");
  }
});
