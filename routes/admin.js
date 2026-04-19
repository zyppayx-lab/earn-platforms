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
  admin("admin", "super_admin", "analytics_admin"),
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
// 👥 USERS
// ======================
router.get(
  "/users",
  auth,
  admin("admin", "super_admin"),
  permit("can_manage_users"),
  ctrl.getUsers
);

router.post(
  "/suspend-user",
  auth,
  admin("admin", "super_admin"),
  permit("can_manage_users"),
  ctrl.suspendUser
);

router.post(
  "/freeze-user",
  auth,
  admin("admin", "super_admin"),
  permit("can_manage_users"),
  ctrl.freezeUser
);

// ======================
// 🧑‍💼 VENDORS
// ======================
router.get(
  "/vendors",
  auth,
  admin("admin", "super_admin"),
  permit("can_manage_vendors"),
  ctrl.getVendors
);

// ======================
// 💸 FINANCE
// ======================
router.get(
  "/finance",
  auth,
  admin("finance_admin", "super_admin"),
  permit("can_view_finance"),
  ctrl.getFinance
);

// ======================
// 💳 APPROVE WITHDRAWAL
// ======================
router.post(
  "/approve-withdrawal",
  auth,
  admin("finance_admin", "super_admin"),
  permit("can_approve_withdrawals"),
  ctrl.approveWithdrawal
);

// ======================
// 🚨 FRAUD
// ======================
router.get(
  "/fraud",
  auth,
  admin("fraud_admin", "super_admin"),
  permit("can_manage_fraud"),
  ctrl.getFraud
);

// ======================
// 🏦 ESCROW
// ======================
router.get(
  "/escrow",
  auth,
  admin("finance_admin", "super_admin"),
  permit("can_manage_escrow"),
  ctrl.viewEscrow
);

module.exports = router;
