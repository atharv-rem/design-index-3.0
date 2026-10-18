import type { ToolResult } from "@/zustand_store/useSearchStore";

// The search itself runs on the server (/api/search, see search-engine.ts): keywords, typo fallback,
// websites and tool names in the query, "alternatives to X", category words, ranking.

export type SearchResponse = {
  results: ToolResult[];
  /** What the search did, in plain sentences ("Did you mean ...", "Showing colour tools like Coolors ..."). */
  notes: string[];
};

/**
 * Runs the same search the home page uses. Resolves to no results (and a note) when nothing in the
 * query can be searched, and throws when the request fails.
 */
export async function searchTools(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  const trimmed = query.trim();

  if (!trimmed) {
    return { results: [], notes: [] };
  }

  const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal });

  if (!res.ok) {
    throw new Error("Search request failed");
  }

  const data = await res.json();
  return { results: data.results ?? [], notes: data.notes ?? [] };
}

/**
 * The "Relevant" tab: tools matching more than one word strongly, a tool the query names (by website or
 * name), and tools listed for a category word alone ("ui", "icons"), which match no word. "Similar":
 * one strong word, or only weak matches.
 */
export const isRelevant = (item: ToolResult) =>
  Boolean(item.pinned) || item.matchedKeywordsCount > 1 || (item.matched?.length ?? 0) === 0;
