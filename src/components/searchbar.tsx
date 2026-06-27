"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";


let nlpInstance: any = null;
let itsInstance: any = null;

function getNLP() {
  if (typeof window === "undefined") {
    return { nlp: null, its: null };
  }

  if (!nlpInstance) {
    nlpInstance = winkNLP(model);
    itsInstance = nlpInstance.its;
  }

  return {
    nlp: nlpInstance,
    its: itsInstance,
  };
}

type ToolResult = {
  id: number;
  tool_name: string;
  description: string;
  og_image_link: string;
  matchedKeywordsCount: number;
  relevanceScore: number;
};

export default function SearchBar() {
  const [inputValue, setInputValue] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ToolResult[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"relevant" | "similar">("relevant");

  const relevantResults = results.filter((item) => item.matchedKeywordsCount > 1);
  const similarResults = results.filter((item) => item.matchedKeywordsCount === 1);
  const displayedResults = activeTab === "relevant" ? relevantResults : similarResults;

  useEffect(() => {
    if (results.length > 0) {
      const hasRelevant = results.some((item) => item.matchedKeywordsCount > 1);
      setActiveTab(hasRelevant ? "relevant" : "similar");
    }
  }, [results]);

  const placeholders = [
    "ask anything",
    "dark mode portfolio",
    "minimalist website designs",
    "an icon library of 3d icons",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (inputValue !== "") return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [inputValue]);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const extractKeywords = (text: string): string[] => {
    try {
      const { nlp, its } = getNLP();

      if (!nlp || !its) {
        throw new Error("NLP model unavailable");
      }

      const doc = nlp.readDoc(text);

      let mainKeywords = doc
        .tokens()
        .filter((token: any) => {
          const pos = token.out(its.pos);

          // Removed VERB for cleaner search
          return ["NOUN", "ADJ", "PROPN"].includes(pos);
        })
        .out(its.lemma) as string[];

      const customStopwords = [
        "want",
        "need",
        "use",
        "get",
        "have",
        "make",
        "find",
        "see",
        "create",
        "show",
        "add",
        "help",
        "look",
        "tool",
        "tools",
        "website",
        "websites",
        "app",
        "apps",
        "best",
        "good",
      ];

      mainKeywords = mainKeywords.filter(
        (word) =>
          word.length > 1 &&
          /[a-z]/i.test(word) &&
          !customStopwords.includes(word.toLowerCase())
      );

      // Regex fallback for terms like 3d, ai, ui, etc.
      const regexFallback =
        text.toLowerCase().match(/\b[\da-z\-]{2,}\b/g) || [];

      const extraKeywords = regexFallback.filter(
        (w) => /\d/.test(w) || w.length <= 3
      );

      // Merge + dedupe
      let finalKeywords = [
        ...new Set([...mainKeywords, ...extraKeywords]),
      ]
        .map((k) => k.toLowerCase())

        // singular normalization
        .map((k) => {
          if (k.endsWith("s") && k.length > 3) {
            return k.slice(0, -1);
          }

          return k;
        })

        // remove duplicates again
        .filter((value, index, self) => self.indexOf(value) === index);

      return finalKeywords;
    } catch (err) {
      console.error("Keyword extraction error:", err);

      // Basic fallback
      return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 1);
    }
  };

  const handleSearch = async (queryText: string) => {
    const trimmed = queryText.trim();

    if (!trimmed) {
      handleClear();
      return;
    }

    setLoading(true);
    setError(null);
    setActiveQuery(trimmed);

    const finalKeywords = extractKeywords(trimmed);

    setKeywords(finalKeywords);

    if (finalKeywords.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/search?keywords=${encodeURIComponent(
          finalKeywords.join(",")
        )}`
      );

      if (!res.ok) {
        throw new Error("Search request failed");
      }

      const data = await res.json();

      setResults(data);
    } catch (err) {
      console.error("Search fetch error:", err);

      setError(
        "Failed to fetch search results. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setActiveQuery("");
    setResults([]);
    setKeywords([]);
    setError(null);
    setLoading(false);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      handleSearch(inputValue);

      e.currentTarget.blur();
    }
  };

  const isSearchActive =
    activeQuery.length > 0 || loading;

  return (
    <div className="w-full flex flex-col">
      <main
        className={`pointer-events-none relative z-30 flex items-center justify-center px-6 transition-all duration-300 ${
          isSearchActive
            ? "h-auto pt-10 pb-6"
            : "min-h-screen pt-10 pb-12"
        }`}
      >
        <div className="flex h-auto w-full flex-col items-center justify-center">
          <h1
            className={`font-rethink tracking-[0.001rem] text-left md:text-center text-[45px] leading-[45px] md:leading-none font-medium theme-hero-title md:text-[35px] transition-all duration-300 ${
              isSearchActive ? "hidden" : ""
            }`}
          >
            Find any design tool you need
          </h1>

          <div className="shadow-hairline mt-5 md:mt-5 h-auto w-full max-w-[600px] bg-white dark:bg-black px-4 py-3 text-left flex-col pointer-events-auto rounded-[12px]">
            <div className="relative w-full flex flex-row items-start justify-start overflow-hidden min-h-[60px]">
              <textarea
                ref={inputRef}
                inputMode="text"
                enterKeyHint="search"
                rows={4}
                title="Search design tools"
                aria-label="Search design tools"
                value={inputValue}
                onChange={(e) =>
                  setInputValue(e.target.value)
                }
                onKeyDown={handleKeyDown}
                className="font-rethink text-[13px] leading-tight theme-text-primary font-medium bg-transparent w-full resize-none overflow-hidden outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-hidden focus-visible:outline-hidden tracking-[0.001rem] z-10"
              />

              <AnimatePresence mode="wait">
                {!inputValue && (
                  <motion.div
                    key={placeholderIndex}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute left-0 pointer-events-none font-rethink text-[13px] leading-tight theme-text-soft font-semibold tracking-[0.05rem] select-none"
                  >
                    {placeholders[placeholderIndex]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full ml-2 font-rethink text-[13px] theme-text-soft hover:theme-text-primary transition shrink-0 items-center justify-center text-right px-[10px]"
              >
                clear
              </button>
            )}
          </div>


        </div>
      </main>

      <div className="w-full max-w-4xl mx-auto px-6 mt-6 z-30 pointer-events-auto">
        {/* Loading */}
        {loading && (
          <div className="w-full">
            <p className="font-rethink text-[11px] uppercase tracking-[0.16em] theme-text-primary animate-pulse mb-4">
              Searching...
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 animate-pulse space-y-4 shadow-md"
                >
                  <div className="aspect-video w-full rounded bg-[var(--app-border-strong)]" />

                  <div className="space-y-2">
                    <div className="h-4 w-1/2 rounded bg-[var(--app-border-strong)]" />

                    <div className="h-3 w-5/6 rounded bg-[var(--app-border-strong)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!loading &&
          activeQuery &&
          results.length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between border-b border-[var(--app-border-strong)] mb-6">
                <div className="flex space-x-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab("relevant")}
                    className={`relative pb-3 font-rethink text-[13px]  tracking-[0.05rem] font-semibold transition ${
                      activeTab === "relevant"
                        ? "theme-text-primary"
                        : "theme-text-soft hover:theme-text-primary"
                    }`}
                  >
                    Relevant Results ({relevantResults.length})
                    {activeTab === "relevant" && (
                      <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("similar")}
                    className={`relative pb-3 font-rethink text-[13px]  tracking-[0.05rem] font-semibold transition ${
                      activeTab === "similar"
                        ? "theme-text-primary"
                        : "theme-text-soft hover:theme-text-primary"
                    }`}
                  >
                    Similar Results ({similarResults.length})
                    {activeTab === "similar" && (
                      <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
                      />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  className="pb-3 font-rethink text-[13px]  tracking-[0.05rem] font-semibold transition"
                >
                  Clear
                </button>
              </div>

              {displayedResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedResults.map((item) => (
                    <a
                      key={item.id}
                      href={`/${encodeURIComponent(
                        item.tool_name
                      )}?id=${item.id}`}
                      className="group overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--app-border-strong)] shadow-hairline flex flex-col"
                    >
                      <img
                        alt={item.tool_name}
                        loading="lazy"
                        decoding="async"
                        src={
                          item.og_image_link ||
                          "/favicon.svg"
                        }
                        className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                        onError={(e) => {
                          e.currentTarget.src =
                            "/favicon.svg";

                          e.currentTarget.className =
                            "aspect-video w-full object-contain p-8 opacity-45";
                        }}
                      />

                      <div className="space-y-1 p-4">
                        <h3 className="font-rethink font-medium text-base leading-5 theme-text-primary md:text-lg">
                          {item.tool_name}
                        </h3>

                        <p className="text-sm font-rethink leading-4 theme-text-soft">
                          {item.description}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-4 text-center pb-10">
                  <span className="font-rethink text-xl theme-text-primary md:text-2xl">
                    No tools in this category
                  </span>

                  <span className="mt-2 text-sm theme-text-soft md:text-base font-rethink">
                    Try checking the other tab or search for different terms
                  </span>
                </div>
              )}
            </div>
          )}

        {/* Empty state */}
        {!loading &&
          activeQuery &&
          results.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 text-center">
              <span className="font-rethink text-xl theme-text-primary md:text-2xl font-semibold">
                No tools match your search
              </span>

              <span className="mt-2 text-sm theme-text-soft md:text-base font-rethink font-medium">
                Try searching for other terms or categories
              </span>
              {error && (
                <div className="text-red-400 font-rethink text-[15px] font-medium mb-[10px] items-center justify-center">
                  {error}
                </div>
              )}
            </div>
          )}
      </div>


    </div>
  );
}