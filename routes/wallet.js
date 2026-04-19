const router = require("express").Router();

const auth = require("../middleware/auth");
const db = require("../db");

// ======================
// GET BALANCE
// ======================
router.get("/balance", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [req.user.id]
    );

    res.json({
      balance: result.rows[0]?.balance || 0
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// GET TRANSACTIONS (IMPORTANT FOR FINTECH)
// ======================
router.get("/transactions", auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM transactions 
       WHERE user_id=$1 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
