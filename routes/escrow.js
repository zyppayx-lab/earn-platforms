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
  admin(["finance_admin", "super_admin"]),
  async (req, res, next) => {
    try {
      await ctrl.getEscrow(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// ======================
// REFUND ESCROW (ADMIN)
// ======================
router.post(
  "/refund",
  auth,
  admin(["finance_admin", "super_admin"]),
  async (req, res, next) => {
    try {
      await ctrl.refundEscrow(req, res);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
