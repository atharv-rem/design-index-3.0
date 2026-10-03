import { dangerouslyDeleteByTag } from "@vercel/functions";
import { getCachedJson, setCachedJson } from "@/lib/cache";
import { supabase } from "@/lib/supabase";

export type Sponsor = {
  id: number;
  name: string;
  description: string;
  og_image_link: string;
  website_url: string;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  /** Shown only in the homepage strip, never in grids or on tool pages. */
  homepage_only: boolean;
  /** Test rows: visible in `npm run dev` only. */
  development: boolean;
};

export type SponsorCard = Pick<
  Sponsor,
  "id" | "name" | "description" | "og_image_link" | "website_url" | "homepage_only"
>;

type SupabaseSponsorRow = Partial<Sponsor>;

export const SPONSORS_CACHE_KEY = "design-index:sponsors:active";
export const SPONSORS_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

const normalizeSponsor = (row: SupabaseSponsorRow): Sponsor => ({
  id: row.id ?? 0,
  name: row.name?.trim() || "Sponsor",
  description: row.description?.trim() || "",
  og_image_link: row.og_image_link || "",
  website_url: row.website_url || "",
  priority: row.priority ?? 0,
  starts_at: row.starts_at ?? null,
  ends_at: row.ends_at ?? null,
  homepage_only: row.homepage_only ?? false,
  development: row.development ?? false,
});

// Date windows are checked on read so an expired ad drops out of a cached payload.
const isLive = (sponsor: Sponsor, now = Date.now()) =>
  (import.meta.env.DEV || !sponsor.development) &&
  (!sponsor.starts_at || Date.parse(sponsor.starts_at) <= now) &&
  (!sponsor.ends_at || Date.parse(sponsor.ends_at) > now);

/** Reads all active sponsors from Supabase and overwrites the Redis copy. */
export async function refreshSponsors(): Promise<Sponsor[] | null> {
  const { data, error } = await supabase
    .from("sponsors")
    .select(
      "id, name, description, og_image_link, website_url, priority, starts_at, ends_at, homepage_only, development",
    )
    .eq("active", true)
    .order("priority", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    return null;
  }

  const sponsors = (data ?? [])
    .map(normalizeSponsor)
    .filter((sponsor) => sponsor.website_url);

  await setCachedJson(SPONSORS_CACHE_KEY, sponsors, SPONSORS_CACHE_TTL_SECONDS);

  return sponsors;
}

// Pages that render a sponsor carry this CDN tag (see Astro.cache.set({ tags })).
export const SPONSORS_PAGE_TAG = "sponsors";

/**
 * Drops every edge-cached page that shows a sponsor, so the next visit re-renders
 * from the refreshed Redis copy. Only works on Vercel; returns false elsewhere.
 */
export async function purgeSponsorPages(): Promise<boolean> {
  try {
    await dangerouslyDeleteByTag(SPONSORS_PAGE_TAG);
    return true;
  } catch (error) {
    console.error("[sponsors] Failed to purge cached pages:", error);
    return false;
  }
}

export async function getSponsors(): Promise<Sponsor[]> {
  const cached = await getCachedJson<Sponsor[]>(SPONSORS_CACHE_KEY);
  const sponsors = cached ?? (await refreshSponsors()) ?? [];

  return sponsors.filter((sponsor) => isLive(sponsor));
}

export async function getSponsorCards(): Promise<SponsorCard[]> {
  const sponsors = await getSponsors();

  return sponsors.map(
    ({ id, name, description, og_image_link, website_url, homepage_only }) => ({
      id,
      name,
      description,
      og_image_link,
      website_url,
      homepage_only,
    }),
  );
}
