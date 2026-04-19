const jwt = require("jsonwebtoken");
const db = require("../db");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = header.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ======================
    // GET USER
    // ======================
    const result = await db.query(
      `SELECT id, email, role, status
       FROM users
       WHERE id=$1`,
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // ======================
    // ACCOUNT STATUS CHECK
    // ======================
    if (user.status === "frozen") {
      return res.status(403).json({ error: "Account frozen by admin" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    // ======================
    // ATTACH USER TO REQUEST
    // ======================
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
