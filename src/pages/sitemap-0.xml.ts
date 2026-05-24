import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";

export const prerender = false;

const staticPages = [
  "",
  "/about",
  "/colours",
  "/design-inspo",
  "/feedback",
  "/fonts",
  "/icons",
  "/illustrations",
  "/mockups",
  "/submit-tool",
  "/terms",
  "/tools",
];

export const GET: APIRoute = async () => {
  try {
    // Fetch dynamic tools from Supabase to include in sitemap
    const { data: tools, error } = await supabase
      .from("design_index")
      .select("primary_key, id, tool_name");

    let dynamicUrls = "";
    if (!error && tools) {
      dynamicUrls = tools
        .map((tool) => {
          const id = tool.primary_key ?? tool.id ?? 0;
          const name = tool.tool_name
            ? encodeURIComponent(tool.tool_name.trim())
            : "";
          if (!name) return "";
          return `  <url><loc>https://designindex.xyz/${name}?id=${id}</loc></url>\n`;
        })
        .filter(Boolean)
        .join("");
    }

    const staticUrls = staticPages
      .map((path) => `  <url><loc>https://designindex.xyz${path}</loc></url>\n`)
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${staticUrls}${dynamicUrls}</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.error("Sitemap generation error:", err);
    // Fallback sitemap containing only static pages
    const staticUrls = staticPages
      .map((path) => `  <url><loc>https://designindex.xyz${path}</loc></url>\n`)
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  }
};
