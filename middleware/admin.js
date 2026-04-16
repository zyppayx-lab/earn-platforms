module.exports = function(requiredRoles = []) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!requiredRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
};
