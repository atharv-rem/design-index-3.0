// The whole search for one query, run on a snapshot of design_index + keyword_page_summary
// (see search-index.ts). A port of searchPreview / searchScraped in design-index-scraper
// src/search-test.mjs.
//
// Order of results:
//   1. a tool the query names: by its website ("reactbits.dev") or by its exact name ("React Bits"),
//   2. tools in the category the query names ("svg icons" -> icon tools first),
//   3. most STRONG matched words. A matched word is strong when the tool is really about it (see
//      isStrong); otherwise it is a weak match: it keeps the tool in the results and adds to relevance,
//      but does not count here (a UI library with "icon" on 3 of 5,000 pages does not match "icon"),
//   4. among tools matching fewer words than the best: the category of the tools that matched the most
//      ("saas template": the full matches are UI kits, so UI tools with "template" come before others),
//   5. tools whose name has the query's words ("react" -> React Bits),
//   6. relevance (BM25 over the matched words and their page counts),
//   7. primary key, so ties always come back in the same order.
import { applyQueryAliases, extractKeywords, QUERY_STOP, stripS, toSearchForms } from "./search-keywords.ts";

/** One keyword_page_summary row: [pages with the word, best page for it, 1 if on the homepage]. */
export type PageWord = [pages: number, bestUrl: string, onHomepage: 0 | 1];

export type IndexTool = {
  primary_key: number;
  tool_name: string;
  website: string;
  category: string;
  seo_keywords: string[];
  description: string;
  og_image_link: string;
  /** Page data from keyword_page_summary; null for tools whose scraped keywords are not live. */
  pages?: { size: number; words: Record<string, PageWord> } | null;
};

export type RankedTool = {
  primary_key: number;
  tool_name: string;
  description: string;
  og_image_link: string;
  category: string;
  /** Strong matched words: what the ranking counts. */
  match_count: number;
  /** All matched words, strong and weak. */
  matched: string[];
  weak: string[];
  pinned: boolean;
  relevance: number;
  /** The best page for the strongest matched word, when it is not the homepage. */
  matchedPage: { word: string; url: string } | null;
};

export type SearchOutcome = {
  keywords: string[];
  notes: string[];
  categories: string[];
  corrections: { from: string; to: string }[];
  similarTo: string | null;
  websites: { host: string; tool: string | null }[];
  results: RankedTool[];
};

export const RESULT_LIMIT = 50;

const CATEGORY_LABELS: Record<string, string> = {
  icon: "icon", mockup: "mockup", font: "font", illustration: "illustration", colour: "colour",
  ui: "UI", design_inspiration: "design inspiration", tool: "tool",
};
const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;

// ---- per-snapshot data: name words and the typo vocabulary, worked out once per snapshot ----

type Prepared = {
  tools: IndexTool[];
  keywords: Map<number, Set<string>>;
  names: Map<number, Set<string>>;
  vocabulary: Map<string, number>;   // every word some tool has -> how many tools have it
  avgSize: number;                   // average page count of the tools with page data
};
const prepared = new WeakMap<IndexTool[], Prepared>();

const squash = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// The tool's name in search form, camelCase split: "React bits" -> react, bit; "ShadcnBlocks" -> shadcn, block.
const nameWords = (name: string) => {
  const words = toSearchForms(String(name ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
  const joined = stripS(squash(name));
  if (joined.length >= 4 && /[a-z]/.test(joined)) words.push(joined);
  return new Set(words);
};

export function prepare(tools: IndexTool[]): Prepared {
  let p = prepared.get(tools);
  if (p) return p;
  p = { tools, keywords: new Map(), names: new Map(), vocabulary: new Map(), avgSize: 1 };
  let sizes = 0;
  let sized = 0;
  for (const t of tools) {
    const own = new Set(t.seo_keywords ?? []);
    const names = nameWords(t.tool_name);
    p.keywords.set(t.primary_key, own);
    p.names.set(t.primary_key, names);
    for (const w of new Set([...own, ...names])) p.vocabulary.set(w, (p.vocabulary.get(w) ?? 0) + 1);
    if (t.pages) {
      sizes += t.pages.size;
      sized += 1;
    }
  }
  p.avgSize = sized ? sizes / sized : 1;
  prepared.set(tools, p);
  return p;
}

// ---- ranking ----

// BM25, the standard search-engine score, as in the scraper. For each matched word:
//   rarity(word) x pages x (K1 + 1) / (pages + K1 x (1 - B + B x tool pages / average tool pages))
// More pages with the word count more, with diminishing returns; a big site needs more pages for the same
// score; rare words count more than common ones. B = 0.5 (the scraper uses 0.75): at 0.75, 2 carousel
// pages on a 28-page site beat Originkit's 10 of 739; at 0.5 Originkit comes first.
export const K1 = 1.2;
export const B = 0.5;
// A core word (on the homepage, typed by hand, or in the tool's name) counts as at least this many pages.
export const CORE_PAGES = 10;
// A word on at least MIN_PAGES pages, or on MIN_SHARE of the site's pages, is a strong match. (The
// scraper uses 20 pages; 10 keeps Originkit's 10 carousel pages, of 739, a "carousel" match.)
export const MIN_PAGES = 10;
export const MIN_SHARE = 0.02;

const bare = (u: string) => String(u ?? "").toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
const homeAddresses = (website: string) => {
  try {
    return new Set([bare(website), bare(new URL(website).origin)]);
  } catch {
    return new Set([bare(website)]);
  }
};

export function rankTools(
  tools: IndexTool[],
  keywords: string[],
  { categories = new Set<string>(), pinned = new Set<number>(), exclude = new Set<number>(), limit = RESULT_LIMIT } = {},
): RankedTool[] {
  const p = prepare(tools);
  const wanted = new Set(keywords);
  const searched = tools.filter((t) => !exclude.has(t.primary_key));
  // rarity over the tools searched: how many of them have each query word
  const df = new Map(keywords.map((k) => [k, searched.filter((t) => p.keywords.get(t.primary_key)!.has(k)).length]));
  const rarity = (w: string) => Math.log(1 + (searched.length - df.get(w)! + 0.5) / (df.get(w)! + 0.5));

  const rows = [];
  for (const t of searched) {
    const matched = [...p.keywords.get(t.primary_key)!].filter((w) => wanted.has(w));
    const isPinned = pinned.has(t.primary_key);
    // a query that is only a category word ("ui", "icons") lists that category
    const listCategory = !keywords.length && categories.has(t.category);
    if (!matched.length && !isPinned && !listCategory) continue;
    const names = p.names.get(t.primary_key)!;
    const inCategory = categories.has(t.category);
    const data = t.pages;
    // tools without page data count as average size, so missing data never pushes them down
    const norm = K1 * (1 - B + B * (data ? data.size : p.avgSize) / p.avgSize);
    const home = homeAddresses(t.website);

    const words = matched.map((w) => {
      const row = data?.words[w];
      // On a tool with page data, a keyword without a page row was typed by hand: a core word.
      const core = Boolean(data) && (!row || row[2] === 1 || names.has(w));
      const strong = !data || inCategory || core || row![0] >= MIN_PAGES || row![0] / data.size >= MIN_SHARE;
      // Tools without page data: every word counts as 1 page.
      const n = data ? Math.max(row?.[0] ?? 0, core ? CORE_PAGES : 0) : 1;
      const score = rarity(w) * (n * (K1 + 1)) / (n + norm);
      const url = row && !home.has(bare(row[1])) ? row[1] : null;
      return { word: w, strong, score, url, own: names.has(w) };
    });

    // The deep link: the strongest matched word whose best page is not the homepage. Words of the tool's
    // own name come last ("shadcn blocks pricing" links Shadcn Blocks' pricing block, not its /blocks).
    const linked = words.filter((x) => x.url)
      .sort((a, b) => Number(a.own) - Number(b.own) || Number(b.strong) - Number(a.strong) || b.score - a.score)[0];
    rows.push({
      tool: t,
      matched,
      weak: words.filter((x) => !x.strong).map((x) => x.word),
      matchCount: words.filter((x) => x.strong).length,
      pinned: isPinned ? 1 : 0,
      inCategory: inCategory ? 1 : 0,
      affinity: 0,
      nameHits: keywords.filter((w) => names.has(w)).length,
      relevance: words.reduce((sum, x) => sum + x.score, 0),
      matchedPage: linked ? { word: linked.word, url: linked.url! } : null,
    });
  }

  // partial matches follow the category of the tools that matched the most words
  const best = Math.max(0, ...rows.map((r) => r.matchCount));
  const top = rows.filter((r) => r.matchCount === best);
  const share = (cat: string) => top.filter((r) => r.tool.category === cat).length / Math.max(1, top.length);
  for (const r of rows) r.affinity = r.matchCount === best ? 1 : share(r.tool.category);

  rows.sort((a, b) => b.pinned - a.pinned || b.inCategory - a.inCategory || b.matchCount - a.matchCount
    || b.affinity - a.affinity || b.nameHits - a.nameHits || b.relevance - a.relevance
    || a.tool.primary_key - b.tool.primary_key);
  return rows.slice(0, limit).map((r) => ({
    primary_key: r.tool.primary_key,
    tool_name: r.tool.tool_name || "Untitled Tool",
    description: r.tool.description || "",
    og_image_link: r.tool.og_image_link || "",
    category: r.tool.category,
    match_count: r.matchCount,
    matched: r.matched,
    weak: r.weak,
    pinned: r.pinned === 1,
    relevance: Math.round(r.relevance * 1000) / 1000,
    matchedPage: r.matchedPage,
  }));
}

// ---- what a person or an agent types, before the keywords ----

// Web addresses and domains ("https://ui.shadcn.com", "reactbits.dev"); not file names (next.js, style.css).
const URL_RE = /(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+([a-z]{2,24}))(?::\d+)?(?:[/?#]\S*)?/gi;
const NOT_TLD = new Set(["js", "ts", "jsx", "tsx", "css", "scss", "json", "md", "mjs", "html", "htm", "svg", "png", "jpg"]);
export function splitAddresses(text: string) {
  const hosts: string[] = [];
  const rest = text.replace(URL_RE, (all, host: string, tld: string) => {
    if (NOT_TLD.has(tld.toLowerCase())) return all;
    hosts.push(host.toLowerCase());
    // keep the name part as words: ui.shadcn.com -> "ui shadcn", reactbits.dev -> "reactbits"
    return " " + host.toLowerCase().split(".").slice(0, -1).filter((p) => p !== "www").join(" ") + " ";
  });
  return { hosts, rest };
}
const hostOf = (u: string) => {
  try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
};

// "alternatives to coolors", "tools like shadcn", "similar to react bits", "instead of X", "vs X"
const ALT_RE = /\b(?:alternatives?\s+(?:to|for)|similar\s+(?:tools?\s+)?to|(?:tools?|sites?|apps?|librar(?:y|ies)|websites?)\s+like|instead\s+of|competitors?\s+(?:of|to)|like|vs\.?|versus)\s+(.+)$/i;

// The tool a query names: its name written any way ("React Bits", "reactbits"), its domain name
// ("coolors"), or its website. Only an exact, single match counts ("shadcn" names several tools).
export function findNamedTool(tools: IndexTool[], text: string, hosts: string[] = []): IndexTool | null {
  const want = squash(text);
  const hits = tools.filter((t) => {
    const host = hostOf(t.website);
    return (want && (squash(t.tool_name) === want || squash(host.split(".")[0]) === want))
      || hosts.some((h) => h.replace(/^www\./, "") === host);
  });
  return hits.length === 1 ? hits[0] : null;
}

// A tool's main keywords, for "alternatives to X": the ones typed by hand, then the ones on the most pages
// (without page data: its keywords in stored order), without its own name and words a query never searches.
export function mainKeywords(tool: IndexTool, n = 12) {
  const own = nameWords(tool.tool_name);
  const words = tool.pages?.words;
  const pages = (w: string) => (words?.[w] ? words[w][0] : Infinity);   // typed by hand: no row, first
  const ordered = words ? [...(tool.seo_keywords ?? [])].sort((a, b) => pages(b) - pages(a)) : tool.seo_keywords ?? [];
  return [...new Set(ordered)]
    .filter((w) => !own.has(w) && !own.has(stripS(w)) && !QUERY_STOP.has(w))   // "bits" of React Bits too
    .slice(0, n);
}

// Category words in a query. "command palette" is a UI part, not a colour palette.
const CATEGORY_WORDS: Record<string, string> = {
  icon: "icon", mockup: "mockup", font: "font", typeface: "font", typography: "font", illustration: "illustration",
  color: "colour", colour: "colour", palette: "colour", swatch: "colour",
  ui: "ui", component: "ui", inspiration: "design_inspiration",
  // people looking for real sites to learn from: "portfolio websites examples", "onboarding screens"
  example: "design_inspiration", website: "design_inspiration", showcase: "design_inspiration", screen: "design_inspiration",
};
export function queryCategories(text: string) {
  const clean = String(text).toLowerCase().replace(/\bcommand\s+palettes?\b/g, "command");
  // the words as typed too: "website(s)" is a stopword, so it never reaches the keywords
  const words = [...toSearchForms(clean), ...clean.split(/[^a-z0-9]+/).filter(Boolean)];
  return new Set(words.map((w) => CATEGORY_WORDS[w] ?? CATEGORY_WORDS[stripS(w)]).filter(Boolean));
}

// ---- typo fallback ----

// Edit distance, with two neighbouring letters swapped counting as 1. Stops early above `max`.
export function editDistance(a: string, b: string, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// A query word no tool has becomes the closest word some tool has: 1 letter off, 2 for words of 7+ letters,
// same first and last letter (a different ending is usually a different word form, not a typo:
// "compressor" is not "compressed"). The word more tools have wins a tie.
export function correctTypos(keywords: string[], vocabulary: Map<string, number>) {
  const corrections: { from: string; to: string }[] = [];
  const out = keywords.map((k) => {
    if (vocabulary.has(k) || k.length < 4 || /\d/.test(k)) return k;
    const max = k.length >= 7 ? 2 : 1;
    let best: { w: string; dist: number; df: number } | null = null;
    for (const [w, df] of vocabulary) {
      if (w[0] !== k[0] || w.at(-1) !== k.at(-1)) continue;
      const dist = editDistance(k, w, max);
      if (dist <= max && (!best || dist < best.dist || (dist === best.dist && df > best.df))) best = { w, dist, df };
    }
    if (!best) return k;
    corrections.push({ from: k, to: best.w });
    return best.w;
  });
  return { keywords: [...new Set(out)], corrections };
}

// ---- the whole search ----

export function searchQuery(tools: IndexTool[], query: string): SearchOutcome {
  const notes: string[] = [];
  let text = applyQueryAliases(String(query ?? "").trim());
  const { hosts, rest } = splitAddresses(text);
  text = rest;

  const pinned = new Set<number>();
  const websites: SearchOutcome["websites"] = [];
  for (const h of hosts) {
    const t = findNamedTool(tools, "", [h]);
    websites.push({ host: h, tool: t?.tool_name ?? null });
    if (t) {
      pinned.add(t.primary_key);
      notes.push(`${h} is the website of ${t.tool_name}, so it is listed first.`);
    } else {
      notes.push(`No tool in the index has the website ${h}.`);
    }
  }

  let exclude = new Set<number>();
  let categories: Set<string>;
  let keywords: string[];
  const alt = text.match(ALT_RE);
  const target = alt ? findNamedTool(tools, alt[1]) : null;
  if (target) {
    keywords = mainKeywords(target);
    exclude = new Set([target.primary_key]);
    categories = new Set([target.category]);
    notes.push(`Showing ${categoryLabel(target.category)} tools like ${target.tool_name}, found by its main keywords.`);
  } else {
    keywords = extractKeywords(text);
    categories = queryCategories(text);
    if (alt) notes.push(`"${alt[1].trim()}" is not a tool in the index, so its words were searched instead.`);
    // a query that is exactly one tool's name ("React Bits", "reactbits") lists that tool first
    if (!alt && !hosts.length && squash(text).length >= 4) {
      const named = tools.filter((t) => squash(t.tool_name) === squash(text));
      if (named.length === 1) pinned.add(named[0].primary_key);
    }
  }

  const p = prepare(tools);
  const fixed = correctTypos(keywords, p.vocabulary);
  keywords = fixed.keywords;
  if (fixed.corrections.length) {
    notes.push(`Did you mean ${fixed.corrections.map((c) => `"${c.to}" (not "${c.from}")`).join(", ")}? Showing results for that.`);
  }
  if (categories.size && !target) {
    notes.push(`${[...categories].map(categoryLabel).join(" and ")} tools are listed first.`);
  }

  let results = rankTools(tools, keywords, { categories, pinned, exclude });
  // alternatives to X come from X's category only: "alternatives to mobbin" must not answer with UI kits
  // and colour tools just because they share a word like "web"
  if (target) {
    results = results.filter((r) => r.category === target.category);
    if (!results.length) notes.push(`There are no other ${categoryLabel(target.category)} tools to compare with ${target.tool_name}.`);
  }
  if (!keywords.length && !categories.size && !pinned.size) {
    notes.push("Nothing in the query can be searched: words like \"best\", \"tools\" or \"website\" are too general. Try what the tool is for, like \"svg icons\" or \"serif font\".");
  }

  return {
    keywords,
    notes,
    categories: [...categories],
    corrections: fixed.corrections,
    similarTo: target?.tool_name ?? null,
    websites,
    results,
  };
}
