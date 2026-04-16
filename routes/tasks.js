const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

// ======================
// 📌 CREATE TASK (VENDOR / ADMIN)
// ======================
router.post("/create", auth, async (req, res) => {
  const { title, description, reward, limit_count } = req.body;

  try {
    const task = await db.query(
      `INSERT INTO tasks (title, description, reward, limit_count, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description, reward, limit_count, req.user.id]
    );

    res.json(task.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 📌 GET ALL TASKS (USERS)
// ======================
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await db.query(
      "SELECT * FROM tasks WHERE status='active' ORDER BY created_at DESC"
    );

    res.json(tasks.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 📌 SUBMIT TASK PROOF
// ======================
router.post("/submit", auth, async (req, res) => {
  const { task_id, proof } = req.body;

  try {
    const submission = await db.query(
      `INSERT INTO task_submissions (task_id, user_id, proof)
       VALUES ($1,$2,$3) RETURNING *`,
      [task_id, req.user.id, proof]
    );

    res.json(submission.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 📌 APPROVE TASK (ADMIN / VENDOR)
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

    if (sub.rows.length === 0) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const task = await db.query(
      "SELECT * FROM tasks WHERE id=$1",
      [sub.rows[0].task_id]
    );

    const reward = task.rows[0].reward;
    const userId = sub.rows[0].user_id;

    // mark approved
    await db.query(
      "UPDATE task_submissions SET status='approved' WHERE id=$1",
      [submission_id]
    );

    // credit wallet
    await db.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [reward, userId]
    );

    // transaction log
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'task_reward',$2)`,
      [userId, reward]
    );

    await db.query("COMMIT");

    res.json({ message: "Task approved and paid" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
