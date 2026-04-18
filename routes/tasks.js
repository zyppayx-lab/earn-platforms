const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

const { releaseEscrow } = require("../services/escrow");
const { processReferralBonus } = require("../services/referralBonus");
const { detectFraud } = require("../services/fraud");

const { publishEvent } = require("../services/events");
const { sendPush } = require("../services/notifications");

// ======================
// 🧩 CREATE TASK (VENDOR)
// ======================
router.post("/create", auth, async (req, res) => {
  const { title, description, reward } = req.body;

  try {
    const task = await db.query(
      `INSERT INTO tasks (title, description, reward, vendor_id)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [title, description, reward, req.user.id]
    );

    // 🔴 REAL-TIME EVENT (ALL USERS)
    await publishEvent("new_task", {
      title: "New Task Available",
      message: "A new earning task is live"
    });

    // (Optional: later we add bulk push to all users)

    res.json(task.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 📤 SUBMIT TASK
// ======================
router.post("/submit", auth, async (req, res) => {
  const { task_id, proof } = req.body;

  try {
    const submission = await db.query(
      `INSERT INTO task_submissions (task_id, user_id, proof, status)
       VALUES ($1,$2,$3,'pending')
       RETURNING *`,
      [task_id, req.user.id, proof]
    );

    res.json(submission.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// ✅ APPROVE TASK (CORE ENGINE)
// ======================
router.post("/approve", auth, async (req, res) => {
  const { submission_id } = req.body;

  try {
    await db.query("BEGIN");

    // get submission
    const sub = await db.query(
      "SELECT * FROM task_submissions WHERE id=$1",
      [submission_id]
    );

    if (!sub.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Submission not found" });
    }

    // get task
    const task = await db.query(
      "SELECT * FROM tasks WHERE id=$1",
      [sub.rows[0].task_id]
    );

    const userId = sub.rows[0].user_id;
    const reward = task.rows[0].reward;

    // 💰 1. RELEASE ESCROW (PAY USER)
    await releaseEscrow(
      task.rows[0].escrow_id,
      userId,
      reward
    );

    // ✅ 2. MARK APPROVED
    await db.query(
      "UPDATE task_submissions SET status='approved' WHERE id=$1",
      [submission_id]
    );

    // ======================
    // 🤖 3. FRAUD CHECK
    // ======================
    await detectFraud(userId);

    // ======================
    // 🔗 4. REFERRAL BONUS
    // ======================
    await processReferralBonus(userId);

    // ======================
    // 📲 5. PUSH NOTIFICATION
    // ======================
    await sendPush(
      userId,
      "Task Approved 🎉",
      `You earned ₦${reward}`
    );

    await db.query("COMMIT");

    res.json({
      message: "Task approved, paid, fraud checked, referral processed, notification sent"
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
