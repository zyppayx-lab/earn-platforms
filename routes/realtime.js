const router = require("express").Router();
const events = require("../services/events");
const auth = require("../middleware/auth");

// ======================
// REAL-TIME STREAM (SECURE SSE)
// ======================
router.get("/events", auth, (req, res) => {
  const userId = req.user.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders?.();

  let isClosed = false;

  // ======================
  // HEARTBEAT
  // ======================
  const interval = setInterval(() => {
    if (isClosed) return;

    res.write(`event: ping\ndata: {}\n\n`);
  }, 25000);

  // ======================
  // EVENT HANDLER
  // ======================
  const handler = (data) => {
    try {
      if (isClosed) return;

      // user filtering
      if (!data.userId || data.userId === userId) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    } catch (err) {
      console.error("SSE WRITE ERROR:", err.message);
    }
  };

  events.on("update", handler);

  // ======================
  // CLEANUP
  // ======================
  req.on("close", () => {
    isClosed = true;

    clearInterval(interval);
    events.off("update", handler);

    try {
      res.end();
    } catch (err) {
      console.error("SSE CLOSE ERROR:", err.message);
    }
  });
});

module.exports = router;
