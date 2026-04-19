const router = require("express").Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const ctrl = require("../controllers/escrowController");

// ======================
// VIEW ESCROW (ADMIN)
// ======================
router.get(
  "/",
  auth,
  admin("finance_admin", "super_admin"),
  ctrl.getEscrow
);

// ======================
// REFUND ESCROW (ADMIN)
// ======================
router.post(
  "/refund",
  auth,
  admin("finance_admin", "super_admin"),
  ctrl.refundEscrow
);

module.exports = router;
