const redis = require("./redis");

// ======================
// OPS EVENT CHANNELS
// ======================
const OPS_CHANNELS = {
  DASHBOARD: "ops:dashboard",
  TRANSACTIONS: "ops:transactions",
  FRAUD: "ops:fraud",
  ESCROW: "ops:escrow",
  USERS: "ops:users",
  SYSTEM: "ops:system"
};

// ======================
// SAFE REDIS PUBLISHER
// ======================
async function safePublish(channel, payload) {
  try {
    if (!redis || redis.status !== "ready") {
      console.error("Redis not ready, event dropped:", channel);
      return;
    }

    await redis.publish(
      channel,
      JSON.stringify(payload)
    );

  } catch (err) {
    console.error("EVENT PUBLISH FAILED:", {
      channel,
      error: err.message
    });
  }
}

// ======================
// CORE EVENT EMITTER
// ======================
async function emitEvent(channel, data, priority = "normal") {
  const event = {
    channel,
    priority,
    timestamp: new Date().toISOString(),
    data
  };

  return safePublish(channel, event);
}

// ======================
// DASHBOARD UPDATE
// ======================
async function publishDashboardUpdate(extra = {}) {
  return emitEvent(OPS_CHANNELS.DASHBOARD, {
    message: "Dashboard update",
    ...extra
  });
}

// ======================
// TRANSACTION EVENT
// ======================
async function publishTransactionEvent(transaction) {
  return emitEvent(OPS_CHANNELS.TRANSACTIONS, {
    message: "New transaction",
    transaction
  });
}

// ======================
// FRAUD ALERT (HIGH PRIORITY)
// ======================
async function publishFraudAlert(userId, risk, reason) {
  return emitEvent(
    OPS_CHANNELS.FRAUD,
    {
      message: "Fraud alert triggered",
      userId,
      risk,
      reason,
      action: risk >= 80 ? "AUTO_FREEZE_SUGGESTED" : "MONITOR"
    },
    "critical"
  );
}

// ======================
// ESCROW EVENT
// ======================
async function publishEscrowUpdate(escrow) {
  return emitEvent(OPS_CHANNELS.ESCROW, {
    message: "Escrow update",
    escrowId: escrow.id,
    userId: escrow.user_id,
    amount: escrow.amount,
    status: escrow.status
  });
}

// ======================
// USER EVENT
// ======================
async function publishUserEvent(userId, status) {
  return emitEvent(OPS_CHANNELS.USERS, {
    message: "User status update",
    userId,
    status
  });
}

// ======================
// SYSTEM HEALTH EVENT
// ======================
async function publishSystemEvent(metrics) {
  return emitEvent(OPS_CHANNELS.SYSTEM, {
    message: "System metrics",
    metrics
  });
}

module.exports = {
  OPS_CHANNELS,
  emitEvent,
  publishDashboardUpdate,
  publishTransactionEvent,
  publishFraudAlert,
  publishEscrowUpdate,
  publishUserEvent,
  publishSystemEvent
};
