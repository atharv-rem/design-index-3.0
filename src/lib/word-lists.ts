// Word lists shared with the scraper (design-index-scraper src/word-lists.mjs), which stores the keywords
// this search looks for. Copied verbatim: if a list changes here, change it in the scraper too (and the
// other way round), or stored words and query words stop matching.

// Never stored as keywords, in any category: site furniture, file and web words, months, filler.
export const STOP_WORDS = `generic topic above explore january february march april may june july august september october november december
mock up single chapter item doc docs guide guides lab labs changelog license licenses about blog blogs post posts socials social privacy policy terms contact login signin signup register
careers career sponsor sponsors sponsorship sponsorships sponsored cookie cookies legal faq help support account page pages index home tag tags category categories
author authors search sitemap feed rss htm php xml json amp en www http https com net org io co app apps mcp
how what why want need use get have make find see create show add help look tool tools website websites best good
the and for with from your you our this that are was all new to of in on at by an or as it is be`.split(/\s+/);

// Stoplist words that are also UI block types (blog12, /block/login-form): stored, so the search keeps them.
export const BLOCK_WORDS = `blog faq login signin signup register contact about help support account
career careers cookie search changelog`.split(/\s+/);

// Stoplist words the search keeps anyway: social media icons/illustrations; mcp is typed for MCP tools (MCPcn).
export const QUERY_KEEP = ["social", "mcp"];
