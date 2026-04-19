const router = require("express").Router();

const auth = require("../middleware/auth");
const { initializePayment } = require("../controllers/paymentController");

// ======================
// INITIATE PAYMENT (PAYSTACK)
// ======================
router.post("/initialize", auth, async (req, res, next) => {
  try {
    const { amount } = req.body;

    // basic validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    req.body.user_id = req.user.id;

    return initializePayment(req, res);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
