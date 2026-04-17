const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

const { releaseEscrow } = require("../services/escrow");
const { processReferralBonus } = require("../services/referralBonus");
const { detectFraud } = require("../services/fraud");

// ======================
// APPROVE TASK (FULL CORE LOGIC)
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
      return res.status(404).json({ error: "Submission not found" });
    }

    // get task
    const task = await db.query(
      "SELECT * FROM tasks WHERE id=$1",
      [sub.rows[0].task_id]
    );

    const userId = sub.rows[0].user_id;
    const reward = task.rows[0].reward;

    // 1. release escrow money (AUTO PAYMENT)
    await releaseEscrow(
      task.rows[0].escrow_id,
      userId,
      reward
    );

    // 2. mark submission approved
    await db.query(
      "UPDATE task_submissions SET status='approved' WHERE id=$1",
      [submission_id]
    );

    // ======================
    // 3. FRAUD CHECK (AUTO SECURITY)
    // ======================
    await detectFraud(userId);

    // ======================
    // 4. REFERRAL BONUS CHECK (AUTO BONUS)
    // ======================
    await processReferralBonus(userId);

    await db.query("COMMIT");

    res.json({
      message: "Task approved, paid, fraud checked, referral processed"
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
