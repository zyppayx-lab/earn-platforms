module.exports = (permission) => {
  return (req, res, next) => {
    try {
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

      // ======================
      // SAFE PERMISSION NORMALIZATION
      // ======================
      let perms = user.permissions;

      if (!perms) perms = [];

      // normalize object → array if needed
      const normalizedPermissions = Array.isArray(perms)
        ? perms
        : typeof perms === "object"
          ? Object.keys(perms).filter((k) => perms[k] === true)
          : [];

      // ======================
      // PERMISSION CHECK
      // ======================
      const hasPermission = normalizedPermissions.includes(permission);

      if (!hasPermission) {
        return res.status(403).json({
          error: "Permission denied"
        });
      }

      // ======================
      // ATTACH NORMALIZED PERMISSIONS (SAFE FOR LOGGING/AUDIT)
      // ======================
      req.user.permissions = normalizedPermissions;

      next();

    } catch (err) {
      console.error("Permission middleware error:", err);
      return res.status(500).json({
        error: "Permission system error"
      });
    }
  };
};
