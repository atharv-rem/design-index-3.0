// Run with: npm test
// Ported from the agent-query tests in design-index-scraper test/search-test.test.mjs, on tools shaped
// like production rows (seo_keywords only, no page counts).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  correctTypos, editDistance, queryCategories, rankTools, searchQuery, splitAddresses, type IndexTool,
} from "../src/lib/search-engine.ts";

const tool = (primary_key: number, tool_name: string, category: string, website: string, seo_keywords: string[]): IndexTool =>
  ({ primary_key, tool_name, category, website, seo_keywords, description: "", og_image_link: "" });

const tools = () => [
  tool(1, "React Bits", "ui", "https://reactbits.dev/", ["animation", "text", "background", "react"]),
  tool(2, "Be ui", "ui", "https://beui.dev/", ["animation", "text", "button", "react"]),
  tool(3, "Color Hunt", "colour", "https://colorhunt.co/", ["palette", "color", "pastel"]),
  tool(4, "Coolors", "colour", "https://coolors.co/", ["palette", "color", "generator", "coolor"]),
  tool(5, "Icon Set", "icon", "https://icons.example/", ["icon", "svg", "free"]),
  tool(6, "Shadcn Blocks", "ui", "https://shadcnblocks.com/", ["block", "carousel", "dashboard", "free", "icon", "svg"]),
  tool(7, "Godly", "design_inspiration", "https://godly.website/", ["inspiration"]),
];
const names = (r: { results: { tool_name: string }[] }) => r.results.map((x) => x.tool_name);

test("category words put that category first among tools with the same match count", () => {
  // Shadcn Blocks (ui, 6 keywords) ties with Icon Set on free + svg + icon; the icon tool comes first
  const r = searchQuery(tools(), "free svg icons");
  assert.deepEqual(names(r).slice(0, 2), ["Icon Set", "Shadcn Blocks"]);
  assert.deepEqual(r.categories, ["icon"]);
  // the same without the category boost would be table order: Icon Set (5) still before 6, so flip ids
  const flipped = tools().map((t) => (t.primary_key === 5 ? { ...t, primary_key: 60 } : t));
  assert.equal(names(searchQuery(flipped, "free svg icons"))[0], "Icon Set");
});

test("the category the query names beats more matched words from a big UI library", () => {
  // production: a UI library with ~106 keywords has "free" and "icon"; an icon library may only have "icon"
  const big = [tool(1, "Big UI", "ui", "https://big.dev/", ["free", "icon", "svg", "card"]), tool(2, "Line Icons", "icon", "https://li.dev/", ["icon"])];
  assert.deepEqual(names(searchQuery(big, "free icons")), ["Line Icons", "Big UI"]);
  // without a category word, more matched words still win
  const r = rankTools(tools(), ["free", "svg", "carousel"]);
  assert.equal(r[0].tool_name, "Shadcn Blocks");
  // and within the category, more matched words still win
  const icons = [tool(1, "A", "icon", "https://a.dev/", ["icon"]), tool(2, "B", "icon", "https://b.dev/", ["icon", "svg"])];
  assert.deepEqual(names(searchQuery(icons, "svg icons")), ["B", "A"]);
});

test("'similar to X' leaves X's own name words out of the searched words", () => {
  const r = searchQuery(tools().map((t) => (t.primary_key === 1 ? { ...t, seo_keywords: ["react", "bits", "bit", "animation"] } : t)), "similar to react bits");
  assert.deepEqual(r.keywords, ["animation"]);
});

test("a query that is only a category word lists that category", () => {
  const r = searchQuery(tools(), "ui");
  assert.deepEqual(r.keywords, []);
  assert.deepEqual(r.results.map((x) => x.category), ["ui", "ui", "ui"]);
  assert.deepEqual(r.results.map((x) => x.primary_key), [1, 2, 6]);
  assert.deepEqual(searchQuery(tools(), "icons").results.map((x) => x.tool_name).includes("Icon Set"), true);
});

test("command palette is a UI part, not a colour palette; inspiration searches need no 'inspiration'", () => {
  assert.deepEqual([...queryCategories("command palette")], []);
  for (const q of ["best portfolio websites examples", "onboarding screens", "pricing page examples", "dark mode websites", "landing page showcase"])
    assert.ok(queryCategories(q).has("design_inspiration"), q);
  assert.deepEqual([...queryCategories("image gallery")], []);
  assert.deepEqual([...queryCategories("color palette")], ["colour"]);
});

test("a web address or domain lists the tool with that website first", () => {
  for (const q of ["reactbits.dev", "https://reactbits.dev/text-animations", "www.reactbits.dev"]) {
    const r = searchQuery(tools(), q);
    assert.equal(r.results[0].tool_name, "React Bits", q);
    assert.equal(r.results[0].pinned, true, q);
    assert.deepEqual(r.websites, [{ host: "reactbits.dev", tool: "React Bits" }], q);
    assert.match(r.notes.join(" "), /reactbits\.dev is the website of React Bits/);
  }
  // a tool with no keyword match is still returned when its website is named
  assert.equal(searchQuery(tools(), "godly.website").results[0].tool_name, "Godly");
  assert.match(searchQuery(tools(), "nothere.dev").notes.join(" "), /No tool in the index has the website nothere\.dev/);
  // next.js / three.js / style.css are not web addresses
  assert.deepEqual(splitAddresses("style.css next.js").hosts, []);
});

test("alternatives to X: X's main keywords, X left out, only X's category, with a note", () => {
  for (const q of ["alternatives to coolors", "tools like Coolors", "similar to coolors", "alternatives for coolors.co"]) {
    const r = searchQuery(tools(), q);
    assert.equal(r.similarTo, "Coolors", q);
    assert.deepEqual(names(r), ["Color Hunt"], q);
    assert.match(r.notes.join(" "), /colour tools like Coolors/);
  }
  // "similar to react bits": the name written with a space
  const rb = searchQuery(tools(), "similar to react bits");
  assert.equal(rb.similarTo, "React Bits");
  assert.ok(!names(rb).includes("React Bits"));
  assert.ok(rb.results.every((x) => x.category === "ui"));
  assert.equal(names(rb)[0], "Be ui");
  // not one single tool: the words are searched, and it says so
  const topic = searchQuery(tools(), "tools like shadcn");
  assert.equal(topic.similarTo, null);
  assert.match(topic.notes.join(" "), /"shadcn" is not a tool in the index/);
  // no other tool in X's category
  const none = searchQuery(tools(), "alternatives to godly");
  assert.deepEqual(none.results, []);
  assert.match(none.notes.join(" "), /no other design inspiration tools to compare with Godly/);
});

test("a tool's name finds it, written any way; name words win ties", () => {
  for (const q of ["React Bits", "reactbits", "react bits"]) assert.equal(names(searchQuery(tools(), q))[0], "React Bits", q);
  // "react": React Bits and Be ui both have the word; the name decides, not the table order
  const flipped = [tool(1, "Be ui", "ui", "https://beui.dev/", ["react"]), tool(2, "React Bits", "ui", "https://reactbits.dev/", ["react"])];
  assert.deepEqual(names(searchQuery(flipped, "react")), ["React Bits", "Be ui"]);
});

test("typos become the closest word some tool has, with a 'did you mean' note", () => {
  assert.equal(editDistance("dashbaord", "dashboard"), 1);
  const r = searchQuery(tools(), "carousal dashbaord");
  assert.deepEqual([...r.keywords].sort(), ["carousel", "dashboard"]);
  assert.deepEqual(r.corrections, [{ from: "carousal", to: "carousel" }, { from: "dashbaord", to: "dashboard" }]);
  assert.match(r.notes.join(" "), /Did you mean "carousel" \(not "carousal"\), "dashboard" \(not "dashbaord"\)/);
  assert.equal(r.results[0].tool_name, "Shadcn Blocks");
  // words some tool has are never "corrected"
  assert.deepEqual(searchQuery(tools(), "coolors").keywords, ["coolor"]);
});

test("typos keep their first and last letter: real words not in the index stay as typed", () => {
  const vocab = new Map([["compressed", 3], ["optimized", 2], ["carousel", 5], ["dashboard", 4], ["palette", 9]]);
  const r = correctTypos(["compressor", "optimizer", "carousal", "dashbaord", "pallete"], vocab);
  assert.deepEqual(r.corrections.map((c) => c.from), ["carousal", "dashbaord", "pallete"]);
  assert.ok(r.keywords.includes("compressor") && r.keywords.includes("optimizer"));
});

test("nothing searchable: no results and a clear note", () => {
  const r = searchQuery(tools(), "best tools");
  assert.deepEqual(r.results, []);
  assert.match(r.notes.join(" "), /Nothing in the query can be searched/);
});

test("ties are deterministic: same match count -> category, name, then primary key", () => {
  const same = [9, 3, 7, 1].map((pk) => tool(pk, `T${pk}`, "ui", `https://t${pk}.com/`, ["hero"]));
  const first = rankTools(same, ["hero"]).map((r) => r.primary_key);
  assert.deepEqual(first, [1, 3, 7, 9]);
  assert.deepEqual(rankTools([...same].reverse(), ["hero"]).map((r) => r.primary_key), first);
});

test("results stop at 50, after ranking (not before, like search_tools)", () => {
  const many = Array.from({ length: 80 }, (_, i) => tool(i + 1, `T${i + 1}`, i < 70 ? "ui" : "icon", `https://t${i}.com/`, ["icon"]));
  const r = searchQuery(many, "icons");
  assert.equal(r.results.length, 50);
  assert.ok(r.results.slice(0, 10).every((x) => x.category === "icon"));   // ids 71-80, past the first 50 rows
});
