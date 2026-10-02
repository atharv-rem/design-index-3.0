import { getCachedJson, setCachedJsonInBackground } from "@/lib/cache";

export const prerender = false;

type StatsPayload = {
  pageviews: number;
  visitors: number;
};

const CACHE_KEY = "design-index:databuddy:stats";
const CACHE_TTL_SECONDS = 3600; // 1 hour

export async function GET() {
  const apiKey = import.meta.env.DATABUDDY_API_KEY;
  const websiteId = import.meta.env.DATABUDDY_WEBSITE_ID;

  if (!apiKey || !websiteId) {
    return new Response(
      JSON.stringify({ error: "Missing API credentials" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check Redis Cache
  const cachedStats = await getCachedJson<StatsPayload>(CACHE_KEY);
  if (cachedStats) {
    return new Response(
      JSON.stringify(cachedStats),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
          "x-cache": "hit",
        },
      }
    );
  }

  try {
    const response = await fetch(`https://api.databuddy.cc/v1/query?website_id=${websiteId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameters: ["summary_metrics", "top_pages"],
        preset: "last_30d",
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats from Databuddy');
    }

    const data = await response.json();
    let pageviews = 0;
    let visitors = 0;

    if (Array.isArray(data.data)) {
      const summaryBlock = data.data.find((item: any) => item.parameter === "summary_metrics");
      if (summaryBlock && Array.isArray(summaryBlock.data) && summaryBlock.data.length > 0) {
        pageviews = summaryBlock.data[0].pageviews ?? 0;
        visitors = summaryBlock.data[0].unique_visitors ?? summaryBlock.data[0].visitors ?? 0;
      }
    } else {
      pageviews =
        data.summary_metrics?.pageviews ??
        data.summary_metrics?.page_views ??
        data.pageviews ??
        0;
      visitors =
        data.summary_metrics?.unique_visitors ??
        data.summary_metrics?.visitors ??
        data.visitors ??
        0;
    }
    
    const payload: StatsPayload = {
      pageviews: Number(pageviews) || 0,
      visitors: Number(visitors) || 0,
    };

    // Cache result in Redis without delaying the response
    setCachedJsonInBackground(CACHE_KEY, payload, CACHE_TTL_SECONDS);

    return new Response(
      JSON.stringify(payload), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
          "x-cache": "miss",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}