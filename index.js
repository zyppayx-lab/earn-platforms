const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();

// ======================
// JSON PARSER
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// PAYSTACK WEBHOOK RAW BODY
// ======================
app.use("/webhook", bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// ======================
// BACKGROUND JOBS
// ======================
require("./services/scheduler");

// ======================
// SECURITY HEADERS
// ======================
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Trivexa Pay");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

// ======================
// REQUEST LOGGER
// ======================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ======================
// ROUTES (FULL SYSTEM)
// ======================

// AUTH
app.use("/auth", require("./routes/auth"));

// WALLET
app.use("/wallet", require("./routes/wallet"));

// PAYMENTS
app.use("/payments", require("./routes/payments"));

// TASK SYSTEM
app.use("/tasks", require("./routes/tasks"));

// VENDOR SYSTEM
app.use("/vendor", require("./routes/vendor"));

// ESCROW SYSTEM (NEW)
app.use("/escrow", require("./routes/escrow"));

// ADMIN
app.use("/admin", require("./routes/admin"));

// ANALYTICS
app.use("/admin-analytics", require("./routes/adminAnalytics"));

// REALTIME
app.use("/realtime", require("./routes/realtime"));

// WEBHOOK
app.use("/webhook", require("./routes/webhook"));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    app: "Trivexa Pay",
    status: "running",
    version: "1.7.0",
    modules: ["users", "vendors", "escrow", "admin"]
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
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: err.message });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Trivexa Pay running on port ${PORT}`);
  console.log(`💰 Escrow System ACTIVE`);
  console.log(`🧑‍💼 Vendor System ACTIVE`);
});
