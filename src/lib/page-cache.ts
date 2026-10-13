import { dangerouslyDeleteByTag } from "@vercel/functions";

// Tags for edge-cached pages built from `design_index` rows (see Astro.cache.set({ tags })).
// Redis holds the data, these tags hold the rendered HTML; both must be cleared on a change.

/**
 * Edge cache lifetime for SSR pages. Data changes purge pages by tag, so a stale copy can be
 * served for a long time while it revalidates in the background; `maxAge` only bounds changes
 * nothing purges (a sponsor's date window opening or closing).
 */
export const PAGE_CACHE = { maxAge: 60 * 60 * 24, swr: 60 * 60 * 24 * 30 };

/** On every page built from tool rows, so one purge clears them all. */
export const TOOL_DATA_TAG = "tool-data";

/** A tool's own detail page, including a cached 404 for an id that did not exist yet. */
export const toolTag = (id: number) => `tool-${id}`;

/** The category list page, plus the detail pages of that category (they embed suggestions). */
export const categoryTag = (category: string) => `category-${category}`;

/** Pages showing the "recently added" list (the homepage). */
export const RECENT_TOOLS_TAG = "recent-tools";

/**
 * Deletes every edge-cached page carrying one of `tags`, so the next visit re-renders.
 * Run after the Redis copy is cleared, or the re-render would re-cache the old rows.
 * Only works on Vercel; returns false elsewhere or on failure.
 */
export async function purgePageTags(tags: string[]): Promise<boolean> {
  if (!tags.length) {
    return true;
  }

  try {
    await dangerouslyDeleteByTag(tags);
    return true;
  } catch (error) {
    console.error(`[page-cache] Failed to purge ${tags.join(", ")}:`, error);
    return false;
  }
}
