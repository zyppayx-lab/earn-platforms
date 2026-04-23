const db = require("../db");
const redis = require("./redis");
const crypto = require("crypto");
const { emitEvent, OPS_CHANNELS } = require("./events");

// ======================
// CHANNEL TYPES
// ======================
const CHANNELS = {
  IN_APP: "in_app",
  EMAIL: "email",
  SMS: "sms"
};

// ======================
// PRIORITY LEVELS
// ======================
const PRIORITY = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  CRITICAL: 4
};

// ======================
// ID GENERATOR (IDEMPOTENCY)
// ======================
function hashId(userId, title, body, type) {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${title}:${body}:${type}`)
    .digest("hex");
}

// ======================
// RATE LIMIT CHECK (ANTI-SPAM)
// ======================
async function checkRateLimit(userId) {
  const key = `notif_rate:${userId}`;
  const count = await redis.get(key);

  if (count && Number(count) > 20) {
    return false;
  }

  await redis.set(key, (Number(count || 0) + 1), "EX", 60);
  return true;
}

// ======================
// SAVE NOTIFICATION (DB)
// ======================
async function saveNotification(data) {
  return db.query(
    `INSERT INTO notifications 
     (user_id, title, body, type, channel, priority, idempotency_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (idempotency_id) DO NOTHING`,
    [
      data.userId,
      data.title,
      data.body,
      data.type,
      data.channel,
      data.priority,
      data.idempotencyId
    ]
  );
}

// ======================
// DELIVERY TRACKING
// ======================
async function markDelivered(notificationId) {
  await db.query(
    `UPDATE notifications 
     SET delivered=true, delivered_at=NOW()
     WHERE id=$1`,
    [notificationId]
  );
}

// ======================
// REAL-TIME PUSH (FAST LANE)
// ======================
async function pushRealtime(data) {
  return redis.publish(
    "user_notification",
    JSON.stringify(data)
  );
}

// ======================
// OPS STREAM
// ======================
async function pushOps(data) {
  return emitEvent(OPS_CHANNELS.USERS, {
    type: "NOTIFICATION",
    ...data
  });
}

// ======================
// CHANNEL ROUTER (v3 CORE)
// ======================
function resolveChannel(priority) {
  if (priority >= PRIORITY.HIGH) return [CHANNELS.IN_APP, CHANNELS.EMAIL];
  if (priority === PRIORITY.NORMAL) return [CHANNELS.IN_APP];
  return [CHANNELS.IN_APP];
}

// ======================
// MAIN ENGINE
// ======================
async function sendNotification({
  userId,
  title,
  body,
  type = "info",
  priority = PRIORITY.NORMAL
}) {
  try {
    // ======================
    // RATE LIMIT GUARD
    // ======================
    const allowed = await checkRateLimit(userId);
    if (!allowed) return;

    const idempotencyId = hashId(userId, title, body, type);

    const channels = resolveChannel(priority);

    for (const channel of channels) {
      const payload = {
        userId,
        title,
        body,
        type,
        channel,
        priority,
        idempotencyId
      };

      // ======================
      // SAVE
      // ======================
      await saveNotification(payload);

      // ======================
      // REAL-TIME DELIVERY
      // ======================
      await pushRealtime(payload);

      // ======================
      // OPS MONITORING
      // ======================
      await pushOps(payload);
    }

  } catch (err) {
    console.error("NOTIFICATION ENGINE ERROR:", err.message);
  }
}

module.exports = {
  sendNotification,
  CHANNELS,
  PRIORITY
};
