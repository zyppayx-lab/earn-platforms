const router = require("express").Router();

const auth = require("../middleware/auth");
const { initializePayment } = require("../controllers/paymentController");

// ======================
// INITIATE PAYMENT (PAYSTACK)
// ======================
router.post("/initialize", auth, async (req, res) => {
  try {
    const { amount } = req.body;

    // ======================
    // VALIDATION
    // ======================
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // ======================
    // CALL CONTROLLER DIRECTLY
    // ======================
    req.body.userId = req.user.id;

    await initializePayment(req, res);

  } catch (err) {
    console.error("PAYMENT ROUTE ERROR:", err.message);
    return res.status(500).json({ error: "Payment route failed" });
  }
});

module.exports = router;
