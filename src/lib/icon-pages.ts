// Data layer for the programmatic icon SEO pages:
//   /alternatives/{slug}  (e.g. "Best Lucide Alternatives")
//   /best/{slug}          (e.g. "Best Animated Icon Libraries")
//
// Which pages exist, and which tools appear on each, comes from
// src/data/icon_articles.json. Tool details are read (read-only) from the
// `design_index` table at build time. Nothing here writes to Supabase.

import articlesJson from "@/data/icon_articles.json";
import { supabase } from "@/lib/supabase";

export const SITE_URL = "https://designindex.xyz";
export const PAGE_YEAR = new Date().getFullYear();

// Shown in the article header. The date is a fixed publish date, not the build date.
export const ARTICLE_AUTHOR = "Atharv Remeshan";
export const ARTICLE_PUBLISHED = { iso: "2026-10-03", label: "03.10.2026" };

const MAX_TITLE_LENGTH = 59; // "under 60 chars"
const META_MIN = 140;
const META_MAX = 155;
const MIN_ALTERNATIVES = 3;

// --- Types ------------------------------------------------------------------

type ArticleTool = { primary_key: number; tool_name: string; slug: string };

type AlternativesArticle = {
  priority: number;
  slug: string;
  title: string;
  target_tool: string;
  target_in_db: boolean;
  target_primary_key: number | null;
  alternatives: ArticleTool[];
};

type RoundupArticle = {
  slug: string;
  title: string;
  selection_rule: string | null;
  tools: ArticleTool[];
};

export type IconTool = {
  id: number;
  name: string;
  pricing: { free: boolean; paid: boolean };
  website: string | null;
  description: string | null;
  ogImage: string | null;
  detailHref: string;
  /** Path of "Best {name} alternatives", when that page exists. */
  alternativesPath: string | null;
  /** Articles this tool is part of, shown as pills under its card. */
  articles: ArticleLink[];
  openSource: boolean;
  bestFor: string | null;
};

export type ArticleIcon =
  | "alternatives"
  | "free"
  | "open-source"
  | "animated"
  | "3d"
  | "premium"
  | "download"
  | "logos"
  | "hand-drawn"
  | "niche";

export type ArticleLink = { href: string; label: string; icon: ArticleIcon };

export type Faq = { question: string; answer: string };
export type PageLink = { href: string; label: string };

export type AlternativesPage = {
  kind: "alternatives";
  /** Article number shown in the header, e.g. "A03". */
  code: string;
  slug: string;
  path: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  targetName: string;
  targetTool: IconTool | null;
  intro: string[];
  alternatives: IconTool[];
  faqs: Faq[];
  related: PageLink[];
  roundup: PageLink;
};

export type RoundupPage = {
  kind: "roundup";
  /** Article number shown in the header, e.g. "B02". */
  code: string;
  slug: string;
  path: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  intro: string[];
  tools: IconTool[];
  related: PageLink[];
};

export type IconPages = {
  alternatives: AlternativesPage[];
  roundups: RoundupPage[];
  /** Tools left out of generated pages because the database has no copy for them. */
  skippedTools: { id: number; name: string }[];
  /** Pages dropped because too little data resolved. */
  skippedPages: string[];
};

export type CompareRow = {
  id: number;
  name: string;
  href: string;
  pricing: string;
  website: string | null;
  hostname: string | null;
  bestFor: string | null;
  alternativesHref: string | null;
};

export const buildCompareRows = (tools: IconTool[]): CompareRow[] =>
  tools.map((tool) => {
    let hostname: string | null = null;
    try {
      hostname = tool.website ? new URL(tool.website).hostname.replace(/^www\./, "") : null;
    } catch {
      hostname = null;
    }

    return {
      id: tool.id,
      name: tool.name,
      href: tool.detailHref,
      pricing: tool.pricing.free && tool.pricing.paid ? "Free + paid" : tool.pricing.paid ? "Paid" : "Free",
      website: tool.website,
      hostname,
      bestFor: tool.bestFor,
      alternativesHref: tool.alternativesPath,
    };
  });

// --- Display names ----------------------------------------------------------

// Display-only cleanup. Database rows are never modified.
const NAME_MAP: Record<string, string> = {
  "hero icons": "Heroicons",
  "Box icons": "Boxicons",
  "Google icons": "Google Material Icons",
  "Remix Icons": "Remix Icon",
  "Css gg": "css.gg",
  "Lord icon": "Lordicon",
};

// Tools that are logo or emoji collections, not general icon libraries. They
// only appear on the pages where the JSON plan puts them on purpose.
const MISCATEGORISED_IDS = new Set([122, 366, 132]);

// Targets that are not in the table. Only facts that are verified (see the
// page brief) or derived from other database rows may be used here.
const STATIC_TARGETS: Record<string, { intro: string[]; reasonFree: boolean }> = {
  "font-awesome-alternatives": {
    intro: [
      "Font Awesome holds about 91.3% share among icon libraries on the web (wmtips.com, 2026).",
    ],
    reasonFree: true,
  },
  "ionicons-alternatives": {
    intro: [
      "Ionicons holds about 3.2% share among icon libraries on the web (wmtips.com, 2026).",
    ],
    reasonFree: true,
  },
  "feather-icons-alternatives": {
    intro: [
      "Feather Icons is the open-source icon set that Lucide, which is listed on Design Index, was forked from.",
    ],
    reasonFree: true,
  },
};

// Verified facts that can be added to a target's intro, by primary key.
const VERIFIED_FACTS: Record<number, string> = {
  117: "It ships six weights: Thin, Light, Regular, Bold, Fill and Duotone.",
  282: "It ships outline and solid variants.",
};

// Most relevant roundup for a target tool; anything else falls back to the free list.
const ROUNDUP_BY_TARGET: Record<number, string> = {
  113: "best-animated-icon-libraries",
  135: "best-animated-icon-libraries",
  118: "best-animated-icon-libraries",
  97: "best-3d-icon-packs",
  134: "best-3d-icon-packs",
  120: "best-premium-icon-sets",
  115: "best-premium-icon-sets",
  276: "best-premium-icon-sets",
  104: "best-icon-download-sites",
  133: "best-icon-download-sites",
  121: "best-icon-download-sites",
  122: "best-svg-logo-collections",
  114: "best-open-source-icon-libraries",
  124: "best-open-source-icon-libraries",
  282: "best-open-source-icon-libraries",
  99: "best-open-source-icon-libraries",
  128: "best-open-source-icon-libraries",
  108: "best-open-source-icon-libraries",
  100: "best-open-source-icon-libraries",
  103: "best-open-source-icon-libraries",
};
const DEFAULT_ROUNDUP = "best-free-icon-libraries";

// Short pill label and icon for each roundup.
const ROUNDUP_PILLS: Record<string, { label: string; icon: ArticleIcon }> = {
  "best-free-icon-libraries": { label: "Free icon libraries", icon: "free" },
  "best-open-source-icon-libraries": { label: "Open-source icons", icon: "open-source" },
  "best-animated-icon-libraries": { label: "Animated icons", icon: "animated" },
  "best-3d-icon-packs": { label: "3D icon packs", icon: "3d" },
  "best-premium-icon-sets": { label: "Premium icon sets", icon: "premium" },
  "best-icon-download-sites": { label: "Icon download sites", icon: "download" },
  "best-svg-logo-collections": { label: "SVG logo collections", icon: "logos" },
  "best-pixel-and-hand-drawn-icons": { label: "Pixel & hand-drawn", icon: "hand-drawn" },
  "best-niche-icon-sets": { label: "Niche icon sets", icon: "niche" },
};

// --- Small helpers ----------------------------------------------------------

export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

const clean = (value: string | null | undefined) => {
  const text = (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,;:\s]+$/, "");
  return text || null;
};

const stripEndPunctuation = (text: string) => text.replace(/[.!?]+$/, "");

const parsePricing = (value: string | null | undefined) => {
  const parts = (value ?? "")
    .toLowerCase()
    .split(",")
    .map((part) => part.trim());
  return { free: parts.includes("free"), paid: parts.includes("paid") };
};

const BEST_FOR_RULES: [RegExp, string][] = [
  [/animat|lottie/i, "Animated icons"],
  [/\b3d\b|3d-|isometric/i, "3D icons"],
  [/pixel/i, "Pixel art"],
  [/hand[- ]?(crafted|drawn)|handcrafted/i, "Hand-crafted icons"],
  [/emoji/i, "Emoji"],
  [/logo/i, "Brand logos"],
  [/figma/i, "Figma workflows"],
  [/react/i, "React projects"],
];

const deriveBestFor = (text: string) => {
  const matches = BEST_FOR_RULES.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  return matches.length ? matches.slice(0, 2).join(", ") : null;
};

const joinNames = (names: string[]) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const pluralise = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

/** First candidate within [min, max]; otherwise the closest one, trimmed at a word boundary. */
const fitLength = (candidates: string[], min: number, max: number) => {
  const fitting = candidates.find((text) => text.length >= min && text.length <= max);
  if (fitting) return fitting;

  const closest = [...candidates].sort(
    (a, b) => Math.abs(a.length - (min + max) / 2) - Math.abs(b.length - (min + max) / 2),
  )[0];

  if (closest.length <= max) return closest;

  const cut = closest.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
};

const pricingSuffix = (tools: IconTool[]) => {
  const hasFree = tools.some((tool) => tool.pricing.free);
  const hasPaid = tools.some((tool) => tool.pricing.paid);
  return hasFree && hasPaid ? "Free & Paid" : hasPaid ? "Paid" : "Free";
};

const buildSeoTitle = (title: string, count: number, tools: IconTool[]) => {
  // Long titles can carry a trailing parenthetical ("... (Health, Futuristic, ...)"); drop it as a last resort.
  const short = title.replace(/\s*\([^)]*\)\s*$/, "") || title;

  return (
    [
      `${title} (${PAGE_YEAR}): ${count} ${pricingSuffix(tools)} Options`,
      `${title} (${PAGE_YEAR}): ${count} Options`,
      `${title} (${PAGE_YEAR})`,
      title,
      `${short} (${PAGE_YEAR}): ${count} Options`,
      short,
    ].find((candidate) => candidate.length <= MAX_TITLE_LENGTH) ?? short
  );
};

// --- Database loading -------------------------------------------------------

type IconRow = {
  primary_key: number;
  tool_name: string | null;
  pricing: string | null;
  website: string | null;
  description: string | null;
  extended_description: string | null;
  og_image_link: string | null;
  seo_keywords: string[] | null;
};

const toIconTool = (row: IconRow): IconTool | null => {
  const dbName = clean(row.tool_name);
  const description = clean(row.description) ?? clean(row.extended_description);

  // No copy in the database: leave the tool out until it has a description.
  if (!dbName || !description) return null;

  const searchable = [row.description, row.extended_description, ...(row.seo_keywords ?? [])]
    .filter(Boolean)
    .join(" ");

  return {
    id: row.primary_key,
    name: NAME_MAP[dbName] ?? dbName,
    pricing: parsePricing(row.pricing),
    website: clean(row.website),
    description,
    ogImage: clean(row.og_image_link),
    detailHref: `/${row.primary_key}/${encodeURIComponent(dbName)}`,
    alternativesPath: null,
    articles: [],
    openSource: /open.?source|\bMIT\b|\bCC0\b|open-licensed/i.test(searchable),
    bestFor: deriveBestFor(searchable),
  };
};

let toolsPromise: Promise<{ tools: Map<number, IconTool>; skipped: { id: number; name: string }[] }> | undefined;

const loadIconTools = () => {
  toolsPromise ??= (async () => {
    const { data, error } = await supabase
      .from("design_index")
      .select(
        "primary_key, tool_name, pricing, website, description, extended_description, og_image_link, seo_keywords",
      )
      .eq("category", "icon");

    if (error) {
      throw new Error(`Failed to load icon tools from Supabase: ${error.message}`);
    }

    const tools = new Map<number, IconTool>();
    const skipped: { id: number; name: string }[] = [];

    for (const row of (data ?? []) as IconRow[]) {
      const tool = toIconTool(row);
      if (tool) {
        tools.set(tool.id, tool);
      } else {
        skipped.push({ id: row.primary_key, name: row.tool_name ?? `#${row.primary_key}` });
      }
    }

    return { tools, skipped };
  })().catch((error) => {
    toolsPromise = undefined;
    throw error;
  });

  return toolsPromise;
};

// --- Copy builders ----------------------------------------------------------

const pricingPhrase = (tool: IconTool) =>
  tool.pricing.free && tool.pricing.paid
    ? "with free and paid options"
    : tool.pricing.paid
      ? "listed as paid"
      : "listed as free";

const buildAlternativesIntro = (
  article: AlternativesArticle,
  target: IconTool | null,
  count: number,
  reasonFree: boolean,
) => {
  const intro: string[] = [];

  if (target) {
    const description = stripEndPunctuation(target.description ?? "");
    intro.push(
      `${article.target_tool} is an icon library on Design Index, ${pricingPhrase(target)}. Its listing describes it as “${description}”.`,
    );
    const fact = article.target_primary_key ? VERIFIED_FACTS[article.target_primary_key] : undefined;
    if (fact) intro.push(fact);
  } else {
    intro.push(...(STATIC_TARGETS[article.slug]?.intro ?? []));
  }

  const paidTarget = target ? target.pricing.paid : !reasonFree;
  intro.push(
    paidTarget
      ? `People usually look for an alternative to ${article.target_tool} when they want different pricing or licensing. Here are ${count} icon libraries from Design Index to compare.`
      : `People usually look for an alternative to ${article.target_tool} when they want a different visual style or a larger catalogue. Here are ${count} icon libraries from Design Index to compare.`,
  );

  return intro;
};

const buildAlternativesMeta = (article: AlternativesArticle, alternatives: IconTool[]) => {
  const target = article.target_tool;
  const [a, b, c] = alternatives.map((tool) => tool.name);
  const n = alternatives.length;

  return fitLength(
    [
      `Looking for a ${target} alternative? Compare ${a}, ${b} and ${c} on pricing, with links and what each is best for. ${n} options reviewed.`,
      `Looking for a ${target} alternative? Compare ${n} icon libraries including ${a}, ${b} and ${c}, with pricing, links and what each one is best for.`,
      `Looking for a ${target} alternative? See ${n} options like ${a}, ${b} and ${c}, with pricing and links to each icon library on Design Index.`,
      `Compare the best ${target} alternatives on Design Index: ${a}, ${b}, ${c} and more, with pricing, descriptions and direct links to every icon library.`,
    ],
    META_MIN,
    META_MAX,
  );
};

const buildFaqs = (article: AlternativesArticle, target: IconTool | null, alternatives: IconTool[]): Faq[] => {
  const faqs: Faq[] = [];
  const name = article.target_tool;

  if (target) {
    const price =
      target.pricing.free && target.pricing.paid
        ? `${name} has both free and paid options on Design Index.`
        : target.pricing.paid
          ? `Design Index lists ${name} as a paid icon library.`
          : `Yes, Design Index lists ${name} as free.`;
    faqs.push({ question: `Is ${name} free?`, answer: price });
  } else {
    const free = alternatives.filter((tool) => tool.pricing.free).map((tool) => tool.name);
    if (free.length) {
      faqs.push({
        question: `Which ${name} alternatives are free?`,
        answer: `Design Index lists ${joinNames(free)} as free or with a free option.`,
      });
    }
  }

  const first = alternatives[0];
  faqs.push({
    question: `What is the best alternative to ${name}?`,
    answer: `It depends on what you need, so compare them on this page. Design Index lists ${first.name} first: ${stripEndPunctuation(first.description ?? "")}. Other options include ${joinNames(alternatives.slice(1, 4).map((tool) => tool.name))}.`,
  });

  const openSource = alternatives.filter((tool) => tool.openSource).map((tool) => tool.name);
  if (openSource.length) {
    faqs.push({
      question: `Which ${name} alternatives are open source?`,
      answer: `According to their Design Index listings, ${joinNames(openSource)} ${openSource.length === 1 ? "is" : "are"} open source or openly licensed.`,
    });
  }

  return faqs;
};

const buildRoundupIntro = (tools: IconTool[]) => {
  const free = tools.filter((tool) => tool.pricing.free).length;
  const paid = tools.filter((tool) => tool.pricing.paid).length;
  const bits = [`${free} offer${free === 1 ? "s" : ""} a free option`];
  if (paid) bits.push(`${paid} offer${paid === 1 ? "s" : ""} paid plans`);

  return [
    `These ${tools.length} icon libraries are all listed on Design Index. ${bits.join(" and ")}.`,
    "Each entry links to the official site, and to a list of alternatives where we have one.",
  ];
};

const buildRoundupMeta = (title: string, tools: IconTool[]) => {
  const [a, b, c] = tools.map((tool) => tool.name);
  const n = tools.length;
  const examples = n >= 3 ? `${a}, ${b} and ${c}` : joinNames(tools.map((tool) => tool.name));

  return fitLength(
    [
      `${title}: ${n} picks including ${examples}, with pricing, descriptions and links to each one. Browse the full list on Design Index.`,
      `${title}. Compare ${n} icon libraries such as ${examples}, with pricing and direct links, curated on Design Index to help you choose faster.`,
      `${title}: see ${n} options like ${examples}, with pricing and links. Curated by Design Index so you can compare and choose the right icons quickly.`,
    ],
    META_MIN,
    META_MAX,
  );
};

// --- Page assembly ----------------------------------------------------------

let pagesPromise: Promise<IconPages> | undefined;

// The loaded data is reused for a few minutes, then re-read from Supabase, so a warm
// serverless instance never serves stale data for long. A failed load is not remembered.
const MEMO_TTL_MS = 5 * 60 * 1000;
let loadedAt = 0;

export const getIconPages = () => {
  if (pagesPromise && Date.now() - loadedAt > MEMO_TTL_MS) {
    pagesPromise = undefined;
    toolsPromise = undefined;
  }

  if (!pagesPromise) {
    loadedAt = Date.now();
    pagesPromise = buildPages().catch((error) => {
      pagesPromise = undefined;
      toolsPromise = undefined;
      throw error;
    });
  }

  return pagesPromise;
};

const buildPages = async (): Promise<IconPages> => {
  const { tools, skipped } = await loadIconTools();
  const alternativesArticles = articlesJson.alternatives_articles as AlternativesArticle[];
  const roundupArticles = articlesJson.roundup_articles as RoundupArticle[];

  const skippedPages: string[] = [];
  const skippedToolIds = new Set(skipped.map((tool) => tool.id));

  // First pass: resolve tools so related links only point at pages that exist.
  const resolved = alternativesArticles.flatMap((article) => {
    const alternatives = article.alternatives.flatMap((entry) => {
      const tool = tools.get(entry.primary_key);
      if (!tool && !skippedToolIds.has(entry.primary_key)) {
        console.warn(`[icon-pages] primary_key ${entry.primary_key} (${entry.tool_name}) not found in design_index`);
      }
      return tool ? [tool] : [];
    });

    const target = article.target_primary_key ? (tools.get(article.target_primary_key) ?? null) : null;

    if (article.target_in_db && !target) {
      skippedPages.push(`${article.slug} (target ${article.target_tool} missing or has no description)`);
      return [];
    }

    if (alternatives.length < MIN_ALTERNATIVES) {
      skippedPages.push(`${article.slug} (only ${alternatives.length} alternatives resolved)`);
      return [];
    }

    return [{ article, target, alternatives }];
  });

  // Every tool that has its own alternatives page links to it from cards and roundups.
  for (const { article } of resolved) {
    const tool = article.target_primary_key ? tools.get(article.target_primary_key) : undefined;
    if (tool) tool.alternativesPath = `/alternatives/${article.slug}`;
  }

  const roundupTitle = new Map(roundupArticles.map((article) => [article.slug, article.title]));

  const alternatives: AlternativesPage[] = resolved.map(({ article, target, alternatives: tools }) => {
    const alternativeIds = new Set(tools.map((tool) => tool.id));

    // Siblings that share the most alternatives are the most relevant to link to.
    const related = resolved
      .filter(({ article: other }) => other.slug !== article.slug)
      .map(({ article: other, alternatives: otherTools }) => ({
        slug: other.slug,
        label: `${other.target_tool} alternatives`,
        score:
          otherTools.filter((tool) => alternativeIds.has(tool.id)).length +
          (other.target_primary_key && alternativeIds.has(other.target_primary_key) ? 3 : 0),
        priority: other.priority,
      }))
      .sort((x, y) => y.score - x.score || x.priority - y.priority)
      .slice(0, 4)
      .map(({ slug, label }) => ({ href: `/alternatives/${slug}`, label }));

    const roundupSlug =
      (article.target_primary_key && ROUNDUP_BY_TARGET[article.target_primary_key]) || DEFAULT_ROUNDUP;
    const reasonFree = STATIC_TARGETS[article.slug]?.reasonFree ?? true;

    return {
      kind: "alternatives",
      code: `A${String(article.priority).padStart(2, "0")}`,
      slug: article.slug,
      path: `/alternatives/${article.slug}`,
      title: article.title,
      seoTitle: buildSeoTitle(article.title, tools.length, tools),
      metaDescription: buildAlternativesMeta(article, tools),
      targetName: article.target_tool,
      targetTool: target,
      intro: buildAlternativesIntro(article, target, tools.length, reasonFree),
      alternatives: tools,
      faqs: buildFaqs(article, target, tools),
      related,
      roundup: { href: `/best/${roundupSlug}`, label: roundupTitle.get(roundupSlug) ?? "Best icon libraries" },
    };
  });

  // Roundups. "Best free" is built from the data, not the JSON.
  const popularityOrder = new Map(resolved.map(({ article }, index) => [article.target_primary_key, index]));

  const roundups: RoundupPage[] = [];

  for (const article of roundupArticles) {
    let list: IconTool[];

    if (article.selection_rule) {
      list = [...tools.values()]
        .filter((tool) => tool.pricing.free && !MISCATEGORISED_IDS.has(tool.id))
        .sort((a, b) => {
          const aRank = popularityOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bRank = popularityOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return aRank - bRank || Number(a.pricing.paid) - Number(b.pricing.paid) || a.id - b.id;
        });
    } else {
      list = article.tools.flatMap((entry) => {
        const tool = tools.get(entry.primary_key);
        return tool ? [tool] : [];
      });
    }

    if (list.length < 2) {
      skippedPages.push(`${article.slug} (only ${list.length} tools resolved)`);
      continue;
    }

    roundups.push({
      kind: "roundup",
      code: `B${String(roundupArticles.indexOf(article) + 1).padStart(2, "0")}`,
      slug: article.slug,
      path: `/best/${article.slug}`,
      title: article.title,
      seoTitle: buildSeoTitle(article.title, list.length, list),
      metaDescription: buildRoundupMeta(article.title, list),
      intro: buildRoundupIntro(list),
      tools: list,
      related: [],
    });
  }

  for (const page of roundups) {
    page.related = roundups
      .filter((other) => other.slug !== page.slug)
      .slice(0, 4)
      .map((other) => ({ href: other.path, label: other.title }));
  }

  // Article links per tool: its own alternatives page first, then every roundup it is part of.
  for (const tool of tools.values()) {
    if (tool.alternativesPath) {
      tool.articles.push({ href: tool.alternativesPath, label: `${tool.name} alternatives`, icon: "alternatives" });
    }
  }

  for (const page of roundups) {
    const pill = ROUNDUP_PILLS[page.slug];
    if (!pill) continue;

    for (const tool of page.tools) {
      tool.articles.push({ href: page.path, label: pill.label, icon: pill.icon });
    }
  }

  if (skippedPages.length) console.warn(`[icon-pages] skipped pages: ${skippedPages.join("; ")}`);
  if (skipped.length) {
    console.warn(`[icon-pages] tools without copy left out: ${skipped.map((tool) => `${tool.name} (${tool.id})`).join(", ")}`);
  }

  return { alternatives, roundups, skippedTools: skipped, skippedPages };
};

/** Sync lookup from the JSON plan, for places that cannot await the database (tool pages, sitemap). */
export const ALTERNATIVES_SLUG_BY_TOOL_ID: ReadonlyMap<number, string> = new Map(
  (articlesJson.alternatives_articles as AlternativesArticle[]).flatMap((article) =>
    article.target_primary_key ? [[article.target_primary_key, article.slug] as const] : [],
  ),
);

export const ALL_PAGE_PATHS: string[] = [
  "/alternatives",
  "/best",
  ...(articlesJson.alternatives_articles as AlternativesArticle[]).map((article) => `/alternatives/${article.slug}`),
  ...(articlesJson.roundup_articles as RoundupArticle[]).map((article) => `/best/${article.slug}`),
];
