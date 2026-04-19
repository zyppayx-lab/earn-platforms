const router = require("express").Router();

const auth = require("../middleware/auth");
const { getBalance } = require("../controllers/walletController");

// ======================
// GET USER BALANCE
// ======================
router.get(
  "/balance",
  auth,
  getBalance
);

module.exports = router;
