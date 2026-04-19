module.exports = (permission) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ======================
    // SUPER ADMIN OVERRIDE
    // ======================
    if (user.role === "super_admin") {
      return next();
    }

    // ======================
    // VALIDATION SAFETY
    // ======================
    if (!permission || typeof permission !== "string") {
      return res.status(500).json({
        error: "Invalid permission configuration"
      });
    }

    const perms = user.permissions;

    // ======================
    // PERMISSION CHECK
    // ======================
    const hasPermission =
      Array.isArray(perms)
        ? perms.includes(permission)
        : perms && perms[permission] === true;

    if (!hasPermission) {
      return res.status(403).json({
        error: "Permission denied"
      });
    }

    next();
  };
};
