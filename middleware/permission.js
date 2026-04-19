module.exports = (permission) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 👑 SUPER ADMIN FULL ACCESS
    if (req.user.role === "super_admin") {
      return next();
    }

    const perms = req.user.permissions || {};

    if (!perms[permission]) {
      return res.status(403).json({
        error: "Permission denied"
      });
    }

    next();
  };
};
