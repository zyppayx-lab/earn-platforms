const db = require("../db");
const redis = require("./redis");

// ======================
// SAVE NOTIFICATION (DB)
// ======================
async function saveNotification(userId, title, body, type = "info") {
  await db.query(
    `INSERT INTO notifications (user_id, title, body, type)
     VALUES ($1,$2,$3,$4)`,
    [userId, title, body, type]
  );
}

// ======================
// REAL-TIME PUSH (REDIS + SSE)
// ======================
async function pushRealtime(userId, payload) {
  await redis.publish(
    "user_notification",
    JSON.stringify({
      userId,
      ...payload,
      timestamp: new Date().toISOString()
    })
  );
}

// ======================
// MAIN NOTIFICATION FUNCTION
// ======================
async function sendNotification(userId, title, body, type = "info") {
  try {
    // 1. Save to database (persistent)
    await saveNotification(userId, title, body, type);

    // 2. Push real-time event
    await pushRealtime(userId, { title, body, type });

  } catch (err) {
    console.error("Notification error:", err.message);
  }
}

module.exports = {
  sendNotification
};
