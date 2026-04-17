const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// ======================
// MIDDLEWARE
// ======================
app.use(express.json());

// Request logger (debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ======================
// ROUTES
// ======================

app.use("/tasks", require("./routes/tasks"));
app.use("/payments", require("./routes/payments"));
app.use("/admin", require("./routes/admin"));
app.use("/wallet", require("./routes/wallet"));
app.use("/auth", require("./routes/auth"));
app.use("/admin-analytics", require("./routes/adminAnalytics"));

// ======================
// HEALTH CHECK
// ======================
app.get("/", (req, res) => {
  res.json({
    app: "Trivexa Pay",
    status: "running",
    version: "1.2.0"
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
  res.status(500).json({
    error: "Internal server error"
  });
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Trivexa Pay running on port ${PORT}`);
});
