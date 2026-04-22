module.exports = function (allowedRoles = []) {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const role = user.role;

      // ======================
      // 🚨 GLOBAL KILL SWITCH CHECK (SAFE OPS CONTROL)
      // ======================
      if (process.env.SYSTEM_LOCK === "true") {
        return res.status(503).json({
          error: "System temporarily disabled by admin"
        });
      }

      // ======================
      // ❄️ FROZEN / SUSPENDED USERS BLOCK
      // ======================
      if (user.status === "frozen" || user.status === "suspended") {
        return res.status(403).json({
          error: "Account restricted"
        });
      }

      // ======================
      // 👑 SUPER ADMIN OVERRIDE
      // ======================
      if (role === "super_admin") {
        return next();
      }

      // ======================
      // 🔐 ROLE VALIDATION SAFETY
      // ======================
      if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return res.status(403).json({
          error: "No access roles defined"
        });
      }

      // ======================
      // 🎯 ROLE CHECK
      // ======================
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          error: "Access denied for this role"
        });
      }

      next();

    } catch (err) {
      console.error("Admin middleware error:", err);
      return res.status(500).json({ error: "Internal auth error" });
    }
  };
};
