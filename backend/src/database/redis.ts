import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../config/logger";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: () => null,
  reconnectOnError: () => false
});

let redisReady = false;
let redisDisabledLogged = false;

redis.on("ready", () => {
  redisReady = true;
  redisDisabledLogged = false;
  logger.info("Redis connected");
});

redis.on("end", () => {
  redisReady = false;
  logger.info("Redis connection closed");
});

redis.on("reconnecting", () => {
  logger.debug("Redis reconnecting");
});

redis.on("error", (error: Error) => {
  redisReady = false;
  if (!redisDisabledLogged) {
    logger.warn({ err: error }, "Redis unavailable, cache disabled until connection recovers");
    redisDisabledLogged = true;
  }
});

function isRedisAvailable(): boolean {
  return redisReady && redis.status === "ready";
}

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready" || redis.status === "connecting") {
    return;
  }

  try {
    await redis.connect();
  } catch {
    redisReady = false;
    logger.warn("Redis unavailable at startup, continuing without cache");
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status === "end") {
    return;
  }

  try {
    await redis.quit();
  } catch (error) {
    logger.warn({ err: error }, "Error while disconnecting Redis");
  }
}

export async function safeRedisGet(key: string): Promise<string | null> {
  if (!isRedisAvailable()) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function safeRedisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!isRedisAvailable()) {
    return;
  }

  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // Best-effort cache write; ignore failures.
  }
}
