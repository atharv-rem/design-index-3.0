"use client";

import { useState, useEffect, useRef } from "react";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

import HomeFeatures from "./home-features";
import HomeFaq from "./home-faq";

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
            className={`font-kal tracking-[0.05rem] text-left md:text-center text-[50px] leading-[45px] md:leading-none font-semibold theme-hero-title md:text-[40px] transition-all duration-300 ${
              isSearchActive ? "hidden" : ""
            }`}
          >
            Find any design tool you need
          </h1>

          <div className="shadow-everywhere mt-5 md:mt-5 h-auto w-full max-w-[430px] bg-white dark:bg-black border border-[var(--app-border)] dark:border-white/10 px-2.5 py-2 text-left flex items-center pointer-events-auto">
            <textarea
              ref={inputRef}
              inputMode="text"
              enterKeyHint="search"
              rows={1}
              value={inputValue}
              onChange={(e) =>
                setInputValue(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="ask anything"
              style={{
                outline: "none",
                boxShadow: "none",
              }}
              className="font-kal text-[13px] leading-tight theme-text-primary font-semibold placeholder:theme-text-soft bg-transparent w-full resize-none overflow-hidden outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-hidden focus-visible:outline-hidden tracking-[0.05rem]"
            />

            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 font-kal text-[13px] theme-text-soft hover:theme-text-primary transition shrink-0"
              >
                clear
              </button>
            )}
          </div>

          {/* extracted keywords preview */}
          {!loading && keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="text-[10px] uppercase tracking-[0.12em] border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2 py-1 rounded-md font-departure theme-text-soft"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className="w-full max-w-4xl mx-auto px-6 mt-6 z-30 pointer-events-auto">
        {/* Loading */}
        {loading && (
          <div className="w-full">
            <p className="font-departure text-[11px] uppercase tracking-[0.16em] theme-text-primary animate-pulse mb-4">
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

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-red-200 font-departure text-xs">
            {error}
          </div>
        )}

        {/* Results */}
        {!loading &&
          activeQuery &&
          results.length > 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between border-b border-[var(--app-border-strong)] pb-3 mb-6">
                <p className="font-departure font-semibold text-[11px] uppercase tracking-[0.16em] theme-text-primary select-none">
                  Search Results ({results.length})
                </p>

                <button
                  type="button"
                  onClick={handleClear}
                  className="font-departure text-[11px] uppercase tracking-[0.16em] theme-text-soft hover:theme-text-primary transition"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item) => (
                  <a
                    key={item.id}
                    href={`/${encodeURIComponent(
                      item.tool_name
                    )}?id=${item.id}`}
                    className="group overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--app-border-strong)] shadow-2xl flex flex-col"
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

                    <div className="space-y-3 p-4">
                      <h3 className="font-departure text-base leading-5 theme-text-primary md:text-lg">
                        {item.tool_name}
                      </h3>

                      <p className="text-sm font-departure leading-5 theme-text-soft">
                        {item.description}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

        {/* Empty state */}
        {!loading &&
          activeQuery &&
          results.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-4 text-center">
              <span className="font-departure text-xl theme-text-primary md:text-2xl">
                No tools match your search
              </span>

              <span className="mt-2 text-sm theme-text-soft md:text-base font-departure">
                Try searching for other terms or categories
              </span>
            </div>
          )}
      </div>

      {!isSearchActive && (
        <section className="relative z-30 mx-auto flex w-full flex-col gap-6 pb-24 pt-8 md:pt-16 max-w-4xl px-6 pointer-events-auto">
          <HomeFeatures />
          <HomeFaq />
        </section>
      )}
    </div>
  );
}