const jwt = require("jsonwebtoken");
const db = require("../db");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "No token" });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userRes = await db.query(
      "SELECT id, email, role, status, permissions FROM users WHERE id=$1",
      [decoded.id]
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userRes.rows[0];

    // 🚨 STATUS CHECK
    if (user.status === "frozen") {
      return res.status(403).json({ error: "Account frozen" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    // 🔐 ADMIN SAFETY
    if (user.role === "admin" && !user.permissions) {
      return res.status(403).json({
        error: "Admin permissions missing"
      });
    }

    req.user = user;

    next();

  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
