import { defineEvlog } from "evlog";
import { createDevDrain, resolveLogMode } from "./src/lib/dev-log";

const isDev = Boolean(import.meta.env?.DEV);

// What the dev terminal shows, chosen with LOG_LEVEL:
//
//   (unset)   every request in full, plus one short line per prefetch (tool + "prefetched")
//   requests  every request in full; successful prefetches are left out
//   all       every request in full, prefetches included
//
//   macOS / Linux / Git Bash:  LOG_LEVEL=all npm run dev
//   PowerShell:                $env:LOG_LEVEL = "all"; npm run dev
//   cmd.exe:                   set LOG_LEVEL=all && npm run dev
const logLevel = import.meta.env?.LOG_LEVEL ?? (typeof process !== "undefined" ? process.env.LOG_LEVEL : undefined);
const logMode = resolveLogMode(logLevel);

// Read by src/middleware.ts via initLogger(toLoggerConfig(config)).
// Options that only apply to evlog's own framework middleware (enrich, keep, include,
// exclude, routes) are not used here: Astro's middleware builds the request logger itself.
export default defineEvlog({
  service: "design-index",
  // Mask emails, card numbers, tokens and similar PII anywhere in an event.
  // `ipv4` is left out on purpose: no IPs are logged, and it mistakes browser versions
  // such as "Chrome/137.0.0.0" in the user agent for addresses and masks them.
  redact: { builtins: ["email", "creditCard", "phone", "jwt", "bearer", "iban", "secrets"] },
  sampling: {
    // A successful prefetch is a debug event. Only the `requests` mode drops them outright.
    rates: { debug: logMode === "requests" ? 0 : 100 },
  },
  // Logging is development-only. In production evlog is disabled: it swaps in a no-op logger,
  // so nothing is written (nothing reaches Vercel's Logs tab) and the calls in the app cost
  // next to nothing. Errors Astro itself reports are not affected.
  //
  // To turn production logging back on: remove `enabled`, and optionally add a drain
  // (e.g. `drain: createAxiomDrain()`; adapters: https://www.evlog.dev/integrate/adapters/overview).
  enabled: isDev,
  // Development: evlog stays quiet and src/lib/dev-log.ts prints the coloured tree instead.
  ...(isDev ? { silent: true, drain: createDevDrain(logMode) } : {}),
});
