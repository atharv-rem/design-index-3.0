import { AsyncLocalStorage } from "node:async_hooks";
import { log as standaloneLog, type RequestLogger } from "evlog";

// Lets library code (cache, data fetchers) add to the current request's event
// without threading `Astro.locals.log` through every call.
//
// Messages are written for people, not for log parsers: plain sentences that say what
// happened and what the site did about it. The middleware stitches the notes of a request
// into the `summary` (dev only) and builds the `cache` and `timing` fields from what is
// recorded here.

const DEV = Boolean(import.meta.env?.DEV);

/** A request slower than this is a warning. Higher in dev so Vite's first compile doesn't trip it. */
export const SLOW_REQUEST_MS = DEV ? 1500 : 500;

/** A single Redis or Supabase call slower than this is a warning (a "real" fallback signal). */
export const SLOW_QUERY_MS = DEV ? 1000 : 300;

type Level = "warn" | "error";

/** What a page asked Astro's route cache for (`Astro.cache.set(...)`), merged across calls. */
type AstroPolicy = { maxAge?: number; swr?: number; tags: Set<string>; disabled?: boolean };

type Scope = {
  log: RequestLogger;
  sealed: boolean;
  notes: string[];
  level?: Level;
  /** Redis lookups. */
  cache: { hit: number; miss: number; missed: string[] };
  astro?: AstroPolicy;
  /** Summed duration of every call, by kind. Parallel calls add up, so this can exceed wall time. */
  timing: { cache: number; db: number };
  /** [start, end] of every call, to work out how much wall time was spent waiting on them. */
  busy: Array<[number, number]>;
  once: Set<string>;
};

const storage = new AsyncLocalStorage<Scope>();

/** Runs `fn` with `log` as the current request logger. Used by src/middleware.ts. */
export const runWithLogger = async <T>(log: RequestLogger, fn: () => Promise<T>): Promise<T> => {
  const scope: Scope = {
    log,
    sealed: false,
    notes: [],
    cache: { hit: 0, miss: 0, missed: [] },
    timing: { cache: 0, db: 0 },
    busy: [],
    once: new Set(),
  };

  try {
    return await storage.run(scope, fn);
  } finally {
    // Background work (waitUntil cache writes) can outlive the emitted event.
    scope.sealed = true;
  }
};

/** The current request's logger, or undefined outside a request or after its event was emitted. */
export const getLogger = (): RequestLogger | undefined => {
  const scope = storage.getStore();

  return scope && !scope.sealed ? scope.log : undefined;
};

/** The level the request has been raised to so far, if any. */
export const getLevel = (): Level | undefined => storage.getStore()?.level;

/**
 * Raises the event to `warn` or `error`. It only ever goes up, so a later warning
 * can't hide an earlier error.
 */
export const raiseLevel = (level: Level) => {
  const scope = storage.getStore();

  if (!scope || scope.sealed || scope.level === "error" || scope.level === level) {
    return;
  }

  scope.level = level;
  scope.log.setLevel(level);
};

/** Adds one plain-English sentence to the current request's summary. */
export const note = (message: string) => {
  const scope = storage.getStore();

  if (scope && !scope.sealed) {
    scope.notes.push(message);
  }
};

/** The sentences added so far with `note`, oldest first. */
export const getNotes = (): string[] => storage.getStore()?.notes ?? [];

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Adds `context` to the request event without changing its level. */
export const logSet = (context: Record<string, unknown>) => {
  getLogger()?.set(context);
};

/**
 * Records a problem the site worked around, so the request still succeeded.
 * `message` is a plain sentence; `context` is filed under `tag` on the event.
 * Raises the event to `warn`; outside a request it is logged on its own.
 */
export const logWarn = (tag: string, message: string, context: Record<string, unknown> = {}) => {
  const logger = getLogger();

  if (logger) {
    note(message);

    if (Object.keys(context).length) {
      logger.set({ [tag]: context });
    }

    raiseLevel("warn");
    return;
  }

  standaloneLog.warn({ message, [tag]: context });
};

/** `logWarn`, but only the first time `key` is seen in a request (e.g. one warning per missing config). */
export const warnOnce = (key: string, tag: string, message: string, context: Record<string, unknown> = {}) => {
  const scope = storage.getStore();

  if (scope?.once.has(key)) {
    return;
  }

  scope?.once.add(key);
  logWarn(tag, message, context);
};

/**
 * Records a failure. `message` is a plain sentence saying what could not be done;
 * the technical error is kept alongside it for debugging.
 */
export const logError = (message: string, error: unknown, context: Record<string, unknown> = {}) => {
  const logger = getLogger();

  if (logger) {
    note(message);
    logger.error(error instanceof Error ? error : new Error(errorMessage(error)), context);
    raiseLevel("error");
    return;
  }

  standaloneLog.error({ message, error: errorMessage(error), ...context });
};

/**
 * Records a call to `Astro.cache.set(...)`. In development Astro's cache is a no-op, so this is the
 * only trace of what the page asked for. (In production Vercel turns it into CDN headers.)
 */
export const recordAstroCache = (options: unknown) => {
  const scope = storage.getStore();

  if (!scope || scope.sealed) {
    return;
  }

  const policy = (scope.astro ??= { tags: new Set<string>() });

  if (options === false) {
    policy.disabled = true;
    return;
  }

  if (options === null || typeof options !== "object") {
    return;
  }

  const { maxAge, swr, tags } = options as { maxAge?: unknown; swr?: unknown; tags?: unknown };

  if (typeof maxAge === "number") policy.maxAge = maxAge;
  if (typeof swr === "number") policy.swr = swr;
  if (Array.isArray(tags)) tags.forEach((tag) => policy.tags.add(String(tag)));
};

/** Counts one Redis lookup. Only misses are named, so the event stays short. */
export const recordCache = (label: string, hit: boolean) => {
  const scope = storage.getStore();

  if (!scope || scope.sealed) {
    return;
  }

  if (hit) {
    scope.cache.hit += 1;
  } else {
    scope.cache.miss += 1;
    scope.cache.missed.push(label);
  }
};

/**
 * Runs a Redis or Supabase call and adds its duration to the request's `timing`.
 * A call slower than SLOW_QUERY_MS is a warning, because that is a real fallback signal
 * (unlike a plain cache miss, which is normal).
 */
export const timed = async <T>(kind: "cache" | "db", what: string, fn: () => PromiseLike<T>): Promise<T> => {
  const start = performance.now();

  try {
    return await fn();
  } finally {
    const end = performance.now();
    const scope = storage.getStore();

    if (scope && !scope.sealed) {
      scope.timing[kind] += end - start;
      scope.busy.push([start, end]);
    }

    if (end - start > SLOW_QUERY_MS) {
      logWarn(
        "slow",
        `The ${kind === "db" ? "database" : "cache"} was slow to answer (${Math.round(end - start)}ms): ${what}.`,
      );
    }
  }
};

/**
 * Cache counts and the cache / db / render split for a request that took `totalMs`.
 * `render` is the time not spent waiting on a Redis or Supabase call. Overlapping
 * (parallel) calls are merged first, so it can't go negative.
 */
export const getRequestStats = (totalMs: number) => {
  const scope = storage.getStore();

  if (!scope) {
    return null;
  }

  let busyMs = 0;
  let from = 0;
  let to = -1;

  for (const [start, end] of [...scope.busy].sort((a, b) => a[0] - b[0])) {
    if (to < 0 || start > to) {
      busyMs += to < 0 ? 0 : to - from;
      from = start;
      to = end;
    } else if (end > to) {
      to = end;
    }
  }

  if (to >= 0) {
    busyMs += to - from;
  }

  const { hit, miss, missed } = scope.cache;
  const { astro } = scope;

  return {
    timing: {
      cache: Math.round(scope.timing.cache),
      db: Math.round(scope.timing.db),
      render: Math.max(0, Math.round(totalMs - busyMs)),
    },
    /** Redis: the only cache that can report a real hit or miss to this code. */
    redis: hit + miss > 0 ? { hit, miss, ...(missed.length ? { missed: [...new Set(missed)] } : {}) } : undefined,
    /** What the page asked Astro's cache for. */
    astro: astro
      ? astro.disabled
        ? { disabled: true }
        : { maxAge: astro.maxAge, swr: astro.swr, tags: astro.tags.size }
      : undefined,
  };
};
