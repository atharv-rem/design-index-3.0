import { Redis } from "@upstash/redis";
import { waitUntil } from "@vercel/functions";
import { logWarn, recordCache, timed, warnOnce } from "@/lib/logger";

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

/** A cache key in words, for logs: "design-index:tool:5" becomes "tool 5". */
export const describeCacheKey = (key: string): string => {
  if (key.startsWith(TOOL_KEY_PREFIX)) return `tool ${key.slice(TOOL_KEY_PREFIX.length)}`;
  // Same key as RECENT_TOOLS_CACHE_KEY in recent-tools.ts (which imports this file).
  if (key === "design-index:tools:recent") return "the recently added tools";
  if (key.startsWith(CATEGORY_KEY_PREFIX)) return `the ${key.slice(CATEGORY_KEY_PREFIX.length)} category list`;
  if (key.startsWith("design-index:sponsors:")) return "the sponsor list";
  if (key === "design-index:databuddy:stats") return "the visitor stats";
  return key;
};

const CACHE_FAILURE_TEXT = {
  read: (what: string) => `Could not read ${what} from the cache, so it was loaded from the database instead.`,
  save: (what: string) => `Could not save ${what} to the cache. This visit worked, but the next one will be slower.`,
  clear: (what: string) => `Could not clear ${what} from the cache.`,
} as const;

// Reads and saves are always worked around (the caller falls back to the database), so they only warn.
const logCacheError = (action: keyof typeof CACHE_FAILURE_TEXT, what: string, error: unknown) => {
  logWarn("cache", CACHE_FAILURE_TEXT[action](what), {
    problem: error instanceof Error ? error.message : String(error),
  });
};

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) {
    // Everything now comes from the database, which is a real fallback rather than a normal miss.
    warnOnce("cache-not-configured", "cache", "The cache is not configured, so everything came straight from the database.");
    return null;
  }

  const label = describeCacheKey(key);

  try {
    const cached = await timed("cache", label, () => redisClient.get<T>(key));

    recordCache(label, Boolean(cached));

    return cached ?? null;
  } catch (error) {
    logCacheError("read", label, error);
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
    logCacheError("save", describeCacheKey(key), error);
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
    return await timed("cache", "cache entries to clear", async () => {
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
    });
  } catch (error) {
    logCacheError("clear", `${toDelete.size} cached entries`, error);
    throw error;
  }
};

// Adds 1 to a counter that expires `ttlSeconds` after it was first set. Returns the new count,
// or null when Redis is missing or failed (callers should then let the request through).
export const incrementCounter = async (key: string, ttlSeconds: number): Promise<number | null> => {
  if (!redisClient) {
    return null;
  }

  try {
    return await timed("cache", "the form rate limit", async () => {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, ttlSeconds);
      }
      return count;
    });
  } catch (error) {
    logWarn("cache", "Could not check the form rate limit, so the submission was let through.", {
      problem: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};
