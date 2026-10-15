import type { APIRoute } from "astro";
import { logError, note, timed } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const { log } = locals;

  try {
    const keywordsParam = url.searchParams.get("keywords") || "";

    const keywords = keywordsParam
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    log.set({ search: { words: keywords } });

    if (keywords.length === 0) {
      note("No search words were given, so nothing was searched.");
      return Response.json([], {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // PostgreSQL keyword overlap search
    const { data, error } = await timed("db", "the keyword search", () =>
      supabase.rpc("search_tools", {
        search_keywords: keywords,
      }),
    );

    if (error) {
      logError("The database search failed.", new Error(error.message), {
        search: { databaseErrorCode: error.code },
      });

      return Response.json(
        { error: "Failed to search tools." },
        { status: 500 }
      );
    }

    log.set({ search: { matches: data?.length ?? 0 } });
    note(`Searched for "${keywords.join(", ")}" and found ${data?.length ?? 0} tools.`);

    if (!data || data.length === 0) {
      return Response.json([], {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // Map and sort purely by match_count descending
    const ranked = data
      .map((item: any) => ({
        id: item.primary_key ?? 0,
        tool_name: item.tool_name || "Untitled Tool",
        description: item.description || "",
        og_image_link: item.og_image_link || "",
        matchedKeywordsCount: Number(item.match_count),
      }))
      .sort((a: any, b: any) => b.matchedKeywordsCount - a.matchedKeywordsCount);

    return Response.json(ranked, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    logError("The search crashed unexpectedly.", err);

    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
};