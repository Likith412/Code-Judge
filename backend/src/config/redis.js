const { once } = require("node:events");
const { Redis } = require("ioredis");

const { REDIS_URL } = require("./env");
const logger = require("./logger");

// One client for the queue. Fails fast when Redis is down, so nothing hangs.
const redis = new Redis(REDIS_URL, {
   enableOfflineQueue: false,
   maxRetriesPerRequest: 1,
});

// Without a listener, an error would crash the process.
redis.on("error", (err) => logger.warn({ err: err.message }, "redis error"));

// The client connects by itself. This waits until it is ready.
async function connectRedis() {
   if (redis.status !== "ready") await once(redis, "ready");
}

async function disconnectRedis() {
   await redis.quit();
}

const redisState = () => redis.status;

module.exports = { redis, connectRedis, disconnectRedis, redisState };
