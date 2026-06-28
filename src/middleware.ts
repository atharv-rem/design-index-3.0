import { defineMiddleware } from "astro:middleware";
import { detectAIBot, negotiateFormat, markdownResponse, injectMarkdownAlternateLink, parseAcceptHeader } from "@dualmark/core";

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Serve Web Bot Auth JWKS directory endpoint directly
  if (pathname === "/.well-known/http-message-signatures-directory") {
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
      return new Response("Not Acceptable", { status: 406, headers: { "Content-Type": "text/plain" } });
    }
  }

  // 2. Determine if the client wants markdown (either via UA bot detection or Accept negotiation)
  const botInfo = detectAIBot(userAgent);
  const preferredFormat = negotiateFormat(acceptHeader);
  const wantsMarkdown = botInfo.isBot || preferredFormat === "markdown";

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
});

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
