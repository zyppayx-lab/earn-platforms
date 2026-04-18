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

  // verify request is from Paystack
  if (hash !== signature) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = req.body;

  try {
    // ONLY handle successful payments
    if (event.event === "charge.success") {

      const reference = event.data.reference;
      const amount = event.data.amount / 100;
      const email = event.data.customer.email;

      // find payment record
      const payment = await db.query(
        "SELECT * FROM payments WHERE reference=$1",
        [reference]
      );

      if (!payment.rows.length) return res.sendStatus(200);

      if (payment.rows[0].status === "success") {
        return res.sendStatus(200);
      }

      await db.query("BEGIN");

      // mark payment success
      await db.query(
        "UPDATE payments SET status='success' WHERE reference=$1",
        [reference]
      );

      // credit user wallet
      await db.query(
        `UPDATE users SET balance = balance + $1
         WHERE email=$2`,
        [amount, email]
      );

      // transaction log
      await db.query(
        `INSERT INTO transactions (user_id, type, amount)
         SELECT id, 'deposit', $1 FROM users WHERE email=$2`,
        [amount, email]
      );

      await db.query("COMMIT");
    }

    res.sendStatus(200);

  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
