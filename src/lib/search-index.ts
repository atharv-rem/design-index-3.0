import { getCachedJson, setCachedJsonInBackground } from "@/lib/cache";
import { timed } from "@/lib/logger";
import type { IndexTool, PageWord } from "@/lib/search-engine";
import { supabase } from "@/lib/supabase";

// Every tool's search columns (design_index) with its page data (keyword_page_summary). The search ranks
// all of them in the app: the search_tools RPC stops at 50 rows before ties are broken, and with ~106
// keywords per UI tool a common word ("icon", "free") already matches more than 50 tools.
//
// Cached in Redis in chunks: the page data is ~10,000 rows now and grows with every category, and one
// Redis value should stay well under Upstash's request size limit. SEARCH_INDEX_CACHE_KEY holds the list
// of chunk keys; the database webhook deletes it, and the chunks then expire on their own.
export const SEARCH_INDEX_CACHE_KEY = "design-index:search:index";
const CACHE_TTL_SECONDS = 60 * 60;
const MEMORY_TTL_MS = 5 * 60 * 1000;   // a warm server instance skips Redis for this long
const CHUNK_BYTES = 400_000;
const PAGE_SIZE = 1000;

type Manifest = { chunks: string[] };

let memory: { tools: IndexTool[]; at: number } | null = null;

// Reads a whole table in pages of PAGE_SIZE rows, in parallel.
const readAll = async <T>(table: string, columns: string, order: string[], what: string): Promise<T[]> => {
  const { count, error } = await timed("db", `${what} (count)`, () =>
    supabase.from(table).select("*", { count: "exact", head: true }),
  );
  if (error) throw new Error(error.message);
  const pages = Math.ceil((count ?? 0) / PAGE_SIZE) || 1;
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      timed("db", what, () => {
        let q = supabase.from(table).select(columns);
        for (const column of order) q = q.order(column);
        return q.range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1);
      }),
    ),
  );
  const rows: T[] = [];
  for (const { data, error: pageError } of results) {
    if (pageError) throw new Error(pageError.message);
    rows.push(...((data ?? []) as T[]));
  }
  return rows;
};

const fromDatabase = async (): Promise<IndexTool[]> => {
  const [toolRows, pageRows] = await Promise.all([
    readAll<any>("design_index", "primary_key, tool_name, website, category, seo_keywords, description, og_image_link", ["primary_key"], "the search index"),
    readAll<any>("keyword_page_summary", "primary_key, word, pages, best_url, on_homepage, tool_pages", ["primary_key", "word"], "the search page data"),
  ]);

  const pages = new Map<number, NonNullable<IndexTool["pages"]>>();
  for (const r of pageRows) {
    const pk = Number(r.primary_key);
    let tool = pages.get(pk);
    if (!tool) pages.set(pk, (tool = { size: Math.max(1, Number(r.tool_pages) || 1), words: {} }));
    tool.words[String(r.word).toLowerCase()] = [Number(r.pages) || 0, r.best_url ?? "", r.on_homepage ? 1 : 0] as PageWord;
  }

  return toolRows.map((row) => ({
    primary_key: Number(row.primary_key),
    tool_name: row.tool_name ?? "",
    website: row.website ?? "",
    category: row.category ?? "",
    seo_keywords: (row.seo_keywords ?? []).map((k: string) => String(k).toLowerCase()),
    description: row.description ?? "",
    og_image_link: row.og_image_link ?? "",
    pages: pages.get(Number(row.primary_key)) ?? null,
  }));
};

// Groups tools into chunks of about CHUNK_BYTES of JSON each.
const toChunks = (tools: IndexTool[]) => {
  const chunks: IndexTool[][] = [[]];
  let bytes = 0;
  for (const t of tools) {
    const size = JSON.stringify(t).length;
    if (bytes + size > CHUNK_BYTES && chunks.at(-1)!.length) {
      chunks.push([]);
      bytes = 0;
    }
    chunks.at(-1)!.push(t);
    bytes += size;
  }
  return chunks;
};

const fromCache = async (): Promise<IndexTool[] | null> => {
  const manifest = await getCachedJson<Manifest>(SEARCH_INDEX_CACHE_KEY);
  if (!manifest?.chunks?.length) return null;
  const chunks = await Promise.all(manifest.chunks.map((key) => getCachedJson<IndexTool[]>(key)));
  // a chunk expired or failed: rebuild the whole index rather than search part of it
  if (chunks.some((c) => !c)) return null;
  return chunks.flat() as IndexTool[];
};

const saveToCache = (tools: IndexTool[]) => {
  // a fresh name per save, so a reader never mixes chunks from two saves
  const version = Date.now().toString(36);
  const chunks = toChunks(tools);
  const keys = chunks.map((_, i) => `${SEARCH_INDEX_CACHE_KEY}:${version}:${i}`);
  chunks.forEach((chunk, i) => setCachedJsonInBackground(keys[i], chunk, CACHE_TTL_SECONDS));
  // chunks live a minute longer than the list of them, so the list never points at expired chunks
  setCachedJsonInBackground<Manifest>(SEARCH_INDEX_CACHE_KEY, { chunks: keys }, CACHE_TTL_SECONDS - 60);
};

/** All tools with the columns and page data the search needs. Throws when the database cannot be read. */
export async function getSearchIndex(): Promise<IndexTool[]> {
  if (memory && Date.now() - memory.at < MEMORY_TTL_MS) return memory.tools;

  let tools = await fromCache();
  if (!tools?.length) {
    tools = await fromDatabase();
    saveToCache(tools);
  }
  // Same array object while it is fresh, so the engine's per-snapshot work (name words, vocabulary) is reused.
  memory = { tools, at: Date.now() };
  return tools;
}
