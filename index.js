const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();

// ======================
// 🔐 PAYSTACK WEBHOOK RAW BODY
// ======================
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ======================
// ⏱ START SCHEDULER
// ======================
require("./services/scheduler");

// ======================
// MIDDLEWARE
// ======================
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Trivexa Pay");
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ======================
// ROUTES
// ======================
app.use("/webhook", require("./routes/webhook"));

app.use("/auth", require("./routes/auth"));
app.use("/wallet", require("./routes/wallet"));
app.use("/payments", require("./routes/payments"));
app.use("/tasks", require("./routes/tasks"));
app.use("/admin", require("./routes/admin"));
app.use("/admin-analytics", require("./routes/adminAnalytics"));
app.use("/realtime", require("./routes/realtime")); // 🔴 real-time events

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    app: "Trivexa Pay",
    status: "running",
    version: "1.5.0"
  });
});

// ======================
// 404
// ======================
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ======================
// ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});

// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Trivexa Pay running on ${PORT}`);
});
