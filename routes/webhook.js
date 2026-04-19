const router = require("express").Router();
const crypto = require("crypto");
const db = require("../db");

// ======================
// PAYSTACK WEBHOOK
// ======================
router.post("/paystack", async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET;

  const hash = crypto
    .createHmac("sha512", secret)
    .update(req.rawBody)
    .digest("hex");

  const signature = req.headers["x-paystack-signature"];

  if (hash !== signature) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;

  try {
    if (event.event === "charge.success") {

      const reference = event.data.reference;
      const amount = event.data.amount / 100;
      const email = event.data.customer.email;

      // ======================
      // CHECK PAYMENT EXISTS
      // ======================
      const payment = await db.query(
        "SELECT * FROM payments WHERE reference=$1",
        [reference]
      );

      if (!payment.rows.length) return res.sendStatus(200);

      if (payment.rows[0].status === "success") {
        return res.sendStatus(200); // prevent double credit
      }

      const user = await db.query(
        "SELECT id FROM users WHERE email=$1",
        [email]
      );

      if (!user.rows.length) return res.sendStatus(200);

      const userId = user.rows[0].id;

      await db.query("BEGIN");

      // mark payment success
      await db.query(
        "UPDATE payments SET status='success' WHERE reference=$1",
        [reference]
      );

      // ======================
      // CREDIT WALLET (SAFE)
      // ======================
      await db.query(
        `UPDATE users SET balance = balance + $1 WHERE id=$2`,
        [amount, userId]
      );

      // ======================
      // TRANSACTION LOG
      // ======================
      await db.query(
        `INSERT INTO transactions (user_id, type, amount, reference)
         VALUES ($1,'deposit',$2,$3)`,
        [userId, amount, reference]
      );

      await db.query("COMMIT");
    }

    res.sendStatus(200);

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
