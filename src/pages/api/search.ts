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

    // Query Supabase for tools matching any of the keywords in their seo_keywords
    const { data, error } = await supabase
      .from("design_index")
      .select("primary_key, tool_name, description, og_image_link, seo_keywords");

    if (error) {
      console.error("Supabase search query error:", error);
      return Response.json({ error: "Failed to fetch tools from database." }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json([]);
    }

    // Calculate relevance score and filter matching items
    const results = data
      .map((item) => {
        const seoKeywords = Array.isArray(item.seo_keywords)
          ? item.seo_keywords.map((k: string) => k.toLowerCase())
          : typeof item.seo_keywords === "string"
          ? (item.seo_keywords as string).toLowerCase().split(",").map((k) => k.trim())
          : [];

        // Count overlapping keywords in seo_keywords
        const matchedKeywordsCount = keywords.filter((k) => seoKeywords.includes(k)).length;

        // Calculate custom relevance score
        let relevanceScore = matchedKeywordsCount;

        const toolName = (item.tool_name || "").toLowerCase();
        const description = (item.description || "").toLowerCase();

        keywords.forEach((keyword) => {
          // Extra weight if keyword matches tool name
          if (toolName.includes(keyword)) {
            relevanceScore += 3.0;
          }
          // Extra weight if keyword matches description
          if (description.includes(keyword)) {
            relevanceScore += 1.0;
          }
        });

        return {
          id: item.primary_key ?? 0,
          tool_name: item.tool_name || "Untitled Tool",
          description: item.description || "",
          og_image_link: item.og_image_link || "",
          matchedKeywordsCount,
          relevanceScore,
        };
      })
      .filter((item) => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return Response.json(results, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("Unhanded search API error:", err);
    return Response.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
};
