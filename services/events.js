const redis = require("./redis");

// ======================
// 🔴 GENERIC EVENT
// ======================
async function publishEvent(channel, data) {
  await redis.publish(channel, JSON.stringify(data));
}

// ======================
// 📊 DASHBOARD UPDATE EVENT
// ======================
async function publishDashboardUpdate() {
  await publishEvent("dashboard_update", {
    time: new Date().toISOString()
  });
}

module.exports = {
  publishEvent,
  publishDashboardUpdate
};
