const router = require("express").Router();

const auth = require("../middleware/auth");
const vendor = require("../middleware/vendor");
const ctrl = require("../controllers/vendorController");

// ======================
// CREATE VENDOR PROFILE
// ======================
router.post(
  "/create",
  auth,
  async (req, res, next) => {
    try {
      await ctrl.createVendor(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// ======================
// VENDOR DASHBOARD
// ======================
router.get(
  "/dashboard",
  auth,
  vendor,
  async (req, res, next) => {
    try {
      await ctrl.dashboard(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// ======================
// FUND VENDOR WALLET
// ======================
router.post(
  "/fund",
  auth,
  vendor,
  async (req, res, next) => {
    try {
      await ctrl.addFunds(req, res);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
