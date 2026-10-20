// Read-only check of the search against the real database: keywords, notes and top 5 for each query.
// Run with: node --env-file=.env scripts/search-check.ts ["another query" ...]
import { createClient } from "@supabase/supabase-js";
import { searchQuery, type IndexTool } from "../src/lib/search-engine.ts";

const QUERIES = [
  "react components", "pricing table", "carousel", "blog", "dashboard", "animated button", "color palette",
  "svg icons", "free icons", "serif font", "iphone mockup", "3d illustrations",
  "free svg icon library", "alternatives to react bits", "shadcn blocks pricing", "text animation",
];

const supabase = createClient(process.env.SUPABASE_URL!, (process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_KEY)!);

const readAll = async (table: string, columns: string, order: string[]) => {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(columns);
    for (const column of order) q = q.order(column);
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
};

// the same data as src/lib/search-index.ts
const [toolRows, pageRows] = await Promise.all([
  readAll("design_index", "primary_key, tool_name, website, category, seo_keywords, description, og_image_link", ["primary_key"]),
  readAll("keyword_page_summary", "primary_key, word, pages, best_url, on_homepage, tool_pages", ["primary_key", "word"]),
]);
const pages = new Map<number, NonNullable<IndexTool["pages"]>>();
for (const r of pageRows) {
  if (!pages.has(r.primary_key)) pages.set(r.primary_key, { size: Math.max(1, r.tool_pages), words: {} });
  pages.get(r.primary_key)!.words[r.word.toLowerCase()] = [r.pages, r.best_url, r.on_homepage ? 1 : 0];
}
const tools: IndexTool[] = toolRows.map((r) => ({
  ...r,
  seo_keywords: (r.seo_keywords ?? []).map((k: string) => k.toLowerCase()),
  pages: pages.get(r.primary_key) ?? null,
}));
console.log(`${tools.length} tools, ${pageRows.length} page rows for ${pages.size} tools`);

for (const q of process.argv.length > 2 ? process.argv.slice(2) : QUERIES) {
  const r = searchQuery(tools, q);
  console.log(`\n"${q}"  keywords: [${r.keywords.join(", ")}]  (${r.results.length} results)`);
  for (const n of r.notes) console.log(`  note: ${n}`);
  r.results.slice(0, 5).forEach((x, i) => {
    const strong = x.matched.filter((w) => !x.weak.includes(w));
    const words = [strong.join(", "), x.weak.length ? `weak: ${x.weak.join(", ")}` : ""].filter(Boolean).join("; ");
    console.log(`  ${i + 1}. ${x.tool_name} (${x.category}) ${x.pinned ? "pinned " : ""}strong ${x.match_count} [${words}] rel ${x.relevance}`);
    console.log(`     matchedPage: ${x.matchedPage ? `${x.matchedPage.word} -> ${x.matchedPage.url}` : "-"}`);
  });
}
