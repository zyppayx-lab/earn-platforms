const router = require("express").Router();
const crypto = require("crypto");
const db = require("../db");
const redis = require("redis");

// ======================
// REDIS CLIENT
// ======================
const client = redis.createClient({
  url: process.env.REDIS_URL
});

client.connect();

// ======================
// PAYSTACK WEBHOOK
// ======================
router.post("/paystack", async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET;

  try {
    // ======================
    // VERIFY SIGNATURE
    // ======================
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.rawBody)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    if (hash !== signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = req.body;

    // ======================
    // ONLY SUCCESSFUL PAYMENTS
    // ======================
    if (event.event !== "charge.success") {
      return res.sendStatus(200);
    }

    const reference = event.data.reference;
    const amount = Number(event.data.amount / 100);
    const email = event.data.customer.email;

    // ======================
    // 🔒 IDEMPOTENCY LOCK (VERY IMPORTANT)
    // ======================
    const lockKey = `paystack:${reference}`;
    const locked = await client.get(lockKey);

    if (locked) {
      return res.sendStatus(200);
    }

    await client.set(lockKey, "processing", { EX: 300 });

    // ======================
    // CHECK PAYMENT
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
    // GET USER
    // ======================
    const user = await db.query(
      "SELECT id, status FROM users WHERE email=$1",
      [email]
    );

    if (!user.rows.length) {
      await client.del(lockKey);
      return res.sendStatus(200);
    }

    const userId = user.rows[0].id;

    // 🚨 block frozen/suspended users
    if (["frozen", "suspended"].includes(user.rows[0].status)) {
      await client.del(lockKey);
      return res.sendStatus(200);
    }

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
      `UPDATE users 
       SET balance = balance + $1 
       WHERE id=$2`,
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

    // cleanup lock
    await client.del(lockKey);

    // ======================
    // OPTIONAL: REAL-TIME HOOKS (IMPORTANT FOR YOUR DASHBOARD)
    // ======================
    const { publishDashboardUpdate, publishEvent } = require("../services/events");

    await publishDashboardUpdate({
      source: "deposit_success"
    });

    await publishEvent("wallet_update", {
      userId,
      amount
    });

    res.sendStatus(200);

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("WEBHOOK ERROR:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
