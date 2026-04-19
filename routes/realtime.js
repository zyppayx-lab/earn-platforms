const router = require("express").Router();
const events = require("../services/events");

const auth = require("../middleware/auth");

// ======================
// REAL-TIME STREAM (SECURE)
// ======================
router.get("/events", auth, (req, res) => {
  const userId = req.user.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  // ======================
  // HEARTBEAT (KEEP CONNECTION ALIVE)
  // ======================
  const interval = setInterval(() => {
    res.write(`event: ping\ndata: {}\n\n`);
  }, 25000);

  // ======================
  // EVENT HANDLER (FILTERED)
  // ======================
  const handler = (data) => {
    // send only relevant events
    if (!data.userId || data.userId === userId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  events.on("update", handler);

  // ======================
  // CLEANUP
  // ======================
  req.on("close", () => {
    clearInterval(interval);
    events.off("update", handler);
  });
});

module.exports = router;
