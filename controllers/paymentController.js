const axios = require("axios");
const db = require("../db");
const { v4: uuidv4 } = require("uuid");

// ======================
// INITIALIZE PAYMENT
// ======================
exports.initializePayment = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;
  const email = req.user.email;

  try {
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
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
    // CALL PAYSTACK
    // ======================
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // convert to kobo

        reference,

        metadata: {
          user_id: userId,
          type: "wallet_funding"
        },

        callback_url: "https://your-frontend.com/payment-success"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      authorization_url: response.data.data.authorization_url,
      reference
    });

  } catch (err) {
    console.error("PAYMENT INIT ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
};
