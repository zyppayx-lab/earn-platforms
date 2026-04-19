const router = require("express").Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const vendor = require("../middleware/vendor");

const {
  createTask,
  submitTask,
  approveTask
} = require("../controllers/taskController");

// ======================
// CREATE TASK (VENDOR)
// ======================
router.post(
  "/create",
  auth,
  vendor,
  createTask
);

// ======================
// SUBMIT TASK (USER)
// ======================
router.post(
  "/submit",
  auth,
  submitTask
);

// ======================
// APPROVE TASK (ADMIN)
// ======================
router.post(
  "/approve",
  auth,
  admin("admin", "super_admin"),
  approveTask
);

module.exports = router;
