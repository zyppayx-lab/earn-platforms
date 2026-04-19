const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");

// ======================
// REGISTER
// ======================
router.post("/register", async (req, res) => {
  const { email, password, referred_by } = req.body;

  try {
    // check duplicate user
    const existing = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password, referred_by, role, status)
       VALUES ($1,$2,$3,'user','active')
       RETURNING id, email, role`,
      [email, hashed, referred_by || null]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================
// LOGIN
// ======================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!user.rows.length) {
      return res.status(400).json({ error: "User not found" });
    }

    const u = user.rows[0];

    // ❌ BLOCK SUSPENDED USERS
    if (u.status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    if (u.status === "frozen") {
      return res.status(403).json({ error: "Account frozen" });
    }

    const valid = await bcrypt.compare(password, u.password);

    if (!valid) {
      return res.status(400).json({ error: "Wrong password" });
    }

    const token = jwt.sign(
      {
        id: u.id,
        email: u.email,
        role: u.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      role: u.role,
      status: u.status
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
