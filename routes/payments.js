const router = require("express").Router();

const auth = require("../middleware/auth");
const { initializePayment } = require("../controllers/paymentController");

// ======================
// INITIATE PAYMENT (PAYSTACK)
// ======================
router.post(
  "/initialize",
  auth,
  initializePayment
);

module.exports = router;
