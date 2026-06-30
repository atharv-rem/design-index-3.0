"use client";

import { useState, useEffect, useRef, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import { getOptimizedImageUrl } from "@/lib/images";
import { FunkyShadow } from "funky-shadow";
import click_dark from "../assets/click_dark.svg?url"
import click_light from "../assets/click_light.svg?url"


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
import { useSearchStore } from "../zustand_store/useSearchStore";
import type { ToolResult } from "../zustand_store/useSearchStore";
export default function SearchBar() {
  const toggleSidebar = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("toggle-sidebar"));
    }
  };
  const {
    inputValue,
    activeQuery,
    loading,
    results,
    error,
    activeTab,
    stats,
    toolcount,
    setInputValue,
    setActiveQuery,
    setLoading,
    setResults,
    setError,
    setActiveTab,
    setStats,
    setToolcount,
    resetSearch,
  } = useSearchStore();

  const [containerWidth, setContainerWidth] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.pageviews === "number") {
          setStats({ pageviews: data.pageviews });
        }
      })
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  useEffect(()=>{
    fetch("./api/tool_count")
    .then((res) => res.json())
      .then((data) => {
        if (data) {
          setToolcount(data.count);
        }
      })
      .catch((err) => console.error("Failed to fetch stats:", err));
  },[])

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      if (activeQuery) {
        handleClear();
      }
      return;
    }

    const timer = setTimeout(() => {
      if (trimmed !== activeQuery) {
        handleSearch(inputValue);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputValue, activeQuery]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsDarkMode(document.documentElement.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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
    resetSearch();

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

  const isSearchActive = activeQuery.length > 0 || loading;

  
    return (
    <div className="w-full flex flex-col">
      <main
        className={`pointer-events-none relative z-30 flex items-center justify-center px-6 transition-all duration-300 ${
          isSearchActive
            ? "h-auto pt-10 pb-6"
            : "min-h-screen pt-10 pb-12"
        }`}
      >
        <div className="flex w-full flex-col items-center justify-center">
          <h1
            className={`z-20 font-rethink tracking-[0.001rem] text-left md:text-center text-[45px] leading-[45px] md:leading-none font-semibold theme-hero-title md:text-[35px] transition-all duration-300 bg-transparent ${
              isSearchActive ? "hidden" : ""
            }`}
          >
            find any design tool
          </h1>

          <div ref={containerRef} className="w-full max-w-[600px] mt-5 md:mt-5">
            <FunkyShadow
              width={containerWidth}
              height={70}
              radius={15}
              offsetX={0}
              offsetY={15}
              spread={500}
              blur={45}
              opacity={isDarkMode ? 0 : 0.18}
              pixelScale={3}
              colors={
                isDarkMode
                  ? [[180, 180, 180], [140, 140, 140], [90, 90, 90], [50, 50, 50], [20, 20, 20], [0, 0, 0]]
                  : [[0, 0, 0], [40, 40, 40], [90, 90, 90], [150, 150, 150], [210, 210, 210], [255, 255, 255]]
              }
            >
              <div className="border w-full text-left flex flex-col justify-start pointer-events-auto rounded-[12px] h-[90px] bg-[#f0f0f0] dark:bg-[#313131] border border-[1px] border-[#cacaca] dark:border-[#282828] dark:shadow-hairline">
                <div className="border-[1px] border-[#d1d1d1] dark:border-0 rounded-[12px] relative w-full flex flex-row items-start justify-start overflow-hidden h-[60px] pl-4 pr-16 pt-[11px] pb-[11px] bg-white dark:bg-[#141414] z-10">
                  <textarea
                    ref={inputRef}
                    inputMode="text"
                    enterKeyHint="search"
                    rows={2}
                    title="Search design tools"
                    aria-label="Search design tools"
                    value={inputValue}
                    onChange={(e) =>
                      setInputValue(e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    className="font-rethink text-[13px] leading-tight theme-text-primary font-medium bg-transparent w-full resize-none overflow-hidden outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-hidden focus-visible:outline-hidden tracking-[0.001rem] font-medium z-10"
                  />

                  <AnimatePresence mode="wait">
                    {!inputValue && (
                      <motion.div
                        key={placeholderIndex}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute left-4 top-[11px] pointer-events-none font-rethink text-[13px] leading-tight theme-text-soft font-semibold tracking-[0.001rem] select-none"
                      >
                        {placeholders[placeholderIndex]}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {inputValue && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="absolute right-4 top-[11px] font-rethink text-[13px] theme-text-soft hover:theme-text-primary transition shrink-0 z-20"
                    >
                      clear
                    </button>
                  )}
                </div>
                <div className="py-[5px] px-[10px] flex items-center gap-1.5 font-rethink text-[10px] theme-text-soft font-semibold select-none justify-between">
                  <div className="flex justify-center items-center">
                    <img src={click_dark} alt="" width={15} height={15} className="hidden animate-pulse"/>
                    <img src={click_light} alt="" width={15} height={15} className="hidden animate-pulse"/>
                    {stats && (
                      <span>{stats.pageviews.toLocaleString()} views this month</span>
                    )}
                    {toolcount > 0 && 
                      <span className="text-[13px]">{toolcount} tools</span>
                    }
                  </div>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    className="font-rethink text-[13px] theme-text-soft hover:theme-text-primary transition shrink-0 cursor-pointer uppercase tracking-[0.001em] font-semibold"
                  >
                    Explore
                  </button>
                </div>
              </div>
            </FunkyShadow>
          </div>


        </div>
      </main>

      <div className="w-full max-w-4xl mx-auto px-6 mt-6 z-30 pointer-events-auto">
        {/* Loading */}
        {loading && (
          <div className="w-full">
            <p className="font-rethink text-[11px] tracking-[0.05rem] font-medium theme-text-primary animate-pulse mb-4">
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
                      href={`/${item.id}/${encodeURIComponent(
                        item.tool_name
                      )}`}
                      className="group overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--app-border-strong)] shadow-hairline flex flex-col"
                    >
                      <img
                        alt={item.tool_name}
                        loading="lazy"
                        decoding="async"
                        src={
                          getOptimizedImageUrl(
                            item.og_image_link,
                            { width: 480, quality: 76 },
                          ) ||
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

                      <div className="space-y-2 md:space-y-1 p-4">
                        <h3 className="font-rethink font-semibold text-[20px] leading-5 theme-text-primary md:text-lg">
                          {item.tool_name}
                        </h3>

                        <p className="text-[15px] md:text-sm font-rethink leading-[20px] md:leading-[15px] font-medium theme-text-soft">
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
