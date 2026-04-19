const db = require("../db");
const escrow = require("../services/escrow");

const { detectFraud } = require("../services/fraud");
const { processReferralBonus } = require("../services/referralBonus");
const { sendPush } = require("../services/notifications");
const { publishEvent } = require("../services/events");

// ======================
// CREATE TASK (VENDOR)
// ======================
exports.createTask = async (req, res) => {
  const { title, reward, total_slots } = req.body;
  const vendorId = req.user.id;

  try {
    const totalCost = reward * total_slots;

    // check vendor balance
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

    await db.query("BEGIN");

    // deduct vendor balance
    await db.query(
      "UPDATE vendors SET balance = balance - $1 WHERE id=$2",
      [totalCost, vendorId]
    );

    // create task
    const task = await db.query(
      `INSERT INTO tasks (title, reward, total_slots, vendor_id, status)
       VALUES ($1,$2,$3,$4,'active')
       RETURNING *`,
      [title, reward, total_slots, vendorId]
    );

    // lock escrow
    await escrow.lockEscrow(task.rows[0].id, vendorId, totalCost);

    await db.query("COMMIT");

    // notify users
    await publishEvent("update", {
      title: "New Task Available",
      message: "Start earning now"
    });

    res.json(task.rows[0]);

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
};

// ======================
// SUBMIT TASK (USER)
// ======================
exports.submitTask = async (req, res) => {
  const { task_id, proof } = req.body;
  const userId = req.user.id;

  try {
    const existing = await db.query(
      `SELECT * FROM task_submissions
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

    res.json({ message: "Task submitted" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ======================
// APPROVE TASK (ADMIN)
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

    if (sub.rows[0].status === "approved") {
      return res.status(400).json({ error: "Already approved" });
    }

    const task = await db.query(
      `SELECT * FROM tasks WHERE id=$1`,
      [sub.rows[0].task_id]
    );

    const reward = task.rows[0].reward;

    await db.query("BEGIN");

    // mark approved
    await db.query(
      `UPDATE task_submissions
       SET status='approved'
       WHERE id=$1`,
      [submission_id]
    );

    // release escrow + credit user
    await escrow.releaseEscrow(
      sub.rows[0].task_id,
      sub.rows[0].user_id,
      reward
    );

    // transaction log
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'task_reward',$2)`,
      [sub.rows[0].user_id, reward]
    );

    await db.query("COMMIT");

    // ======================
    // HOOKS
    // ======================
    await detectFraud(sub.rows[0].user_id);
    await processReferralBonus(sub.rows[0].user_id);

    await sendPush(
      sub.rows[0].user_id,
      "Task Approved 🎉",
      `You earned ₦${reward}`
    );

    await publishEvent("update", {
      userId: sub.rows[0].user_id,
      title: "Task Approved",
      message: `You earned ₦${reward}`
    });

    res.json({ message: "Task approved" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
};
