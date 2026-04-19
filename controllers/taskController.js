const db = require("../db");
const { detectFraud } = require("../services/fraud");
const { processReferralBonus } = require("../services/referralBonus");
const { sendPush } = require("../services/notifications");

// ======================
// CREATE TASK
// ======================
exports.createTask = async (req, res) => {
  const { title, description, reward } = req.body;

  try {
    const task = await db.query(
      `INSERT INTO tasks (title, description, reward)
       VALUES ($1,$2,$3) RETURNING *`,
      [title, description, reward]
    );

    res.json(task.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// SUBMIT TASK
// ======================
exports.submitTask = async (req, res) => {
  const { task_id } = req.body;
  const user_id = req.user.id;

  try {
    const sub = await db.query(
      `INSERT INTO submissions (task_id, user_id, status)
       VALUES ($1,$2,'pending') RETURNING *`,
      [task_id, user_id]
    );

    res.json(sub.rows[0]);c
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// APPROVE TASK
// ======================
exports.approveTask = async (req, res) => {
  const { submission_id } = req.body;

  try {
    const sub = await db.query(
      `UPDATE submissions
       SET status='approved'
       WHERE id=$1
       RETURNING *`,
      [submission_id]
    );

    const userId = sub.rows[0].user_i rug 
    // 💰 credit wallet
    await db.query(
      "UPDATE users SET balance = balance + 100 WHERE id=$1",
      [userId]
    );

    // 🚨 fraud detection
    await detectFraud(userId);

    // 🎁 referral bonus
    await processReferralBonus(userId);

    // 🔔 notification
    await sendPush(userId, "Task Approved 🎉", "You earned money!");

    res.json({ message: "Task approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};tyf
