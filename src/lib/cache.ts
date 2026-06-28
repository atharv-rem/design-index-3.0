import { Redis } from "@upstash/redis";

const redisUrl = import.meta.env.UPSTASH_REDIS_REST_URL;
const redisToken = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

const redisClient = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

export const CACHE_TTL_SECONDS = 60 * 60 * 24;

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) {
    return null;
  }

  try {
    const cached = await redisClient.get<T>(key);
    return cached ?? null;
  } catch {
    return null;
  }
};

export const setCachedJson = async <T>(key: string, value: T, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.set(key, value, { ex: ttlSeconds });
  } catch {
    // Cache failures should not block API responses.
  }
};
