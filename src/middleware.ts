import { defineMiddleware } from "astro:middleware";
import type { APIContext, MiddlewareNext } from "astro";
import { detectAIBot, negotiateFormat, markdownResponse, injectMarkdownAlternateLink, parseAcceptHeader } from "@dualmark/core";
import { waitUntil } from "@vercel/functions";
import { createRequestLogger, initLogger, toLoggerConfig, type RequestLogger } from "evlog";
import config from "../evlog.config";
import {
  SLOW_REQUEST_MS,
  getLevel,
  getNotes,
  getRequestStats,
  logWarn,
  note,
  raiseLevel,
  recordAstroCache,
  runWithLogger,
} from "@/lib/logger";

initLogger(toLoggerConfig(config));

// Lets drains finish after the response is sent. Throws outside a Vercel request (local dev).
const waitUntilSafe = (promise: Promise<unknown>) => {
  try {
    waitUntil(promise);
  } catch {
    // No request context: the promise still runs, just unawaited.
  }
};

// Assets that never need an event. Vite and the CDN serve these before middleware in practice,
// so this is only a safety net: they are still handled normally, just not logged.
const STATIC_ASSET =
  /^\/_astro\/|^\/_image(?:\/|$)|\.(?:ico|png|jpe?g|gif|webp|avif|svg|css|m?js|map|woff2?|ttf|otf)$/i;

// The shared-cache (Vercel edge) lifetime a response asks for, read from its headers. This is the
// policy, not a hit or miss: a request answered from the edge never reaches this code at all.
function parseEdgePolicy(headers: Headers | undefined): { maxAge: number; swr?: number } | undefined {
  if (!headers) {
    return undefined;
  }

  // CDN-specific headers use max-age; the plain header uses s-maxage for shared caches.
  const specific = headers.get("vercel-cdn-cache-control") ?? headers.get("cdn-cache-control");
  const value = specific ?? headers.get("cache-control") ?? "";
  const maxAge = (specific ? /(?:^|[,\s])(?:s-)?max-age=(\d+)/ : /s-maxage=(\d+)/).exec(value)?.[1];

  if (maxAge === undefined) {
    return undefined;
  }

  const swr = /stale-while-revalidate=(\d+)/.exec(value)?.[1];

  return { maxAge: Number(maxAge), ...(swr !== undefined ? { swr: Number(swr) } : {}) };
}

// Where the visitor came from: a path for our own pages, just the hostname for anyone else.
function describeReferer(referer: string | null, origin: string): string | undefined {
  if (!referer) {
    return undefined;
  }

  try {
    const from = new URL(referer);

    return from.origin === origin ? from.pathname : from.hostname;
  } catch {
    return undefined;
  }
}

// What a browser sends for a link it is only fetching ahead of time versus one the visitor opened.
// Observed from Opera/Chromium on a /fonts page (Astro's prefetch is <link rel="prefetch">):
//   prefetch:   Sec-Purpose: prefetch   Sec-Fetch-Mode: no-cors   Sec-Fetch-Dest: empty
//   navigation: (no Sec-Purpose)        Sec-Fetch-Mode: navigate  Sec-Fetch-Dest: document
// Anything else (curl, bots, API calls from page scripts) gets no `source`. Browsers that don't
// send Sec-Purpose would show their prefetches as normal events rather than hiding them.
function classifySource(headers: Headers): "prefetch" | "navigation" | undefined {
  if (headers.get("sec-purpose")?.toLowerCase().includes("prefetch")) {
    return "prefetch";
  }

  return headers.get("sec-fetch-dest") === "document" ? "navigation" : undefined;
}

// One wide event per request: this builds it, route handlers and lib code add to it
// (Astro.locals.log / src/lib/logger.ts), and it is emitted exactly once below.
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url } = context;
  const startedAt = performance.now();

  const log = createRequestLogger({
    method: request.method,
    path: url.pathname,
    requestId: crypto.randomUUID(),
    waitUntil: waitUntilSafe,
  });

  context.locals.log = log;

  // Dev only. Astro's cache is a no-op there, and pages only call `Astro.cache.set(...)` when
  // `Astro.cache.enabled` is true, so by default nothing would show what a page asks for.
  // Marking the no-op cache as enabled makes pages take the same path as in production (their
  // `set` still does nothing), and wrapping `set` records the policy for the terminal.
  if (import.meta.env.DEV) {
    try {
      const cache = context.cache as { enabled: boolean; set: (options: unknown) => void };
      const originalSet = cache.set.bind(cache);

      cache.enabled = true;
      cache.set = (options: unknown) => {
        recordAstroCache(options);
        return originalSet(options);
      };
    } catch {
      // A frozen or missing cache object just means the policy isn't shown.
    }
  }

  // At build time (prerendering) there is no real request: headers are unavailable and Astro warns
  // when they are read, and an event for it would only be noise in the build output.
  const prerendering = context.isPrerendered;

  const referer = prerendering ? undefined : describeReferer(request.headers.get("referer"), url.origin);
  const vercelId = prerendering ? null : request.headers.get("x-vercel-id");
  const source = prerendering ? undefined : classifySource(request.headers);

  log.set({
    route: context.routePattern,
    ...(source ? { source } : {}),
    ...(referer ? { referer } : {}),
    // Lets an event be matched to the same request in Vercel's own logs.
    ...(vercelId ? { vercelId } : {}),
  });

  return runWithLogger(log, async () => {
    try {
      if (context.routePattern === "/404") {
        note("Showing the site's own not-found page.");
      }

      const response = await handleRequest(context, next, log);

      settle(log, response.status, response, startedAt, source === "prefetch");

      return response;
    } catch (error) {
      note("The page crashed before it could respond.");
      settle(log, 500, null, startedAt, source === "prefetch");
      log.error(error instanceof Error ? error : new Error(String(error)), { status: 500 });
      throw error;
    } finally {
      if (!prerendering && !STATIC_ASSET.test(url.pathname)) {
        log.emit();
      }
    }
  });
});

// Writes the end-of-request fields: status, cache counts, the timing split, and the level.
function settle(
  log: RequestLogger,
  status: number,
  response: Response | null,
  startedAt: number,
  isPrefetch: boolean,
) {
  const durationMs = Math.round(performance.now() - startedAt);

  if (status >= 500) {
    raiseLevel("error");
  } else if (status >= 400) {
    raiseLevel("warn");
  }

  if (durationMs > SLOW_REQUEST_MS) {
    logWarn("slow", `The request was slow (${durationMs}ms).`);
  }

  // A prefetch that worked is a debug event, so the dev terminal can show it as a short line
  // (the default) or leave it out (LOG_LEVEL=requests). One that failed or was slow keeps its warn/error.
  if (isPrefetch && !getLevel() && status < 400) {
    log.setLevel("debug");
  }

  const stats = getRequestStats(durationMs);
  const contentType = response?.headers.get("content-type");
  const vercel = parseEdgePolicy(response?.headers);

  // Three different caches, named as such. Only Redis has real hits and misses to report; Astro's
  // cache and Vercel's edge answer before this code runs (or, in dev, don't exist), so for those
  // the event carries the policy the response asked for.
  const cache = {
    ...(stats?.redis ? { redis: stats.redis } : {}),
    ...(stats?.astro ? { astro: stats.astro } : {}),
    ...(vercel ? { vercel } : {}),
  };

  log.set({
    status,
    // HTML pages are obvious from the route, so only other types are worth saying.
    ...(contentType && !contentType.includes("text/html") ? { contentType } : {}),
    ...(Object.keys(cache).length ? { cache } : {}),
    ...(stats ? { timing: stats.timing } : {}),
    // Dev terminal only: drained production events don't carry the sentence.
    ...(import.meta.env.DEV
      ? { summary: summarise(status, response?.headers.get("location") ?? null, stats?.redis?.missed) }
      : {}),
  });
}

// One plain sentence for how the request ended.
function describeOutcome(status: number, location: string | null): string {
  if (status >= 500) return `Something went wrong on our side (${status}).`;
  if (status === 404) return "Not found (404).";
  if (status === 401) return "Rejected: missing or wrong token (401).";
  if (status === 403) return "Blocked (403).";
  if (status === 406) return "Rejected: we can't send the type of file that was asked for (406).";
  if (status >= 400) return `Rejected as invalid (${status}).`;
  if (status >= 300 && location) return `Redirected to ${location} (${status}).`;
  return "Served successfully.";
}

// How it ended, what happened on the way, and which cache entries had to be loaded fresh.
function summarise(status: number, location: string | null, missed?: string[]): string {
  const sentences = [describeOutcome(status, location), ...getNotes()];

  if (missed?.length) {
    sentences.push(`Not in Redis yet: ${missed.join(", ")}.`);
  }

  return sentences.join(" ");
}

async function handleRequest(context: APIContext, next: MiddlewareNext, log: RequestLogger): Promise<Response> {
  const pathname = context.url.pathname;

  // Serve Web Bot Auth JWKS directory endpoint directly
  if (pathname === "/.well-known/http-message-signatures-directory") {
    log.set({ route: pathname });
    note("Served the public key list that bots use to verify our signed requests.");
    const jwks = {
      keys: [
        {
          kty: "EC",
          crv: "P-256",
          x: "MKBCTNIcKXYtyzsxuo7x2SygGDkh6tQHrc6sEBFuzmI",
          y: "4Etl6SRW2YiLUrN5vfvVHuhp7x8Pxltm1v1FS35g1A0",
          use: "sig",
          alg: "ES256",
          kid: "designindex-bot-key-1"
        }
      ]
    };
    return new Response(JSON.stringify(jwks), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Serve RFC 9727 API Catalog directly
  if (pathname === "/.well-known/api-catalog") {
    log.set({ route: pathname });
    note("Served the API catalog file.");
    const catalog = {
      linkset: [
        {
          anchor: "https://designindex.xyz/api/search",
          "service-desc": [
            {
              href: "https://designindex.xyz/openapi.json",
              type: "application/openapi+json"
            }
          ],
          "service-doc": [
            {
              href: "https://designindex.xyz/docs",
              type: "text/html"
            }
          ]
        }
      ]
    };
    return new Response(JSON.stringify(catalog), {
      status: 200,
      headers: {
        "Content-Type": "application/linkset+json; charset=utf-8",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Serve Agent Skills Discovery Index directly
  if (pathname === "/.well-known/agent-skills/index.json") {
    log.set({ route: pathname });
    note("Served the list of skills AI agents can use.");
    const index = {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          name: "design-search",
          type: "skill-md",
          description: "Searches for curated design tools, templates, mockups, fonts, and color palettes on Design Index.",
          url: "https://designindex.xyz/SKILL.md",
          digest: "sha256:a1c22a3e956ff73becddd17ddb83480c6f0cbdaf6cef6c3eb33d03b92af6c68a"
        }
      ]
    };
    return new Response(JSON.stringify(index), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400"
      }
    });
  }

  // Prevent infinite loops if this is an internal fetch call to get HTML
  if (context.request.headers.get("x-dualmark-bypass") === "true") {
    note("Internal request made to build the markdown copy of a page.");
    return next();
  }

  const userAgent = context.request.headers.get("user-agent") ?? "";
  const acceptHeader = context.request.headers.get("accept") ?? "";

  // 1. Strict 406 check: if Accept excludes both HTML and Markdown and isn't "*/*"
  if (acceptHeader && !acceptHeader.includes("*/*")) {
    const prefs = parseAcceptHeader(acceptHeader);
    const hasHtml = prefs.some(p => p.type === "text" && p.subtype === "html" || p.type === "application" && p.subtype === "xhtml+xml");
    const hasMarkdown = prefs.some(p => p.type === "text" && p.subtype === "markdown");
    if (!hasHtml && !hasMarkdown && prefs.length > 0) {
      logWarn("request", "Refused the request: it only accepts file types this site does not serve.", {
        acceptHeader,
      });
      return new Response("Not Acceptable", { status: 406, headers: { "Content-Type": "text/plain" } });
    }
  }

  // 2. Determine if the client wants markdown (either via UA bot detection or Accept negotiation)
  const botInfo = detectAIBot(userAgent);
  const preferredFormat = negotiateFormat(acceptHeader);
  const wantsMarkdown = botInfo.isBot || preferredFormat === "markdown";

  // Only recorded when out of the ordinary, so a normal visit stays quiet.
  if (botInfo.isBot) {
    log.set({ visitor: `AI crawler (${botInfo.name ?? "unknown"})` });
  }

  if (wantsMarkdown) {
    log.set({ replyFormat: "markdown" });
    note(
      botInfo.isBot
        ? `Recognised the ${botInfo.name ?? "AI"} crawler, so the page is sent as markdown.`
        : "The request asked for markdown, so the page is sent as markdown.",
    );
  }

  // 3. Handle explicit `.md` URL requests
  if (pathname.endsWith(".md")) {
    // Strip .md extension to find the original page path (e.g. /index.md -> /, /tools.md -> /tools)
    let targetPath = pathname.substring(0, pathname.length - 3);
    if (targetPath === "/index" || targetPath === "") {
      targetPath = "/";
    }

    const targetUrl = new URL(targetPath, context.url);
    const htmlResponse = await fetch(targetUrl, {
      headers: { "x-dualmark-bypass": "true" }
    });

    note(
      htmlResponse.ok
        ? `Built the markdown copy of ${targetPath}.`
        : `Could not build the markdown copy of ${targetPath} (that page answered ${htmlResponse.status}).`,
    );

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      const markdown = htmlToMarkdown(html);
      return markdownResponse(markdown, { noindex: true });
    }
  }

  // 4. Default path: Fetch standard response
  const response = await next();
  const contentType = response.headers.get("content-type") ?? "";

  // If the client wants markdown, convert the HTML response inline to markdown
  if (wantsMarkdown && contentType.toLowerCase().includes("text/html")) {
    // The CDN caches by URL only, so a cached markdown reply would be served to browsers too.
    // Keep it out of the shared cache; the page's normal HTML is what gets cached.
    context.cache.set(false);

    const html = await response.text();
    const markdown = htmlToMarkdown(html);
    return markdownResponse(markdown, { noindex: true });
  }

  // Otherwise, inject Link header pointing to the markdown twin
  if (contentType.toLowerCase().includes("text/html")) {
    const mdPath = pathname === "/" ? "/index.md" : (pathname.endsWith("/") ? pathname.slice(0, -1) : pathname) + ".md";
    return injectMarkdownAlternateLink(response, pathname, mdPath);
  }

  return response;
}

// Turns every <table> into a markdown table (first row becomes the header row).
function convertTables(html: string): string {
  const cellText = (cell: string) =>
    cell
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
        const clean = text.replace(/<[^>]*>/g, "").trim();
        return clean ? `[${clean}](${href})` : "";
      })
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\|/g, "\\|")
      .trim();

  return html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner: string) => {
    const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => cellText(cell[1])))
      .filter((cells) => cells.length > 0);

    if (!rows.length) return "";

    const width = Math.max(...rows.map((cells) => cells.length));
    const line = (cells: string[]) =>
      `| ${[...cells, ...Array(width - cells.length).fill("")].join(" | ")} |`;

    return `\n${[line(rows[0]), line(Array(width).fill("---")), ...rows.slice(1).map(line)].join("\n")}\n`;
  });
}

function htmlToMarkdown(html: string): string {
  let content = html;
  
  // Target <main> container to extract clean content body
  const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    content = mainMatch[1];
  } else {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      content = bodyMatch[1];
    }
  }

  // Strip non-content markup elements
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");

  // Tables must be converted before the generic tag stripping below flattens them
  content = convertTables(content);

  // Format HTML headings and paragraphs into markdown equivalents
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1");
  content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "\n$1\n");
  content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "\n$1\n");
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  
  // Convert hyperlinks
  content = content.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const cleanText = text.replace(/<[^>]*>/g, "").trim();
    if (!cleanText) return "";
    return `[${cleanText}](${href})`;
  });

  // Strip remaining HTML tags
  content = content.replace(/<[^>]*>/g, "");

  // Decode standard HTML entities
  content = content.replace(/&nbsp;/g, " ")
                   .replace(/&amp;/g, "&")
                   .replace(/&lt;/g, "<")
                   .replace(/&gt;/g, ">")
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");

  // Format blank spaces and lines
  content = content.split("\n").map(line => line.trim()).join("\n");
  content = content.replace(/\n{3,}/g, "\n\n").trim();
  
  return content;
}
