const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const morgan = require("morgan");

dotenv.config();

const app = express();

// ======================
// SECURITY BASELINE
// ======================
app.use(helmet());
app.disable("x-powered-by");

// ======================
// BODY PARSER
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// PAYSTACK WEBHOOK RAW BODY (CRITICAL)
// ======================
app.use(
  "/webhook",
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

// ======================
// REQUEST LOGGING
// ======================
app.use(
  morgan("combined", {
    skip: (req) => req.url === "/health"
  })
);

// ======================
// BACKGROUND SYSTEMS
// ======================
require("./services/scheduler"); // cron jobs
require("./services/events"); // event bus init (if needed)

// ======================
// ROUTES - CORE SYSTEM
// ======================

// AUTH SYSTEM
app.use("/auth", require("./routes/auth"));

// WALLET SYSTEM
app.use("/wallet", require("./routes/wallet"));

// PAYMENT ORCHESTRATION (Paystack + webhook handling)
app.use("/payments", require("./routes/payments"));

// TASK MARKETPLACE ENGINE
app.use("/tasks", require("./routes/tasks"));

// VENDOR SYSTEM
app.use("/vendor", require("./routes/vendor"));

// ESCROW ENGINE (LOCK/RELEASE FUNDS)
app.use("/escrow", require("./routes/escrow"));

// ADMIN CONTROL CENTER (core admin routes)
app.use("/admin", require("./routes/admin"));

// ADMIN ANALYTICS DASHBOARD
app.use("/admin-analytics", require("./routes/adminAnalytics"));

// REAL-TIME EVENT STREAM (SSE)
app.use("/realtime", require("./routes/realtime"));

// WEBHOOK HANDLERS (Paystack, external systems)
app.use("/webhook", require("./routes/webhook"));

// ======================
// HEALTH CHECK (OPS CONTROL CENTER)
// ======================
app.get("/health", (req, res) => {
  res.json({
    app: "Trivexa Pay",
    status: "healthy",
    version: "2.0.0",
    services: {
      auth: "active",
      wallet: "active",
      payments: "active",
      escrow: "active",
      tasks: "active",
      vendor: "active",
      admin: "active",
      realtime: "active",
      webhook: "active"
    },
    uptime: process.uptime()
  });
});

// ======================
// ROOT INFO
// ======================
app.get("/", (req, res) => {
  res.json({
    name: "Trivexa Pay API",
    status: "running",
    version: "2.0.0",
    architecture: "event-driven + escrow-based fintech system"
  });
});

// ======================
// 404 HANDLER
// ======================
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

// ======================
// GLOBAL ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Trivexa Pay running on port", PORT);
  console.log("🏦 Escrow Engine ACTIVE");
  console.log("💳 Payment Orchestrator ACTIVE");
  console.log("🧠 Fraud System ACTIVE");
  console.log("📡 Real-time Engine ACTIVE");
});
