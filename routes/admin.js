const router = require("express").Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const permit = require("../middleware/permission");
const killSwitchGuard = require("../middleware/killSwitchGuard"); // optional global safety

const ctrl = require("../controllers/adminController");

// ======================
// GLOBAL MIDDLEWARE STACK
// ======================
const secure = (roles, permission) => [
  auth,
  killSwitchGuard,
  admin(roles),
  permit(permission)
];

// ======================
// 📊 DASHBOARD
// ======================
router.get(
  "/dashboard",
  ...secure(["admin", "super_admin", "analytics_admin"], "can_view_dashboard"),
  ctrl.getDashboard
);

// ======================
// 👑 CREATE ADMIN
// ======================
router.post(
  "/create-admin",
  auth,
  killSwitchGuard,
  admin(["super_admin"]),
  ctrl.createAdmin
);

// ======================
// 👥 USERS
// ======================
router.get(
  "/users",
  ...secure(["admin", "super_admin"], "can_manage_users"),
  ctrl.getUsers
);

router.post(
  "/suspend-user",
  ...secure(["admin", "super_admin"], "can_manage_users"),
  ctrl.suspendUser
);

router.post(
  "/freeze-user",
  ...secure(["admin", "super_admin"], "can_manage_users"),
  ctrl.freezeUser
);

// ======================
// 🧑‍💼 VENDORS
// ======================
router.get(
  "/vendors",
  ...secure(["admin", "super_admin"], "can_manage_vendors"),
  ctrl.getVendors
);

// ======================
// 💸 FINANCE
// ======================
router.get(
  "/finance",
  ...secure(["finance_admin", "super_admin"], "can_view_finance"),
  ctrl.getFinance
);

// ======================
// 💳 APPROVE WITHDRAWAL
// ======================
router.post(
  "/approve-withdrawal",
  ...secure(["finance_admin", "super_admin"], "can_approve_withdrawals"),
  ctrl.approveWithdrawal
);

// ======================
// 🚨 FRAUD
// ======================
router.get(
  "/fraud",
  ...secure(["fraud_admin", "super_admin"], "can_manage_fraud"),
  ctrl.getFraud
);

// ======================
// 🏦 ESCROW
// ======================
router.get(
  "/escrow",
  ...secure(["finance_admin", "super_admin"], "can_manage_escrow"),
  ctrl.viewEscrow
);

module.exports = router;
