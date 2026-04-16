const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");

// GET BALANCE
router.get("/balance", auth, async (req, res) => {
  try {
    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [req.user.id]
    );

    res.json({ balance: user.rows[0].balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET TRANSACTIONS
router.get("/transactions", auth, async (req, res) => {
  try {
    const tx = await db.query(
      "SELECT * FROM transactions WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json(tx.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD MONEY (TEST ONLY - ADMIN STYLE)
router.post("/add", auth, async (req, res) => {
  const { amount } = req.body;

  try {
    await db.query("BEGIN");

    await db.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [amount, req.user.id]
    );

    await db.query(
      "INSERT INTO transactions (user_id, type, amount) VALUES ($1, $2, $3)",
      [req.user.id, "deposit", amount]
    );

    await db.query("COMMIT");

    res.json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
