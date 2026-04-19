const router = require("express").Router();

const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
  createTask,
  submitTask,
  approveTask
} = require("../controllers/taskController");

// ======================
// CREATE TASK (ADMIN ONLY)
// ======================
router.post(
  "/create",
  auth,
  admin("admin", "super_admin"),
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
