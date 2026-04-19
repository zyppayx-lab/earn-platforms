const db = require("../db");

// ======================
// GET BALANCE
// ======================
exports.getBalance = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await db.query(
      "SELECT balance FROM users WHERE id=$1",
      [userId]
    );

    res.json({ balance: user.rows[0].balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
