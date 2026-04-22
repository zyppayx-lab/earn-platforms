const axios = require("axios");
const db = require("../db");
const { v4: uuidv4 } = require("uuid");
const { logAction } = require("../services/audit");
const { publishEvent, publishDashboardUpdate } = require("../services/events");

// ======================
// INITIALIZE PAYMENT (SAFE)
// ======================
exports.initializePayment = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;
  const email = req.user.email;

  try {
    // ======================
    // VALIDATION
    // ======================
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ======================
    // IDEMPOTENCY CHECK (IMPORTANT FIX)
    // ======================
    const existing = await db.query(
      `SELECT * FROM payments 
       WHERE user_id=$1 AND status='pending' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        message: "Pending payment already exists",
        reference: existing.rows[0].reference
      });
    }

    const reference = "TRX_" + uuidv4();

    // ======================
    // SAVE PAYMENT (PENDING)
    // ======================
    await db.query(
      `INSERT INTO payments (user_id, amount, reference, status)
       VALUES ($1,$2,$3,'pending')`,
      [userId, amount, reference]
    );

    // ======================
    // PAYSTACK REQUEST
    // ======================
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        reference,
        metadata: {
          user_id: userId,
          type: "wallet_funding"
        },
        callback_url: process.env.PAYSTACK_CALLBACK_URL
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          "Content-Type": "application/json"
        }
      }
    );

    // ======================
    // AUDIT + REAL-TIME OPS
    // ======================
    await logAction(userId, "INIT_PAYMENT", {
      amount,
      reference
    });

    await publishEvent("payment_init", {
      userId,
      amount,
      reference
    });

    await publishDashboardUpdate({
      source: "payment_initiated"
    });

    res.json({
      authorization_url: response.data.data.authorization_url,
      reference
    });

  } catch (err) {
    console.error("PAYMENT INIT ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
};
