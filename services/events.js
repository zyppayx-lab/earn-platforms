const redis = require("./redis");

// ======================
// EVENT TYPES (STANDARDIZED)
// ======================
const EVENT_TYPES = {
  DASHBOARD_UPDATE: "dashboard_update",
  NEW_TASK: "new_task",
  TASK_APPROVED: "task_approved",
  TASK_REJECTED: "task_rejected",
  WITHDRAWAL_STATUS: "withdrawal_status",
  FRAUD_ALERT: "fraud_alert",
  ESCROW_UPDATE: "escrow_update"
};

// ======================
// 🔴 GENERIC EVENT PUBLISHER
// ======================
async function publishEvent(channel, data) {
  try {
    const payload = {
      event: channel,
      data,
      timestamp: new Date().toISOString()
    };

    await redis.publish(channel, JSON.stringify(payload));

  } catch (err) {
    console.error("Event publish failed:", err.message);
  }
}

// ======================
// 📊 DASHBOARD UPDATE EVENT
// ======================
async function publishDashboardUpdate(extra = {}) {
  return publishEvent(EVENT_TYPES.DASHBOARD_UPDATE, {
    message: "Dashboard updated",
    ...extra
  });
}

// ======================
// 🧩 NEW TASK EVENT
// ======================
async function publishNewTask(task) {
  return publishEvent(EVENT_TYPES.NEW_TASK, {
    message: "New task available",
    task
  });
}

// ======================
// 💳 TASK APPROVED EVENT
// ======================
async function publishTaskApproved(userId, amount) {
  return publishEvent(EVENT_TYPES.TASK_APPROVED, {
    message: "Task approved",
    userId,
    amount
  });
}

// ======================
// 🚨 FRAUD ALERT EVENT
// ======================
async function publishFraudAlert(userId, risk) {
  return publishEvent(EVENT_TYPES.FRAUD_ALERT, {
    message: "Fraud detected",
    userId,
    risk
  });
}

// ======================
// 🏦 ESCROW UPDATE EVENT
// ======================
async function publishEscrowUpdate(taskId, status) {
  return publishEvent(EVENT_TYPES.ESCROW_UPDATE, {
    taskId,
    status
  });
}

module.exports = {
  publishEvent,
  publishDashboardUpdate,
  publishNewTask,
  publishTaskApproved,
  publishFraudAlert,
  publishEscrowUpdate,
  EVENT_TYPES
};
