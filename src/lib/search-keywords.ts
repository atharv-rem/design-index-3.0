// Turns a search query into the words stored in design_index.seo_keywords.
//
// The stored keywords are made by the scraper (design-index-scraper src/search-keywords.mjs, toSearchForms),
// so a query must be turned into words exactly the same way, or they never match. This file is a port of
// toSearchForms + extractKeywordsFixed (also in the scraper's patches/search-fixes.ts). If you change the
// aliases or the stopwords here, make the same change in the scraper.
//
// Runs on the server (/api/search): the Wink model is ~1 MB, so browsers no longer download it.
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { BLOCK_WORDS, QUERY_KEEP, STOP_WORDS } from "./word-lists.ts";

let nlpInstance: any = null;

function getNLP() {
  if (!nlpInstance) nlpInstance = winkNLP(model);
  return { nlp: nlpInstance, its: nlpInstance.its };
}

const KEEP_POS = ["NOUN", "ADJ", "PROPN"];

// The site's original customStopwords; toSearchForms drops them too.
export const SEARCH_STOPWORDS = [
  "want", "need", "use", "get", "have", "make", "find", "see", "create", "show", "add", "help", "look",
  "tool", "tools", "website", "websites", "app", "apps", "best", "good",
];

// The last step on both sides: cut a trailing "s" from words longer than 3 letters.
export const stripS = (k: string) => (k.endsWith("s") && k.length > 3 ? k.slice(0, -1) : k);

// Every word in its search form: nouns, adjectives and proper nouns get their dictionary form, other words
// stay as typed (before, only nouns and adjectives were kept, so react, hover, tilt, mesh were lost).
export function toSearchForms(text: string): string[] {
  const { nlp, its } = getNLP();
  const words: string[] = [];
  nlp.readDoc(text).tokens().each((token: any) => {
    const type = token.out(its.type);
    if (type !== "word" && type !== "number" && type !== "alpha_numeric") return;
    words.push(KEEP_POS.includes(token.out(its.pos)) ? token.out(its.lemma) : token.out(its.normal));
  });
  const main = words.filter(
    (word) => word.length > 1 && /[a-z]/i.test(word) && !SEARCH_STOPWORDS.includes(word.toLowerCase()),
  );
  // short terms and terms with digits (3d, ai, ui, h1) even when Wink drops them
  const regexFallback = text.toLowerCase().match(/\b[\da-z\-]{2,}\b/g) || [];
  const extra = regexFallback.filter((w) => /\d/.test(w) || w.length <= 3);
  return [...new Set([...main, ...extra].map((k) => stripS(k.toLowerCase())))];
}

// Applied to the query before anything else. The scraper stores words with the same aliases (ALIASES in
// its dryrun.mjs), so both sides end up with one spelling.
export const QUERY_ALIASES: [RegExp, (match: string, ...groups: string[]) => string][] = [
  [/\bmock[\s_-]*(ups?)\b/gi, (_, up) => `mock${up.toLowerCase()}`],
  [/\blinked[\s_-]*in\b/gi, () => "linkedin"],
  [/\bnext[\s._-]*js\b/gi, () => "nextjs"],
  [/\bthree[\s._-]*js\b/gi, () => "threejs"],
  [/\be[\s_-]*commerce\b/gi, () => "ecommerce"],
  [/\bsign[\s_-]*up\b/gi, () => "signup"],
  [/\b(?:sign|log)[\s_-]*in\b/gi, () => "login"],
  [/\bdate[\s_-]?picker\b/gi, () => "date picker"],
  [/\btailwind[\s_-]?css\b/gi, () => "tailwind css"],
  [/\breact[\s._-]?js\b/gi, () => "react"],
  [/\bvue[\s._-]?js\b/gi, () => "vue"],
  [/\bsocial[\s_-]*medias?\b/gi, () => "social"],
  [/\bcalender\b/gi, () => "calendar"],
  [/\blibary\b/gi, () => "library"],
  [/\bdistorsion\b/gi, () => "distortion"],
];
export const applyQueryAliases = (text: string) =>
  QUERY_ALIASES.reduce((t, [re, rep]) => t.replace(re, rep), text);

// Filler and the words people use to ask ("i need", "looking for", "where can i find"), plus "component"
// and "ui": too general for UI libraries (stoplisted there), so in a query they only hit hand-typed keywords.
export const QUERY_FILLER = `a an and or but nor for to of in on at by as is be it its my me we us our you your can i im with
from not all any how why who what which where when this that these those are was were has had do does did the so than then
into onto about over under just very also only such per via vs etc out up some something anything someone there here
need needs want wants looking look find finding get getting use using make making build building create creating show
would could should will may might please like application
component ui`.split(/\s+/);

// Words dropped from a query: never stored, so they can never match. The scraper's stoplist minus the UI
// block words it does store (login, blog, faq, search, ...), plus the filler above, in search form.
const BLOCKS = new Set(BLOCK_WORDS);
export const QUERY_STOP = new Set(
  [...STOP_WORDS.filter((w) => !BLOCKS.has(w)), ...QUERY_FILLER].flatMap((w) => [w, stripS(w)]),
);
for (const w of BLOCK_WORDS) QUERY_STOP.delete(stripS(w));
for (const w of QUERY_KEEP) QUERY_STOP.delete(w);

/** A query in the words stored in seo_keywords: aliases, every word in search form, stopwords dropped. */
export function extractKeywords(text: string): string[] {
  text = applyQueryAliases(String(text)).toLowerCase();
  try {
    return toSearchForms(text).filter((k) => !QUERY_STOP.has(k));
  } catch (err) {
    console.error("Keyword extraction error:", err);
    return text.replace(/[^\w\s-]/g, "").split(/\s+/).filter((w) => w.length > 1 && !QUERY_STOP.has(w));
  }
}
