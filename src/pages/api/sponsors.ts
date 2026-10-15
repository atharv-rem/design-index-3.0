import type { APIRoute } from "astro";
import {
  SPONSORS_CACHE_KEY,
  SPONSORS_PAGE_TAG,
  getSponsors,
} from "@/lib/sponsors";
import { getCachedJson } from "@/lib/cache";
import { note } from "@/lib/logger";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const wasCached = Boolean(await getCachedJson(SPONSORS_CACHE_KEY));
  const sponsors = await getSponsors();

  locals.log.set({ sponsors: { count: sponsors.length } });
  note(`Sent ${sponsors.length} active sponsors.`);

  return Response.json(
    { sponsors },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=1800",
        "Vercel-Cache-Tag": SPONSORS_PAGE_TAG,
        "x-cache": wasCached ? "hit" : "miss",
      },
    },
  );
};
