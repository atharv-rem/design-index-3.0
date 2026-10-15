import type { DrainContext } from "evlog";

// Dev-only terminal output. evlog's own pretty printer has a fixed palette and layout, so in
// development evlog is `silent` (see evlog.config.ts) and every event is printed from here.
//
// This is a drain, so it only ever *reads* the finished event: production output and anything
// sent to a real drain stay plain JSON with no colour codes.
//
// What gets printed depends on LOG_LEVEL (see resolveLogMode):
//
//   (unset)   every request as the tree below, and each prefetched request as one short line:
//               09:19:03 prefetched #193 Uncut (font)
//   requests  every request as the tree below; successful prefetches are left out
//   all       every request as the tree below, prefetches included
//
//   09:19:03 INFO [design-index] GET /193/Uncut 200 in 265ms
//     ├─ source: navigation · from /fonts
//     ├─ tool: #193 Uncut (font) · similar=3
//     ├─ cache: 3 hit, 0 miss
//     ├─ timing: cache=4ms db=0ms render=250ms
//     ├─ route: /[id]/[slug]
//     └─ requestId: 4a8ff3a8

type Event = Record<string, unknown>;

// Colour is off when NO_COLOR is set or the output isn't a terminal (piped, CI, a log file).
const useColor = () => typeof process !== "undefined" && !process.env.NO_COLOR && Boolean(process.stdout?.isTTY);

const paint = (code: string, text: string) => (useColor() ? `\x1b[${code}m${text}\x1b[0m` : text);

const GREEN = "32";
const YELLOW = "33";
const BLUE = "34";
const MAGENTA = "35";
const CYAN = "36";
const RED = "31";
const GRAY = "90";
const BOLD_RED = "1;31";
const BOLD_WHITE = "1;37";

const LEVELS: Record<string, [label: string, color: string]> = {
  info: ["INFO", GREEN],
  warn: ["WARN", YELLOW],
  error: ["ERROR", BOLD_RED],
  fatal: ["ERROR", BOLD_RED],
  debug: ["DEBUG", GRAY],
  trace: ["DEBUG", GRAY],
};

const methodColor = (method: string) => (method === "GET" ? CYAN : method === "POST" ? MAGENTA : YELLOW);

const statusColor = (status: number) =>
  status >= 500 ? RED : status >= 400 ? YELLOW : status >= 300 ? CYAN : GREEN;

const durationColor = (ms: number) => (ms > 500 ? RED : ms >= 100 ? YELLOW : GREEN);

// Fields printed by name below; everything else is listed generically as `key: a=b c=d`.
const HANDLED = new Set([
  "timestamp",
  "level",
  "service",
  "environment",
  "version",
  "commitHash",
  "region",
  "method",
  "path",
  "status",
  "durationMs",
  "duration",
  "requestId",
  "route",
  "referer",
  "source",
  "summary",
  "error",
  "tool",
  "cache",
  "timing",
  "message",
  "tag",
]);

const asText = (value: unknown): string =>
  value !== null && typeof value === "object" ? JSON.stringify(value) : String(value);

const flatten = (value: unknown): string => {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Event)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}=${asText(v)}`)
      .join(" ");
  }

  return asText(value);
};

const toolLine = (tool: Event): string => {
  const sep = paint(GRAY, " · ");
  const head: string[] = [];

  if (tool.id !== undefined) head.push(`#${tool.id}`);
  if (tool.name) head.push(paint(BOLD_WHITE, String(tool.name)));
  if (tool.category) head.push(`(${tool.category})`);

  const parts = [head.join(" ")];

  if (tool.found === false) parts.push(paint(YELLOW, "not found"));
  if (tool.similarTools !== undefined) parts.push(`similar=${tool.similarTools}`);
  if (tool.canonicalSlug) parts.push(`canonical ${tool.canonicalSlug}`);

  return parts.filter(Boolean).join(sep);
};

// 86400 -> "1d", 43200 -> "12h", 300 -> "5m", 90 -> "90s".
const humanSeconds = (value: unknown): string => {
  const s = Number(value);

  if (!Number.isFinite(s)) return String(value);
  if (s >= 86400 && s % 86400 === 0) return `${s / 86400}d`;
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600}h`;
  if (s >= 60 && s % 60 === 0) return `${s / 60}m`;

  return `${s}s`;
};

// Redis is the one cache that can report a real hit or miss to the app.
const redisLine = (redis: Event): string => {
  const hit = Number(redis.hit ?? 0);
  const miss = Number(redis.miss ?? 0);
  const missed = Array.isArray(redis.missed) ? (redis.missed as string[]) : [];

  const counts = [
    paint(hit > 0 ? GREEN : GRAY, `${hit} hit`),
    paint(miss > 0 ? YELLOW : GRAY, `${miss} miss`),
  ].join(", ");

  // Entries are only named when they were missed.
  return `redis ${missed.length ? `${counts} ${paint(YELLOW, `(${missed.join(", ")})`)}` : counts}`;
};

// Astro's cache and Vercel's edge answer before the app runs (and don't exist in dev), so what is
// shown is the lifetime the page or response *asked for*, not a hit or miss.
const lifetime = (maxAge: unknown, swr: unknown) =>
  `${maxAge === undefined ? "no max age" : humanSeconds(maxAge)}${swr === undefined ? "" : `, swr ${humanSeconds(swr)}`}`;

const astroLine = (astro: Event): string =>
  astro.disabled
    ? `asks for no caching ${paint(GRAY, "(not active in dev)")}`
    : `asks for ${lifetime(astro.maxAge, astro.swr)}${astro.tags ? `, ${astro.tags} tags` : ""} ${paint(GRAY, "(not active in dev)")}`;

const vercelLine = (vercel: Event): string =>
  `asks for ${lifetime(vercel.maxAge, vercel.swr)} ${paint(GRAY, "(not active in dev)")}`;

const timingLine = (timing: Event) =>
  ["cache", "db", "render"]
    .filter((key) => timing[key] !== undefined)
    .map((key) => `${key}=${timing[key]}ms`)
    .join(" ");

const errorLines = (error: unknown): string[] => {
  if (error === null || typeof error !== "object") {
    return [paint(RED, String(error))];
  }

  const { message, stack } = error as { message?: string; stack?: string };
  const frames = String(stack ?? "")
    .split("\n")
    .slice(1, 4)
    .map((line) => paint(GRAY, `  ${line.trim()}`));

  return [paint(RED, String(message ?? "Unknown error")), ...frames];
};

const tree = (lines: string[]): string =>
  lines
    .map((line, index) => {
      const branch = paint(GRAY, index === lines.length - 1 ? "└─" : "├─");
      const [first, ...rest] = line.split("\n");

      // Continuation lines (stack frames) hang under their field.
      return [`  ${branch} ${first}`, ...rest.map((extra) => `  ${paint(GRAY, "│")}    ${extra}`)].join("\n");
    })
    .join("\n");

const label = (name: string) => `${name}:`;

/** What the dev terminal shows. */
export type LogMode = "normal" | "requests" | "all";

/** Maps the LOG_LEVEL setting to a mode. Unset (or anything unknown) is the normal mode. */
export function resolveLogMode(value: unknown): LogMode {
  const setting = String(value ?? "").toLowerCase();

  if (setting === "all" || setting === "debug") return "all";
  if (setting === "requests") return "requests";

  return "normal";
}

// The short line for a prefetched request: the tool (or the path, for a page that isn't a tool)
// and that it was prefetched. The status only appears when the prefetch failed.
const prefetchLine = (e: Event): string => {
  const time = new Date(String(e.timestamp)).toLocaleTimeString("en-GB", { hour12: false });
  const tool = e.tool && typeof e.tool === "object" ? (e.tool as Event) : undefined;
  const status = Number(e.status ?? 0);

  let what = String(e.path);

  if (tool && (tool.name || tool.id !== undefined)) {
    const parts: string[] = [];

    if (tool.id !== undefined) parts.push(`#${tool.id}`);
    if (tool.name) parts.push(paint(BOLD_WHITE, String(tool.name)));
    if (tool.category) parts.push(`(${tool.category})`);

    what = parts.join(" ");
  }

  const failed = status >= 400 ? ` ${paint(statusColor(status), String(status))}` : "";

  return `${paint(GRAY, time)} ${paint(CYAN, "prefetched")} ${what}${failed}`;
};

export function createDevDrain(mode: LogMode) {
  return ({ event }: DrainContext): void => {
    const e = event as Event;

    // Prefetches are the visitor's browser fetching ahead, so they get one short line instead of the
    // full tree. In `requests` mode the successful ones never get here, and in `all` they are in full.
    if (mode === "normal" && e.source === "prefetch") {
      // Astro's 404 re-render repeats the request under /404; the first event already says it.
      if (e.route !== "/404") {
        console.log(prefetchLine(e));
      }

      return;
    }

    printEvent(e);
  };
}

function printEvent(e: Event): void {
  const level = String(e.level ?? "info");
  const [levelLabel, levelColor] = LEVELS[level] ?? LEVELS.info;
  const time = new Date(String(e.timestamp)).toLocaleTimeString("en-GB", { hour12: false });
  const service = paint(GRAY, `[${e.service ?? "app"}]`);

  const lines: string[] = [];

  // Not a request (a standalone log from outside one): message plus any fields.
  if (!e.method) {
    const header = `${paint(GRAY, time)} ${paint(levelColor, levelLabel)} ${service} ${e.message ?? e.tag ?? ""}`;

    for (const [key, value] of Object.entries(e)) {
      if (!HANDLED.has(key) && value !== undefined && value !== null) {
        lines.push(`${label(key)} ${flatten(value)}`);
      }
    }

    if (e.error) lines.push(`${label("error")} ${errorLines(e.error).join("\n")}`);

    console.log(lines.length ? `${header}\n${tree(lines)}` : header);
    return;
  }

  const status = Number(e.status ?? 0);
  const durationMs = Number(e.durationMs ?? 0);
  const method = String(e.method);

  const header = [
    paint(GRAY, time),
    paint(levelColor, levelLabel),
    service,
    paint(methodColor(method), method),
    String(e.path),
    status ? paint(statusColor(status), String(status)) : "",
    `in ${paint(durationColor(durationMs), `${durationMs}ms`)}`,
  ]
    .filter(Boolean)
    .join(" ");

  // The sentence only appears when something is worth reading: a warning, an error, a redirect.
  const notable = level === "warn" || level === "error" || level === "fatal" || (status >= 300 && status < 400);

  if (notable && e.summary) {
    lines.push(`${label("note")} ${paint(level === "warn" ? YELLOW : level === "error" ? RED : GRAY, String(e.summary))}`);
  }

  if (e.error) {
    lines.push(`${label("error")} ${errorLines(e.error).join("\n")}`);
  }

  const referer = e.referer ? String(e.referer) : undefined;

  if (e.source) {
    const from = referer ? ` ${paint(GRAY, `· from ${referer}`)}` : "";
    lines.push(`${label("source")} ${paint(GRAY, String(e.source))}${from}`);
  } else if (referer) {
    lines.push(`${label("from")} ${paint(GRAY, referer)}`);
  }

  if (e.tool && typeof e.tool === "object") {
    lines.push(`${label("tool")} ${toolLine(e.tool as Event)}`);
  }

  for (const [key, value] of Object.entries(e)) {
    if (!HANDLED.has(key) && value !== undefined && value !== null) {
      lines.push(`${label(key)} ${flatten(value)}`);
    }
  }

  if (e.cache && typeof e.cache === "object") {
    const cache = e.cache as Event;

    if (cache.redis) lines.push(`${label("cache")} ${redisLine(cache.redis as Event)}`);
    if (cache.astro) lines.push(`${label("astro cache")} ${astroLine(cache.astro as Event)}`);
    if (cache.vercel) lines.push(`${label("vercel cache")} ${vercelLine(cache.vercel as Event)}`);
  }

  if (e.timing && typeof e.timing === "object") {
    lines.push(`${label("timing")} ${timingLine(e.timing as Event)}`);
  }

  if (e.route) {
    lines.push(`${label("route")} ${paint(BLUE, String(e.route))}`);
  }

  if (e.requestId) {
    lines.push(`${label("requestId")} ${paint(GRAY, String(e.requestId).slice(0, 8))}`);
  }

  console.log(`${header}\n${tree(lines)}`);
}
