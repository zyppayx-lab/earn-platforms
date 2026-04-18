const redis = require("./redis");

async function publishEvent(channel, data) {
  await redis.publish(channel, JSON.stringify(data));
}

module.exports = { publishEvent };
