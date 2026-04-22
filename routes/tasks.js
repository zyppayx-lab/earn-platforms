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
// CREATE TASK (VENDOR ONLY)
// ======================
router.post(
  "/create",
  auth,
  vendor,
  async (req, res, next) => {
    try {
      await createTask(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// ======================
// SUBMIT TASK (USER)
// ======================
router.post(
  "/submit",
  auth,
  async (req, res, next) => {
    try {
      await submitTask(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// ======================
// APPROVE TASK (ADMIN ONLY)
// ======================
router.post(
  "/approve",
  auth,
  admin(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      await approveTask(req, res);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
