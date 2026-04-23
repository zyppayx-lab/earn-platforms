const router = require("express").Router();

const auth = require("../middleware/auth");
const vendor = require("../middleware/vendor");
const ctrl = require("../controllers/vendorController");

// CREATE VENDOR PROFILE
router.post("/create", auth, ctrl.createVendor);

// VENDOR DASHBOARD
router.get("/dashboard", auth, vendor, ctrl.dashboard);

// FUND VENDOR WALLET
router.post("/fund", auth, vendor, ctrl.addFunds);

module.exports = router;
