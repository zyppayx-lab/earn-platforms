const cron = require("node-cron");
const db = require("../db");
const redis = require("./redis");

const { releaseEscrow } = require("./escrow");
const { processReferralBonus } = require("./referralBonus");
const { detectFraud } = require("./fraud");
const { sendNotification } = require("./notifications");

// ======================
// CONFIG
// ======================
const GLOBAL_LOCK = "auto_approval_lock_v2";
const LOCK_TTL = 600;
const TASK_LOCK_TTL = 3600;
const BATCH_LIMIT = 50;

// ======================
// SAFE LOCK HELPERS
// ======================
async function acquireLock(key, ttl) {
  const result = await redis.set(key, "1", "NX", "EX", ttl);
  return result === "OK";
}

async function releaseLock(key) {
  await redis.del(key);
}

// ======================
// AUTO TASK APPROVAL JOB (V2)
// ======================
cron.schedule("*/10 * * * *", async () => {
  console.log("⏱ Auto-approval job v2 running...");

  const locked = await acquireLock(GLOBAL_LOCK, LOCK_TTL);
  if (!locked) return;

  let processed = 0;

  try {
    // ======================
    // FETCH PENDING TASKS
    // ======================
    const pending = await db.query(
      `SELECT ts.*, t.reward, t.escrow_id
       FROM task_submissions ts
       JOIN tasks t ON ts.task_id = t.id
       WHERE ts.status='pending'
       AND ts.created_at < NOW() - INTERVAL '24 hours'
       ORDER BY ts.created_at ASC
       LIMIT $1`,
      [BATCH_LIMIT]
    );

    for (const sub of pending.rows) {
      const taskLockKey = `task_process_v2:${sub.id}`;

      // ======================
      // PER-TASK LOCK
      // ======================
      const taskLocked = await acquireLock(taskLockKey, TASK_LOCK_TTL);
      if (!taskLocked) continue;

      try {
        const userId = sub.user_id;

        // ======================
        // 1. ESCROW RELEASE
        // ======================
        await releaseEscrow(
          sub.escrow_id,
          userId,
          sub.reward
        );

        // ======================
        // 2. MARK APPROVED (SAFE UPDATE)
        // ======================
        await db.query(
          `UPDATE task_submissions
           SET status='approved'
           WHERE id=$1 AND status!='approved'`,
          [sub.id]
        );

        // ======================
        // 3. FRAUD CHECK (ASYNC SAFE)
        // ======================
        const risk = await detectFraud(userId);

        // ======================
        // 4. REFERRAL BONUS
        // ======================
        await processReferralBonus(userId);

        // ======================
        // 5. NOTIFICATION
        // ======================
        await sendNotification(
          userId,
          "Task Auto-Approved ✅",
          `₦${sub.reward} has been credited`
        );

        // ======================
        // LOG SUCCESS
        // ======================
        console.log(`[AUTO-APPROVE SUCCESS] task=${sub.id} user=${userId} risk=${risk}`);

        processed++;

      } catch (err) {
        console.error(`[TASK ERROR] id=${sub.id}`, err.message);
      } finally {
        await releaseLock(taskLockKey);
      }
    }

    console.log(`✅ Auto-approval completed. Processed: ${processed}`);

  } catch (err) {
    console.error("❌ Scheduler fatal error:", err.message);

  } finally {
    await releaseLock(GLOBAL_LOCK);
  }
});
