const paystack = require("../services/paystack");

// ======================
// INIT PAYMENT
// ======================
exports.initializePayment = async (req, res) => {
  const { email, amount } = req.body;

  try {
    const response = await paystack.initializePayment(email, amount);

    res.json(response);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
