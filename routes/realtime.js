const router = require("express").Router();
const events = require("../services/events");

// ======================
// REAL-TIME STREAM (SSE)
// ======================
router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const handler = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  events.on("update", handler);

  req.on("close", () => {
    events.off("update", handler);
  });
});

module.exports = router;
