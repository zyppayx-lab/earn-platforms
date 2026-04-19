const db = require("../db");
const finance = require("../services/finance");
const { sendPush } = require("../services/notifications");
const { detectFraud } = require("../services/fraud");
const { processReferralBonus } = require("../services/referralBonus");

// ======================
// CREATE TASK (VENDOR SIDE)
// ======================
exports.createTask = async (req, res) => {
  const { title, description, reward } = req.body;
  const vendorId = req.user.id;

  try {
    const task = await db.query(
      `INSERT INTO tasks (title, description, reward, vendor_id)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [title, description, reward, vendorId]
    );

    res.json(task.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// SUBMIT TASK (USER SIDE)
// ======================
exports.submitTask = async (req, res) => {
  const { task_id } = req.body;

  try {
    const submission = await db.query(
      `INSERT INTO submissions (task_id, user_id, status)
       VALUES ($1,$2,'pending')
       RETURNING *`,
      [task_id, req.user.id]
    );

    res.json(submission.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// APPROVE TASK (CORE FINANCE FLOW)
// ======================
exports.approveTask = async (req, res) => {
  const { submission_id } = req.body;

  try {
    const sub = await db.query(
      `SELECT * FROM submissions WHERE id=$1`,
      [submission_id]
    );

    if (!sub.rows.length) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const submission = sub.rows[0];
    const userId = submission.user_id;

    // get task reward
    const task = await db.query(
      `SELECT reward FROM tasks WHERE id=$1`,
      [submission.task_id]
    );

    const reward = task.rows[0].reward;

    // ======================
    // 💰 CREDIT USER (FINANCE ENGINE)
    // ======================
    await finance.credit(
      userId,
      reward,
      "task_reward",
      { task_id: submission.task_id, submission_id }
    );

    // ======================
    // 🚨 FRAUD CHECK
    // ======================
    await detectFraud(userId);

    // ======================
    // 🎁 REFERRAL BONUS
    // ======================
    await processReferralBonus(userId);

    // ======================
    // 🔔 NOTIFY USER
    // ======================
    await sendPush(
      userId,
      "Task Approved 🎉",
      `You earned ₦${reward}`
    );

    // update submission
    await db.query(
      `UPDATE submissions SET status='approved' WHERE id=$1`,
      [submission_id]
    );

    res.json({ message: "Task approved & paid" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
