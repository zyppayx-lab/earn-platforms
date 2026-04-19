const router = require("express").Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const permit = require("../middleware/permission");

const ctrl = require("../controllers/adminController");

// ======================
// 📊 DASHBOARD
// ======================
router.get(
  "/dashboard",
  auth,
  admin(),
  permit("can_view_dashboard"),
  ctrl.getDashboard
);

// ======================
// 👑 CREATE ADMIN
// ======================
router.post(
  "/create-admin",
  auth,
  admin("super_admin"),
  ctrl.createAdmin
);

// ======================
// 💸 FINANCE
// ======================
router.get(
  "/finance",
  auth,
  admin(),
  permit("can_view_finance"),
  ctrl.getFinance
);

// ======================
// 💳 APPROVE WITHDRAWAL
// ======================
router.post(
  "/approve-withdrawal",
  auth,
  admin(),
  permit("can_approve_withdrawals"),
  ctrl.approveWithdrawal
);

// ======================
// 🚨 FRAUD
// ======================
router.get(
  "/fraud",
  auth,
  admin(),
  permit("can_manage_fraud"),
  ctrl.getFraud
);

// ======================
// 🏦 ESCROW
// ======================
router.get(
  "/escrow",
  auth,
  admin(),
  permit("can_manage_escrow"),
  ctrl.viewEscrow
);

module.exports = router;
