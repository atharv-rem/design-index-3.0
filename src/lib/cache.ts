import { Redis } from "@upstash/redis";
import { waitUntil } from "@vercel/functions";

const redisUrl = import.meta.env?.UPSTASH_REDIS_REST_URL ?? (typeof process !== "undefined" ? process.env?.UPSTASH_REDIS_REST_URL : undefined);
const redisToken = import.meta.env?.UPSTASH_REDIS_REST_TOKEN ?? (typeof process !== "undefined" ? process.env?.UPSTASH_REDIS_REST_TOKEN : undefined);

const redisClient = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

export const CACHE_TTL_SECONDS = 60 * 60 * 24;

export const TOOL_KEY_PREFIX = "design-index:tool:";
export const CATEGORY_KEY_PREFIX = "design-index:tools:";

export const toolCacheKey = (id: number) => `${TOOL_KEY_PREFIX}${id}`;
export const categoryCacheKey = (category: string) => `${CATEGORY_KEY_PREFIX}${category}`;

const logCacheError = (action: string, key: string, error: unknown) => {
  console.error(`[cache] ${action} failed for "${key}":`, error);
};

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) {
    return null;
  }

  try {
    const cached = await redisClient.get<T>(key);
    return cached ?? null;
  } catch (error) {
    logCacheError("get", key, error);
    return null;
  }
};

export const setCachedJson = async <T>(key: string, value: T, ttlSeconds = CACHE_TTL_SECONDS): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    // Cache failures should not block API responses.
    logCacheError("set", key, error);
  }
};

// Keeps the function alive until the Redis write finishes, without delaying the response.
export const setCachedJsonInBackground = <T>(key: string, value: T, ttlSeconds = CACHE_TTL_SECONDS): void => {
  const write = setCachedJson(key, value, ttlSeconds);

  try {
    waitUntil(write);
  } catch {
    // No request context (e.g. local dev): the write still runs, just unawaited.
  }
};

// Deletes the given keys, plus every key matching any of the `prefixes`. Returns how many were removed.
export const deleteCached = async (keys: string[], prefixes: string[] = []): Promise<number> => {
  if (!redisClient) {
    return 0;
  }

  const toDelete = new Set(keys);

  try {
    for (const prefix of prefixes) {
      let cursor = "0";

      do {
        const [next, found]: [string, string[]] = await redisClient.scan(cursor, { match: `${prefix}*`, count: 200 });
        cursor = String(next);
        found.forEach((key) => toDelete.add(key));
      } while (cursor !== "0");
    }

    if (!toDelete.size) {
      return 0;
    }

    return await redisClient.del(...toDelete);
  } catch (error) {
    logCacheError("delete", [...toDelete].join(","), error);
    throw error;
  }
};
