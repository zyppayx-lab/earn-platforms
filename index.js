const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();

// ======================
// 🔐 PAYSTACK WEBHOOK RAW BODY (IMPORTANT)
// ======================
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ======================
// MIDDLEWARE
// ======================

// Basic security header
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Trivexa Pay");
  next();
});

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ======================
// ROUTES
// ======================

app.use("/webhook", require("./routes/webhook"));   // ✅ Paystack webhook

app.use("/auth", require("./routes/auth"));
app.use("/wallet", require("./routes/wallet"));
app.use("/payments", require("./routes/payments"));
app.use("/tasks", require("./routes/tasks"));
app.use("/admin", require("./routes/admin"));
app.use("/admin-analytics", require("./routes/adminAnalytics"));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    app: "Trivexa Pay",
    status: "running",
    version: "1.4.0"
  });
});

// ======================
// 404 HANDLER
// ======================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

// ======================
// GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(err.status || 500).json({
    error: err.message || "Internal server error"
  });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Trivexa Pay running on port ${PORT}`);
});
