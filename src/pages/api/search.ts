import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const keywordsParam = url.searchParams.get("keywords") || "";

    const keywords = keywordsParam
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (keywords.length === 0) {
      return Response.json([], {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // PostgreSQL keyword overlap search
    const { data, error } = await supabase.rpc("search_tools", {
      search_keywords: keywords,
    });

    if (error) {
      console.error("Supabase RPC search error:", error);

      return Response.json(
        { error: "Failed to search tools." },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return Response.json([], {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // Optional reranking
    const ranked = data
      .map((item: any) => {
        let relevanceScore = Number(item.match_count);

        const toolName = (item.tool_name || "").toLowerCase();
        const description = (item.description || "").toLowerCase();

        for (const keyword of keywords) {
          // exact tool name match
          if (toolName === keyword) {
            relevanceScore += 15;
          }

          // tool name starts with keyword
          else if (toolName.startsWith(keyword)) {
            relevanceScore += 8;
          }

          // whole word match
          else if (
            new RegExp(`\\b${keyword}\\b`, "i").test(toolName)
          ) {
            relevanceScore += 5;
          }

          // description match
          if (
            new RegExp(`\\b${keyword}\\b`, "i").test(description)
          ) {
            relevanceScore += 2;
          }
        }

        return {
          id: item.primary_key ?? 0,
          tool_name: item.tool_name || "Untitled Tool",
          description: item.description || "",
          og_image_link: item.og_image_link || "",
          matchedKeywordsCount: Number(item.match_count),
          relevanceScore,
        };
      })
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    return Response.json(ranked, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Unhandled search API error:", err);

    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
};