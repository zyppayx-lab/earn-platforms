const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();

// ======================
// 🔐 PAYSTACK WEBHOOK RAW BODY (MUST BE FIRST)
// ======================
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ======================
// ⏱ START BACKGROUND JOBS
// ======================
require("./services/scheduler");

// ======================
// 🛡️ BASIC SECURITY HEADERS
// ======================
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Trivexa Pay");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ======================
// 🧾 REQUEST LOGGER
// ======================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ======================
// 📡 ROUTES
// ======================

// 🔴 WEBHOOK (Paystack)
app.use("/webhook", require("./routes/webhook"));

// 🔐 AUTH
app.use("/auth", require("./routes/auth"));

// 💰 WALLET
app.use("/wallet", require("./routes/wallet"));

// 💳 PAYMENTS
app.use("/payments", require("./routes/payments"));

// 🧩 TASK SYSTEM
app.use("/tasks", require("./routes/tasks"));

// 👑 ADMIN CONTROL
app.use("/admin", require("./routes/admin"));

// 📊 ANALYTICS
app.use("/admin-analytics", require("./routes/adminAnalytics"));

// ⚡ REAL-TIME EVENTS
app.use("/realtime", require("./routes/realtime"));

// ======================
// ❤️ HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    app: "Trivexa Pay",
    status: "running",
    version: "1.6.0"
  });
});

// ======================
// ❌ 404 HANDLER
// ======================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

// ======================
// 🚨 GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});

// ======================
// 🚀 START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Trivexa Pay running on port ${PORT}`);
});
