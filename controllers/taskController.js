const db = require("../db");
const { detectFraud } = require("../services/fraud");
const { processReferralBonus } = require("../services/referralBonus");
const { sendNotification } = require("../services/notifications");
const { publishEvent, publishDashboardUpdate } = require("../services/events");

// ======================
// CREATE TASK (SAFE)
// ======================
exports.createTask = async (req, res) => {
  const { title, reward, total_slots } = req.body;
  const vendorId = req.user.id;

  try {
    const totalCost = reward * total_slots;

    const vendor = await db.query(
      "SELECT balance FROM vendors WHERE id=$1",
      [vendorId]
    );

    if (!vendor.rows.length) {
      return res.status(400).json({ error: "Vendor not found" });
    }

    if (vendor.rows[0].balance < totalCost) {
      return res.status(400).json({ error: "Insufficient vendor balance" });
    }

    const task = await db.transaction(async (client) => {

      // deduct vendor balance
      await client.query(
        "UPDATE vendors SET balance = balance - $1 WHERE id=$2",
        [totalCost, vendorId]
      );

      // create task
      const result = await client.query(
        `INSERT INTO tasks (title, reward, total_slots, vendor_id, status)
         VALUES ($1,$2,$3,$4,'active')
         RETURNING *`,
        [title, reward, total_slots, vendorId]
      );

      return result.rows[0];
    });

    // escrow OUTSIDE DB transaction (important fix)
    await require("../services/escrow").createEscrow(
      vendorId,
      task.id,
      totalCost
    );

    await publishEvent("task_created", { task });

    await publishDashboardUpdate({
      source: "task_created"
    });

    res.json(task);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// SUBMIT TASK
// ======================
exports.submitTask = async (req, res) => {
  const { task_id, proof } = req.body;
  const userId = req.user.id;

  try {
    const existing = await db.query(
      `SELECT id FROM task_submissions
       WHERE task_id=$1 AND user_id=$2`,
      [task_id, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Already submitted" });
    }

    await db.query(
      `INSERT INTO task_submissions (task_id, user_id, proof, status)
       VALUES ($1,$2,$3,'pending')`,
      [task_id, userId, proof]
    );

    await publishDashboardUpdate({
      source: "task_submission"
    });

    res.json({ message: "Task submitted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// APPROVE TASK (IDEMPOTENT SAFE)
// ======================
exports.approveTask = async (req, res) => {
  const { submission_id } = req.body;

  try {
    const sub = await db.query(
      `SELECT * FROM task_submissions WHERE id=$1`,
      [submission_id]
    );

    if (!sub.rows.length) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (sub.rows[0].status !== "pending") {
      return res.status(400).json({ error: "Already processed" });
    }

    const task = await db.query(
      `SELECT * FROM tasks WHERE id=$1`,
      [sub.rows[0].task_id]
    );

    if (!task.rows.length) {
      return res.status(404).json({ error: "Task not found" });
    }

    const reward = task.rows[0].reward;
    const userId = sub.rows[0].user_id;

    await db.transaction(async (client) => {

      await client.query(
        `UPDATE task_submissions
         SET status='approved'
         WHERE id=$1`,
        [submission_id]
      );

      await client.query(
        `INSERT INTO transactions (user_id, type, amount)
         VALUES ($1,'task_reward',$2)`,
        [userId, reward]
      );
    });

    // external side effects AFTER DB commit
    await require("../services/escrow").releaseEscrow(
      sub.rows[0].task_id,
      userId,
      reward
    );

    await detectFraud(userId);
    await processReferralBonus(userId);

    await sendNotification(
      userId,
      "Task Approved 🎉",
      `You earned ₦${reward}`,
      "success"
    );

    await publishEvent("task_approved", {
      userId,
      reward
    });

    await publishDashboardUpdate({
      source: "task_approved"
    });

    res.json({ message: "Task approved" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
