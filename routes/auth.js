const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { generateCode } = require("../services/referral");

// ======================
// REGISTER
// ======================
router.post("/register", async (req, res) => {
  const { email, password, referred_by } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const referralCode = generateCode();

    const user = await db.query(
      `INSERT INTO users (email, password, referral_code, referred_by)
       VALUES ($1,$2,$3,$4)
       RETURNING id, email, referral_code`,
      [email, hashedPassword, referralCode, referred_by || null]
    );

    res.json(user.rows[0]);

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

    const valid = await bcrypt.compare(password, user.rows[0].password);

    if (!valid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        email: user.rows[0].email,
        role: user.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
