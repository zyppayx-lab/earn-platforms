module.exports = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // allow vendor or super admin only
    if (user.role !== "vendor" && user.role !== "super_admin") {
      return res.status(403).json({ error: "Vendor access only" });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Vendor middleware error" });
  }
};
