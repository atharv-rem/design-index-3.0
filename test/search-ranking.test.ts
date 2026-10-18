// Run with: npm test
// Ranking with page data (keyword_page_summary), ported from design-index-scraper test/search-test.test.mjs.
// The scraper's MIN_PAGES is 20; the site uses 10, so a few page counts here differ from the originals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mainKeywords, rankTools, searchQuery, type IndexTool } from "../src/lib/search-engine.ts";
import { isRelevant } from "../src/lib/search.ts";

// words: { word: pages | [pages, best url, on homepage] }; typed: hand-typed keywords (no page row).
const tool = (
  primary_key: number, tool_name: string, category: string,
  { size = 0, words = {} as Record<string, number | [number, string, boolean?]>, typed = [] as string[], site = `https://t${primary_key}.com/` } = {},
): IndexTool => ({
  primary_key, tool_name, category, website: site, description: "", og_image_link: "",
  seo_keywords: [...typed, ...Object.keys(words)],
  pages: size
    ? {
        size,
        words: Object.fromEntries(Object.entries(words).map(([w, v]) => {
          const [pages, url, home] = typeof v === "number" ? [v, `${site}p/${w}`, false] : v;
          return [w, [pages, url, home ? 1 : 0]];
        })),
      }
    : null,
});
const order = (r: { primary_key: number }[]) => r.map((x) => x.primary_key);

test("a word on a few pages of a huge catalogue is a weak match and does not count", () => {
  const r = rankTools([
    // Mockup Cloud-like: 5,000 pages, every query word on a few of them
    tool(1, "Big Catalogue", "mockup", { size: 5020, words: { free: 3, svg: 3, icon: 4, library: 2 } }),
    // Css gg-like: an icon library, no "free"
    tool(2, "Icon Library", "icon", { size: 920, words: { svg: 400, icon: 480, library: 40 } }),
  ], ["free", "svg", "icon", "library"]);
  assert.equal(r[0].tool_name, "Icon Library");
  assert.equal(r[0].match_count, 3);
  assert.equal(r[1].match_count, 0);
  assert.deepEqual([...r[1].weak].sort(), ["free", "icon", "library", "svg"]);
});

test("strong: 10+ pages or 2% of the site; weak otherwise", () => {
  const r = rankTools([
    tool(1, "A", "ui", { size: 739, words: { carousel: 10 } }),   // Originkit: 10 of 739 pages
    tool(2, "B", "ui", { size: 5359, words: { carousel: 9 } }),   // 9 pages, 0.17%
    tool(3, "C", "ui", { size: 28, words: { carousel: 1 } }),     // 1 page, 3.6%
  ], ["carousel"]);
  const byId = Object.fromEntries(r.map((x) => [x.primary_key, x]));
  assert.equal(byId[1].match_count, 1);
  assert.equal(byId[2].match_count, 0);
  assert.equal(byId[3].match_count, 1);
  assert.equal(r.at(-1)!.primary_key, 2);
});

test("in the category the query names, rare style words still count (one page per icon)", () => {
  const tools = [
    tool(1, "Box icons", "icon", { size: 2008, words: { icon: 2000, line: 8 } }),
    tool(2, "Marketplace", "illustration", { size: 2450, words: { icon: 300, line: 150 } }),
  ];
  // without the category, "line" on 8 of 2,008 pages is weak
  assert.deepEqual(rankTools(tools, ["line", "icon"]).find((x) => x.primary_key === 1)!.weak, ["line"]);
  const r = rankTools(tools, ["line", "icon"], { categories: new Set(["icon"]) });
  assert.equal(r[0].tool_name, "Box icons");
  assert.equal(r[0].match_count, 2);
});

test("most strong words first; ties go to the tool the words matter most to, not the biggest (BM25)", () => {
  const tools = [
    tool(1, "T1", "ui", { size: 2135, words: { card: 20, cart: 5 } }),   // big library: cart on 5 of 2,135 pages
    tool(2, "T2", "ui", { size: 60, words: { card: 30, cart: 20 } }),    // focused shop kit
    tool(3, "T3", "ui", { size: 2000, words: { card: 2000 } }),          // one word only
    tool(4, "T4", "ui", { size: 50, words: { cart: 1 }, typed: ["card"] }),   // card typed by hand
  ];
  // 2 and 4 really match both words (card is 4's own; cart on 1 of 50 pages = 2%); the big library's
  // cart is weak, so it ranks with the one-word tools, ahead of tool 3 on relevance
  assert.deepEqual(order(rankTools(tools, ["card", "cart"])), [2, 4, 1, 3]);
});

test("a word on the homepage or typed by hand is a core word: strong, and at least 10 pages", () => {
  const brand = tool(1, "Brand Colors", "colour", {
    site: "https://brandcolors.net/", size: 601,
    words: { facebook: [1, "https://brandcolors.net/b/facebook"], color: [1, "https://brandcolors.net/", true] },
  });
  const big = tool(2, "Big UI", "ui", { site: "https://big.com/", size: 3023, words: { facebook: 3, color: 20 } });
  const r = rankTools([big, brand], ["facebook", "color"]);
  assert.deepEqual(r.map((x) => x.tool_name), ["Brand Colors", "Big UI"]);
  assert.deepEqual(r[0].weak, ["facebook"]);   // color is core (homepage); facebook 1 of 601 pages is weak
  // a hand-typed word (no page row) is strong even on a huge site
  const typed = rankTools([tool(3, "Huge", "ui", { size: 9000, words: { other: 9000 }, typed: ["dashboard"] })], ["dashboard"]);
  assert.equal(typed[0].match_count, 1);
});

test("partial matches follow the category of the tools that matched the most words", () => {
  const r = rankTools([
    tool(1, "UI kit A", "ui", { size: 10, words: { saa: 5, template: 5 } }),
    tool(2, "Colour tool", "colour", { size: 40, words: { template: 40 } }),
    tool(3, "UI kit B", "ui", { size: 10, words: { template: 2 } }),
  ], ["saa", "template"]);
  // the full match is a UI kit, so the UI partial match comes before the colour tool's, despite fewer pages
  assert.deepEqual(order(r), [1, 3, 2]);
});

test("a tool named by the query wins ties over relevance", () => {
  const r = rankTools([
    tool(1, "Mapcn", "ui", { site: "https://t1.com/", size: 50, words: { react: [1, "https://t1.com/", true] } }),
    tool(2, "React Bits", "ui", { size: 201, words: { react: [1, "https://t2.com/", true] } }),
  ], ["react"]);
  assert.equal(r[0].tool_name, "React Bits");
});

test("tools without page data: every word strong, relevance as 1 page of average size", () => {
  const plain = tool(1, "Icon Set", "icon", { typed: ["icon", "svg"] });
  const big = tool(2, "Big UI", "ui", { size: 5000, words: { icon: 3, svg: 3 } });
  const r = rankTools([big, plain], ["icon", "svg"]);
  assert.equal(r[0].tool_name, "Icon Set");
  assert.equal(r[0].match_count, 2);
  // never pushed down for missing data: same relevance as a tool with 1 page at the average size
  const one = rankTools([tool(3, "One", "ui", { size: 100, words: { hero: 1 } }), tool(4, "Plain", "ui", { typed: ["hero"] })], ["hero"]);
  const [withData, withoutData] = [one.find((x) => x.primary_key === 3)!, one.find((x) => x.primary_key === 4)!];
  assert.equal(withoutData.relevance, withData.relevance);
  assert.equal(withoutData.match_count, 1);   // and strong, while 1 of 100 pages is weak
  assert.equal(withData.match_count, 0);
  assert.equal(withoutData.matchedPage, null);
});

test("matchedPage: the best page of the strongest matched word", () => {
  const blocks = tool(301, "Shadcn Blocks", "ui", {
    site: "https://shadcnblocks.com", size: 5359,
    words: {
      pricing: [114, "https://www.shadcnblocks.com/block/pricing1"],
      table: [60, "https://www.shadcnblocks.com/block/table1"],
      icon: [3, "https://www.shadcnblocks.com/blocks/feature/icon-list"],
    },
  });
  const r = rankTools([blocks], ["pricing", "table"])[0];
  assert.deepEqual(r.matchedPage, { word: "pricing", url: "https://www.shadcnblocks.com/block/pricing1" });
  // a word of the tool's own name is a last resort: "shadcn blocks pricing" links the pricing block
  const named = tool(301, "Shadcn Blocks", "ui", {
    site: "https://shadcnblocks.com", size: 5359,
    words: { block: [3000, "https://www.shadcnblocks.com/blocks"], pricing: [114, "https://www.shadcnblocks.com/block/pricing1"] },
  });
  assert.equal(rankTools([named], ["shadcn", "block", "pricing"])[0].matchedPage!.word, "pricing");
  assert.equal(rankTools([named], ["block"])[0].matchedPage!.word, "block");
  // a strong word beats a weak one, even if the weak one is rarer
  const weakFirst = rankTools([blocks, tool(1, "X", "ui", { typed: ["table"] })], ["icon", "table"])[0];
  assert.equal(weakFirst.matchedPage!.word, "table");
});

test("matchedPage skips the homepage, and is null when only the homepage matched", () => {
  const t = tool(1, "Site", "ui", {
    site: "https://site.dev/", size: 100,
    words: { hero: [40, "https://www.site.dev"], footer: [3, "https://site.dev/blocks/footer"] },
  });
  assert.deepEqual(rankTools([t], ["hero", "footer"])[0].matchedPage, { word: "footer", url: "https://site.dev/blocks/footer" });
  assert.equal(rankTools([t], ["hero"])[0].matchedPage, null);
});

test("alternatives to X: X's hand-typed words, then the words on the most pages", () => {
  const x = tool(1, "React Bits", "ui", { size: 230, typed: ["animated"], words: { react: 230, card: 3, text: 90, background: 40 } });
  assert.deepEqual(mainKeywords(x), ["animated", "text", "background", "card"]);
  const r = searchQuery([x, tool(2, "Other", "ui", { size: 50, words: { text: 30 } })], "alternatives to react bits");
  assert.equal(r.similarTo, "React Bits");
  assert.deepEqual(order(r.results), [2]);
});

test("tabs: weak-only matches go to Similar; a category listing and a named tool to Relevant", () => {
  const base = { id: 1, tool_name: "", description: "", og_image_link: "" };
  assert.equal(isRelevant({ ...base, matchedKeywordsCount: 0, matched: ["icon"], weakMatches: ["icon"] }), false);
  assert.equal(isRelevant({ ...base, matchedKeywordsCount: 0, matched: [] }), true);
  assert.equal(isRelevant({ ...base, matchedKeywordsCount: 1, matched: ["x"], pinned: true }), true);
  assert.equal(isRelevant({ ...base, matchedKeywordsCount: 2, matched: ["x", "y"] }), true);
  assert.equal(isRelevant({ ...base, matchedKeywordsCount: 1, matched: ["x", "y"], weakMatches: ["y"] }), false);
});
