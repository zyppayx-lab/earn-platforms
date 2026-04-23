const router = require("express").Router();
const crypto = require("crypto");
const db = require("../db");

const Redis = require("ioredis");
const client = new Redis(process.env.REDIS_URL);

// ======================
// PAYSTACK WEBHOOK
// ======================
router.post("/paystack", async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET;

  try {
    // ======================
    // SAFE RAW BODY CHECK
    // ======================
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    if (hash !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    if (event.event !== "charge.success") {
      return res.sendStatus(200);
    }

    const reference = event.data.reference;
    const amount = Number(event.data.amount / 100);
    const email = event.data.customer.email;

    // ======================
    // IDEMPOTENCY LOCK
    // ======================
    const lockKey = `paystack:${reference}`;

    const locked = await client.get(lockKey);
    if (locked) return res.sendStatus(200);

    await client.set(lockKey, "processing", "EX", 300);

    // ======================
    // PAYMENT CHECK
    // ======================
    const payment = await db.query(
      "SELECT * FROM payments WHERE reference=$1",
      [reference]
    );

    if (!payment.rows.length) {
      await client.del(lockKey);
      return res.sendStatus(200);
    }

    if (payment.rows[0].status === "success") {
      await client.del(lockKey);
      return res.sendStatus(200);
    }

    // ======================
    // USER CHECK
    // ======================
    const user = await db.query(
      "SELECT id, status FROM users WHERE email=$1",
      [email]
    );

    if (!user.rows.length) {
      await client.del(lockKey);
      return res.sendStatus(200);
    }

    if (["frozen", "suspended"].includes(user.rows[0].status)) {
      await client.del(lockKey);
      return res.sendStatus(200);
    }

    const userId = user.rows[0].id;

    await db.query("BEGIN");

    // ======================
    // UPDATE PAYMENT
    // ======================
    await db.query(
      "UPDATE payments SET status='success' WHERE reference=$1",
      [reference]
    );

    // ======================
    // CREDIT WALLET
    // ======================
    await db.query(
      `UPDATE users SET balance = balance + $1 WHERE id=$2`,
      [amount, userId]
    );

    // ======================
    // LOG TRANSACTION
    // ======================
    await db.query(
      `INSERT INTO transactions (user_id, type, amount, reference)
       VALUES ($1,'deposit',$2,$3)`,
      [userId, amount, reference]
    );

    await db.query("COMMIT");

    // cleanup lock (safe even if commit fails)
    await client.del(lockKey);

    // ======================
    // EVENTS (SAFE IMPORT POSITION)
    // ======================
    const { publishDashboardUpdate, publishEvent } = require("../services/events");

    await publishDashboardUpdate({
      source: "deposit_success"
    });

    await publishEvent("wallet_update", {
      userId,
      amount
    });

    return res.sendStatus(200);

  } catch (err) {
    try {
      await db.query("ROLLBACK");
    } catch (_) {}

    console.error("WEBHOOK ERROR:", err.message);

    return res.sendStatus(500);
  }
});

module.exports = router;
