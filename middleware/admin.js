module.exports = function (allowedRoles = []) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = user.role;

    // ======================
    // SUPER ADMIN OVERRIDE
    // ======================
    if (role === "super_admin") {
      return next();
    }

    // ======================
    // SAFE DEFAULT HANDLING
    // ======================
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return res.status(403).json({ error: "No access roles defined" });
    }

    // ======================
    // ROLE CHECK
    // ======================
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "Access denied for this role"
      });
    }

    next();
  };
};
