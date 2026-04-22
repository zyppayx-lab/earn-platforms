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

    const balance = result.rows?.[0]?.balance ?? 0;

    return res.json({ balance });

  } catch (err) {
    console.error("BALANCE ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// ======================
// GET TRANSACTIONS
// ======================
router.get("/transactions", auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM transactions 
       WHERE user_id=$1 
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    return res.json(result.rows);

  } catch (err) {
    console.error("TRANSACTION ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

module.exports = router;
