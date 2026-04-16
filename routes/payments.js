const router = require("express").Router();
const db = require("../db");
const auth = require("../middleware/auth");
const { initializePayment } = require("../services/paystack");

// ======================
// 💳 INITIATE DEPOSIT
// ======================
router.post("/deposit", auth, async (req, res) => {
  const { amount } = req.body;

  try {
    const payment = await initializePayment(req.user.email, amount);

    await db.query(
      `INSERT INTO payments (user_id, reference, amount)
       VALUES ($1,$2,$3)`,
      [req.user.id, payment.data.reference, amount]
    );

    res.json(payment.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// ✅ VERIFY PAYMENT (AUTO CREDIT WALLET)
// ======================
router.get("/verify/:reference", auth, async (req, res) => {
  const { reference } = req.params;

  try {
    const payment = await db.query(
      "SELECT * FROM payments WHERE reference=$1",
      [reference]
    );

    if (!payment.rows.length) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.rows[0].status === "success") {
      return res.json({ message: "Already processed" });
    }

    // mark success
    await db.query(
      "UPDATE payments SET status='success' WHERE reference=$1",
      [reference]
    );

    // credit wallet
    await db.query(
      "UPDATE users SET balance = balance + $1 WHERE id=$2",
      [payment.rows[0].amount, req.user.id]
    );

    // transaction log
    await db.query(
      `INSERT INTO transactions (user_id, type, amount)
       VALUES ($1,'deposit',$2)`,
      [req.user.id, payment.rows[0].amount]
    );

    res.json({ message: "Wallet funded successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
