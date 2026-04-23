const Redis = require("ioredis");

// ======================
// CONFIG
// ======================
const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
  retryStrategy(times) {
    // exponential backoff (prevents Redis hammering)
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
});

// ======================
// LOG CONNECTION STATUS
// ======================
redis.on("connect", () => {
  console.log("✅ Redis connecting...");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

redis.on("reconnecting", () => {
  console.warn("⚠️ Redis reconnecting...");
});

// ======================
// SAFE WRAPPER (OPTIONAL BUT USEFUL)
// ======================
const safeRedis = {
  get: (key) => redis.get(key),
  set: (key, value, mode, duration) => {
    if (mode && duration) return redis.set(key, value, mode, duration);
    return redis.set(key, value);
  },
  del: (key) => redis.del(key),
  publish: (channel, data) => redis.publish(channel, data)
};

module.exports = safeRedis;
