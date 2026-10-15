import { getCachedJson, setCachedJsonInBackground } from "@/lib/cache";
import { logSet, note } from "@/lib/logger";

export const prerender = false;

type StatsPayload = {
  pageviews: number;
  visitors: number;
};

const DATABUDDY_CACHE_KEY = "design-index:databuddy:stats";
const VERCEL_CACHE_KEY = "design-index:vercel:stats";
const CACHE_TTL_SECONDS = 3600; // 1 hour
const WINDOW_DAYS = 30;

// Last-resort fallback if the Vercel API is unreachable or not configured
// (Vercel Analytics, last 30 days, snapshot taken 2026-10-13).
const VERCEL_FALLBACK: StatsPayload = {
  pageviews: 2090,
  visitors: 842,
};

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=1800",
};

async function fetchVercelStats(token: string, projectId: string, teamId?: string): Promise<StatsPayload> {
  const until = new Date();
  const since = new Date(until.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    projectId,
    since: since.toISOString(),
    until: until.toISOString(),
  });
  if (teamId) params.set("teamId", teamId);

  const response = await fetch(`https://api.vercel.com/v1/query/web-analytics/visits/count?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Vercel Analytics API responded with ${response.status}`);
  }

  const { data } = await response.json();
  return {
    pageviews: Number(data?.pageviews) || 0,
    visitors: Number(data?.visitors) || 0,
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

async function getVercelStats(): Promise<StatsPayload> {
  const token = import.meta.env.VERCEL_API_TOKEN;
  const projectId = import.meta.env.VERCEL_PROJECT_ID;
  const teamId = import.meta.env.VERCEL_TEAM_ID;

  const cached = await getCachedJson<StatsPayload>(VERCEL_CACHE_KEY);
  if (cached) return cached;

  if (!token || !projectId) {
    note("Vercel Analytics is not set up here, so the saved Vercel numbers were used.");
    return VERCEL_FALLBACK;
  }

  try {
    const stats = await fetchVercelStats(token, projectId, teamId);
    setCachedJsonInBackground(VERCEL_CACHE_KEY, stats, CACHE_TTL_SECONDS);
    return stats;
  } catch (error) {
    note("Vercel Analytics could not be reached, so the saved Vercel numbers were used.");
    logSet({
      stats: { vercelError: error instanceof Error ? error.message : String(error) },
    });
    return VERCEL_FALLBACK;
  }
}

async function getDatabuddyStats(): Promise<StatsPayload> {
  const apiKey = import.meta.env.DATABUDDY_API_KEY;
  const websiteId = import.meta.env.DATABUDDY_WEBSITE_ID;

  const cached = await getCachedJson<StatsPayload>(DATABUDDY_CACHE_KEY);
  if (cached) return cached;

  if (!apiKey || !websiteId) return { pageviews: 0, visitors: 0 };

  try {
    const stats = await fetchDatabuddyStats(apiKey, websiteId);
    setCachedJsonInBackground(DATABUDDY_CACHE_KEY, stats, CACHE_TTL_SECONDS);
    return stats;
  } catch (error) {
    // Databuddy is paused/unavailable: expected, so recorded as context rather than a warning.
    note("Databuddy could not be reached (it is paused), so only the Vercel Analytics numbers were used.");
    logSet({
      stats: { databuddyError: error instanceof Error ? error.message : String(error) },
    });
    return { pageviews: 0, visitors: 0 };
  }
}

export async function GET() {
  const [databuddy, vercel] = await Promise.all([getDatabuddyStats(), getVercelStats()]);

  return new Response(
    JSON.stringify({
      pageviews: databuddy.pageviews + vercel.pageviews,
      visitors: databuddy.visitors + vercel.visitors,
    }),
    { status: 200, headers: JSON_HEADERS }
  );
}
