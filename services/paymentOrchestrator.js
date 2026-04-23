const axios = require("axios");
const db = require("../db");
const crypto = require("crypto");
const { publishEvent } = require("../services/events");
const { detectFraud } = require("../services/fraud");

// ======================
// CONFIG
// ======================
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 2000;

// ======================
// FRAUD PRE-CHECK (AI HOOK POINT)
// ======================
async function preCheckoutRiskCheck(userId, amount) {
  const risk = await detectFraud(userId);

  // future AI model hook (replace later)
  if (risk >= 80) {
    throw new Error("Payment blocked due to fraud risk");
  }

  return risk;
}

// ======================
// INIT PAYMENT (ORCHESTRATED)
// ======================
async function initializePayment(email, amount, userId) {
  await preCheckoutRiskCheck(userId, amount);

  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email,
      amount: amount * 100,
      metadata: {
        userId,
        type: "wallet_funding"
      }
    },
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`
      }
    }
  );

  // admin real-time dashboard update
  await publishEvent("payment_init", {
    userId,
    amount,
    status: "initialized"
  });

  return response.data;
}

// ======================
// RETRY FAILED PAYMENT
// ======================
async function retryPayment(fn, payload, retries = RETRY_LIMIT) {
  try {
    return await fn(...payload);
  } catch (err) {
    if (retries <= 0) throw err;

    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));

    return retryPayment(fn, payload, retries - 1);
  }
}

// ======================
// WEBHOOK RECONCILIATION CORE
// ======================
async function reconcilePayment(event) {
  const reference = event.data.reference;
  const amount = event.data.amount / 100;
  const email = event.data.customer.email;

  const payment = await db.query(
    "SELECT * FROM payments WHERE reference=$1",
    [reference]
  );

  if (!payment.rows.length) return;

  // idempotency guard
  if (payment.rows[0].status === "success") return;

  const user = await db.query(
    "SELECT id FROM users WHERE email=$1",
    [email]
  );

  if (!user.rows.length) return;

  const userId = user.rows[0].id;

  await db.query("BEGIN");

  await db.query(
    "UPDATE payments SET status='success' WHERE reference=$1",
    [reference]
  );

  await db.query(
    "UPDATE users SET balance = balance + $1 WHERE id=$2",
    [amount, userId]
  );

  await db.query(
    `INSERT INTO transactions (user_id, type, amount, reference)
     VALUES ($1,'deposit',$2,$3)`,
    [userId, amount, reference]
  );

  await db.query("COMMIT");

  // REAL-TIME ADMIN DASHBOARD EVENT
  await publishEvent("admin_payment_update", {
    userId,
    amount,
    reference,
    status: "success"
  });
}

// ======================
// CHARGEBACK HANDLER
// ======================
async function handleChargeback(reference) {
  const payment = await db.query(
    "SELECT * FROM payments WHERE reference=$1",
    [reference]
  );

  if (!payment.rows.length) return;

  const userId = payment.rows[0].user_id;
  const amount = payment.rows[0].amount;

  await db.query("BEGIN");

  await db.query(
    "UPDATE users SET balance = balance - $1 WHERE id=$2",
    [amount, userId]
  );

  await db.query(
    "UPDATE payments SET status='chargeback' WHERE reference=$1",
    [reference]
  );

  await db.query(
    `INSERT INTO fraud_flags (user_id, severity, reason)
     VALUES ($1,'high','Chargeback detected')`,
    [userId]
  );

  await db.query("COMMIT");

  await publishEvent("chargeback_alert", {
    userId,
    amount,
    reference
  });
}

module.exports = {
  initializePayment,
  retryPayment,
  reconcilePayment,
  handleChargeback
};
