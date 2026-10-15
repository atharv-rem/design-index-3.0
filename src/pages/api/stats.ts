import { getCachedJson, setCachedJsonInBackground } from "@/lib/cache";
import { logSet, note } from "@/lib/logger";

export const prerender = false;

type StatsPayload = {
  pageviews: number;
  visitors: number;
};

const CACHE_KEY = "design-index:databuddy:stats";
const CACHE_TTL_SECONDS = 3600; // 1 hour

// Databuddy is paused, so its numbers no longer grow. Vercel Analytics (last 30 days,
// snapshot taken 2026-10-13) is added on top of whatever Databuddy still reports.
const VERCEL_ANALYTICS_SNAPSHOT: StatsPayload = {
  pageviews: 2090,
  visitors: 842,
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
};

function withVercelAnalytics(stats: StatsPayload): StatsPayload {
  return {
    pageviews: stats.pageviews + VERCEL_ANALYTICS_SNAPSHOT.pageviews,
    visitors: stats.visitors + VERCEL_ANALYTICS_SNAPSHOT.visitors,
  };
}

async function fetchDatabuddyStats(apiKey: string, websiteId: string): Promise<StatsPayload> {
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

  return {
    pageviews: Number(pageviews) || 0,
    visitors: Number(visitors) || 0,
  };
}

export async function GET() {
  const apiKey = import.meta.env.DATABUDDY_API_KEY;
  const websiteId = import.meta.env.DATABUDDY_WEBSITE_ID;

  // The cache holds the raw Databuddy numbers; the Vercel offset is applied on the way out.
  const cachedStats = await getCachedJson<StatsPayload>(CACHE_KEY);
  if (cachedStats) {
    note("Used the saved visitor numbers from the cache.");

    return new Response(
      JSON.stringify(withVercelAnalytics(cachedStats)),
      { status: 200, headers: { ...JSON_HEADERS, "x-cache": "hit" } }
    );
  }

  let databuddyStats: StatsPayload = { pageviews: 0, visitors: 0 };

  if (apiKey && websiteId) {
    try {
      databuddyStats = await fetchDatabuddyStats(apiKey, websiteId);
      // Cache result in Redis without delaying the response
      setCachedJsonInBackground(CACHE_KEY, databuddyStats, CACHE_TTL_SECONDS);
      note("Fetched fresh visitor numbers from Databuddy and added the Vercel Analytics numbers.");
    } catch (error) {
      // Databuddy is paused/unavailable: fall back to the Vercel Analytics numbers alone.
      // Expected, so recorded as context rather than a warning.
      note("Databuddy could not be reached (it is paused), so only the Vercel Analytics numbers were used.");
      logSet({
        stats: { databuddyError: error instanceof Error ? error.message : String(error) },
      });
    }
  } else {
    note("Databuddy is not set up here, so only the Vercel Analytics numbers were used.");
  }

  return new Response(
    JSON.stringify(withVercelAnalytics(databuddyStats)),
    { status: 200, headers: { ...JSON_HEADERS, "x-cache": "miss" } }
  );
}
