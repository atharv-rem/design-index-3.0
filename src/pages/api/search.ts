import type { APIRoute } from "astro";
import { logError, note } from "@/lib/logger";
import { rankTools, searchQuery, type RankedTool } from "@/lib/search-engine";
import { getSearchIndex } from "@/lib/search-index";

export const prerender = false;

const CACHE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
};

const toResult = (r: RankedTool) => ({
  id: r.primary_key,
  tool_name: r.tool_name,
  description: r.description,
  og_image_link: r.og_image_link,
  category: r.category,
  matchedKeywordsCount: r.match_count,
  matched: r.matched,
  weakMatches: r.weak,
  pinned: r.pinned,
  matchedPage: r.matchedPage,
});

// GET /api/search?q=<what the visitor typed>
//   -> { keywords, notes, categories, corrections, similarTo, websites, results }
//   The whole search runs here: keywords (aliases, stopwords), websites and tool names in the query,
//   "alternatives to X", category words, typo fallback, ranking. `notes` says in plain sentences what
//   was done ("Did you mean ...", "Showing colour tools like Coolors ..."). Each result has
//   matchedKeywordsCount (strong matches only), matched (all matched words), weakMatches, and
//   matchedPage: { word, url } for the tool's best page for its strongest word (null: none, or the homepage).
// GET /api/search?keywords=a,b,c  (older clients: words already extracted)
//   -> results only, as an array, ranked by matched words with the same deterministic tie-breaks.
export const GET: APIRoute = async ({ url, locals }) => {
  const { log } = locals;
  const query = url.searchParams.get("q");

  try {
    if (query !== null) {
      if (!query.trim()) {
        note("No search query was given, so nothing was searched.");
        return Response.json(
          { keywords: [], notes: ["Type what you are looking for, like \"svg icons\" or \"serif font\"."], categories: [], corrections: [], similarTo: null, websites: [], results: [] },
          { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } },
        );
      }

      const outcome = searchQuery(await getSearchIndex(), query.slice(0, 300));
      log.set({
        search: {
          words: outcome.keywords,
          matches: outcome.results.length,
          ...(outcome.categories.length && { categories: outcome.categories }),
          ...(outcome.corrections.length && { corrections: outcome.corrections.map((c) => `${c.from} -> ${c.to}`) }),
          ...(outcome.similarTo && { similarTo: outcome.similarTo }),
        },
      });
      note(`Searched for "${outcome.keywords.join(", ")}" and found ${outcome.results.length} tools.`);

      return Response.json({ ...outcome, results: outcome.results.map(toResult) }, { headers: CACHE_HEADERS });
    }

    const keywords = (url.searchParams.get("keywords") || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    log.set({ search: { words: keywords } });

    if (keywords.length === 0) {
      note("No search words were given, so nothing was searched.");
      return Response.json([], {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      });
    }

    const ranked = rankTools(await getSearchIndex(), keywords);
    log.set({ search: { matches: ranked.length } });
    note(`Searched for "${keywords.join(", ")}" and found ${ranked.length} tools.`);

    return Response.json(ranked.map(toResult), { headers: CACHE_HEADERS });
  } catch (err) {
    logError("The search failed: the tools could not be loaded or ranked.", err);

    return Response.json({ error: "Failed to search tools." }, { status: 500 });
  }
};
