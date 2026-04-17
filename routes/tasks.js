const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");
const { createEscrow, releaseEscrow } = require("../services/escrow");

// ======================
// 📌 CREATE TASK + FUND ESCROW (VENDOR)
// ======================
router.post("/create", auth, async (req, res) => {
  const { title, description, reward, limit_count } = req.body;

  try {
    await db.query("BEGIN");

    // 1. create task
    const task = await db.query(
      `INSERT INTO tasks (title, description, reward, limit_count, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description, reward, limit_count, req.user.id]
    );

    const taskId = task.rows[0].id;

    // 2. create escrow (LOCK MONEY LOGIC)
    const escrow = await createEscrow(req.user.id, taskId, reward);

    // 3. link escrow to task
    await db.query(
      "UPDATE tasks SET escrow_id=$1, funded=true WHERE id=$2",
      [escrow.id, taskId]
    );

    await db.query("COMMIT");

    res.json({
      message: "Task created and funded",
      task: task.rows[0],
      escrow
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 📌 GET TASKS
// ======================
router.get("/", auth, async (req, res) => {
  const tasks = await db.query(
    "SELECT * FROM tasks WHERE status='active' AND funded=true"
  );

  res.json(tasks.rows);
});

// ======================
// 📌 SUBMIT TASK PROOF
// ======================
router.post("/submit", auth, async (req, res) => {
  const { task_id, proof } = req.body;

  const submission = await db.query(
    `INSERT INTO task_submissions (task_id, user_id, proof)
     VALUES ($1,$2,$3) RETURNING *`,
    [task_id, req.user.id, proof]
  );

  res.json(submission.rows[0]);
});

// ======================
// 📌 APPROVE TASK (RELEASE ESCROW)
// ======================
router.post("/approve", auth, async (req, res) => {
  const { submission_id } = req.body;

  try {
    await db.query("BEGIN");

    const sub = await db.query(
      "SELECT * FROM task_submissions WHERE id=$1",
      [submission_id]
    );

    const task = await db.query(
      "SELECT * FROM tasks WHERE id=$1",
      [sub.rows[0].task_id]
    );

    // release escrow money
    await releaseEscrow(
      task.rows[0].escrow_id,
      sub.rows[0].user_id,
      task.rows[0].reward
    );

    // mark submission approved
    await db.query(
      "UPDATE task_submissions SET status='approved' WHERE id=$1",
      [submission_id]
    );

    await db.query("COMMIT");

    res.json({ message: "Task approved & paid automatically" });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
