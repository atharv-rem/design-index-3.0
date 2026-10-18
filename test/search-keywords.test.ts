// Run with: npm test
// Ported from design-index-scraper test/search-test.test.mjs and test/search-keywords.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractKeywords, QUERY_STOP, toSearchForms } from "../src/lib/search-keywords.ts";

// Queries and the words the site's old extractKeywords made from them (generated in the scraper repo).
const fixture = JSON.parse(readFileSync(new URL("./fixtures/search-extract-keywords.json", import.meta.url), "utf8"));

test("differs from the old search only by dropping stopwords and words an alias rewrote (all fixture queries)", () => {
  for (const { input, output } of fixture.pairs as { input: string; output: string[] }[]) {
    const fixed = extractKeywords(input);
    for (const w of output) {
      if (QUERY_STOP.has(w)) continue;   // never stored, so dropped from the query on purpose
      if (/sign|log|commerce|picker|three|mock|linked|next/.test(w)) continue;
      assert.ok(fixed.includes(w), `${input}: lost "${w}"`);
    }
  }
});

test("every old output word is also a stored form (toSearchForms) of the same input", () => {
  const missing = [];
  for (const { input, output } of fixture.pairs as { input: string; output: string[] }[]) {
    const stored = new Set(toSearchForms(input));
    for (const word of output) if (!stored.has(word)) missing.push(`${input} -> ${word}`);
  }
  assert.deepEqual(missing, []);
});

test("search forms match the scraper's (checkboxes, entries, glass, status)", () => {
  const cases = { checkboxes: ["checkboxe"], entries: ["entry"], glass: ["glas"], status: ["statu"] };
  for (const [input, expected] of Object.entries(cases)) assert.deepEqual(toSearchForms(input), expected, input);
});

test("QUERY_STOP is the same list as the scraper's patches/search-fixes.ts", () => {
  const patch = (
    "a above add all also amp an and any anything app application apps april are as at august author " +
    "authors be best blogs build building but by can categorie categories category chapter co com " +
    "component cookies could create creating december did do doc docs doe does en etc explore february " +
    "feed find finding for from generic get getting good guide guides had has have here home how htm " +
    "http https i im in index into io is it item its january json july june just lab labs legal license " +
    "licenses like look looking make making march may me might mock my need needs net new nor not " +
    "november october of on only onto or org our out over page pages per php please policy post posts " +
    "privacy rss see september should show single sitemap so socials some someone something sponsor " +
    "sponsored sponsors sponsorship sponsorships such tag tags term terms than that the then there these " +
    "thi this those to tool tools topic ui under up us use using very via vs want wants was we website " +
    "websites were what when where which who why will with would www xml you your"
  ).split(" ");
  assert.deepEqual([...QUERY_STOP].sort(), [...new Set(patch)].sort());
});

test("design verbs kept, aliases applied, filler dropped", () => {
  assert.deepEqual(extractKeywords("react"), ["react"]);   // the old search dropped it (not a noun)
  assert.ok(extractKeywords("hover effects").includes("hover"));
  for (const [q, word] of [["tilt card", "tilt"], ["mesh gradient", "mesh"], ["file upload", "file"], ["data table with sorting", "sorting"]])
    assert.ok(extractKeywords(q).includes(word), `${q} keeps ${word}`);
  assert.deepEqual(extractKeywords("e-commerce"), ["ecommerce"]);
  assert.deepEqual(extractKeywords("sign up form").sort(), ["form", "signup"]);
  assert.deepEqual(extractKeywords("sign in page"), ["login"]);   // "page" is never stored
  assert.deepEqual(extractKeywords("datepicker").sort(), ["date", "picker"]);
  assert.deepEqual(extractKeywords("three js"), ["threej"]);    // trailing-s rule, same as stored
  const k = extractKeywords("i need free react components for my startup website");
  for (const gone of ["for", "my", "i", "need"]) assert.ok(!k.includes(gone), gone);
  for (const kept of ["react", "startup", "free"]) assert.ok(k.includes(kept), kept);
  // "component" and "ui" are too general for UI libraries
  assert.deepEqual(extractKeywords("react components"), ["react"]);
  assert.deepEqual(extractKeywords("ui kit"), ["kit"]);
  for (const q of ["3d icons", "css grid", "faq section", "cta", "nav"]) assert.ok(extractKeywords(q).length >= 1, q);
});

test("joined tech names are split like stored words", () => {
  assert.deepEqual(extractKeywords("tailwindcss"), ["tailwind", "css"]);
  assert.deepEqual(extractKeywords("TailwindCSS components"), ["tailwind", "css"]);
  assert.deepEqual(extractKeywords("react.js"), ["react"]);
  assert.deepEqual(extractKeywords("vuejs"), ["vue"]);
  assert.deepEqual(extractKeywords("next.js"), ["nextj"]);
});

test("social and mcp are kept; social media becomes social; block words stay", () => {
  assert.deepEqual(extractKeywords("social media icons").sort(), ["icon", "social"]);
  assert.ok(extractKeywords("mcp server").includes("mcp"));
  for (const w of ["blog", "faq", "login", "search", "contact"]) assert.ok(extractKeywords(`${w} section`).includes(w), w);
});

test("a query of only general words has nothing to search", () => {
  assert.deepEqual(extractKeywords("best tools"), []);
  assert.deepEqual(extractKeywords("the best website for my app"), []);
});
