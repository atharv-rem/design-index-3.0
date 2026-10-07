"use client";

import { useState, useEffect, useRef } from "react";
import { play } from "cuelume";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Hammer, MousePointerClick, SearchX, Users, X } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/images";
import { searchTools } from "@/lib/search";
import { withUtm } from "@/lib/utm";
import ToolImage from "@/components/tool-image";
import { Kbd } from "@/components/ui/kbd";
import { RadioGroupPrimitive, RadioPrimitive } from "@/components/ui/radio-group";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import type { SponsorCard } from "@/lib/sponsors";
import encrataLogo from "@/assets/encrata_logo.svg?url";


import { useSearchStore } from "../zustand_store/useSearchStore";

const resultTabClassName = segmentedControlItemVariants({
  className: "font-google",
  state: "checked",
});

// Sponsors with a bundled logo use it instead of the remote og image (keyed by lowercase name).
const LOCAL_SPONSOR_LOGOS: Record<string, string> = { encrata: encrataLogo };

// One sponsored card after every N results.
const SPONSOR_INTERVAL = 8;

export default function SearchBar({ sponsors: allSponsors = [] }: { sponsors?: SponsorCard[] }) {
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

  useEffect(() => {
    const cacheKey = "databuddy_stats_session_cache";
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.pageviews === "number") {
            setStats(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to read stats from sessionStorage:", err);
      }
    }

    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.pageviews === "number") {
          const newStats = {
            pageviews: data.pageviews,
            visitors: typeof data.visitors === "number" ? data.visitors : 0,
          };
          setStats(newStats);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(newStats));
            } catch (err) {
              console.error("Failed to save stats to sessionStorage:", err);
            }
          }
        }
      })
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  useEffect(() => {
    fetch("/api/tool_count")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setToolcount(data.count);
        }
      })
      .catch((err) => console.error("Failed to fetch tool count:", err));
  }, []);

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

  const relevantResults = results.filter((item) => item.matchedKeywordsCount > 1);
  const similarResults = results.filter((item) => item.matchedKeywordsCount === 1);
  const displayedResults = activeTab === "relevant" ? relevantResults : similarResults;
  const otherResults = activeTab === "relevant" ? similarResults : relevantResults;

  const gridEntries = (() => {
    const sponsors = allSponsors.filter((sponsor) => !sponsor.homepage_only);
    const entries: (
      | { kind: "tool"; item: (typeof displayedResults)[number] }
      | { kind: "sponsor"; sponsor: SponsorCard; key: string }
    )[] = [];
    let sponsorCount = 0;

    displayedResults.forEach((item, index) => {
      entries.push({ kind: "tool", item });

      if (sponsors.length > 0 && (index + 1) % SPONSOR_INTERVAL === 0) {
        const sponsor = sponsors[sponsorCount % sponsors.length];
        entries.push({ kind: "sponsor", sponsor, key: `sponsor-${sponsor.id}-${sponsorCount}` });
        sponsorCount += 1;
      }
    });

    // Fewer results than one full interval: still show a single sponsor at the end.
    if (sponsors.length > 0 && displayedResults.length > 0 && displayedResults.length < SPONSOR_INTERVAL) {
      const sponsor = sponsors[0];
      entries.push({ kind: "sponsor", sponsor, key: `sponsor-${sponsor.id}-0` });
    }

    return entries;
  })();

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

  // Press "/" anywhere (outside editable fields) to focus the search input.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSearch = async (queryText: string) => {
    const trimmed = queryText.trim();

    if (!trimmed) {
      handleClear();
      return;
    }

    setLoading(true);
    setError(null);
    setActiveQuery(trimmed);

    try {
      const data = await searchTools(trimmed);

      setResults(data);
      play(data.length > 0 ? "ready" : "warning", { emphasis: "subtle" });
    } catch (err) {
      console.error("Search fetch error:", err);

      play("error", { emphasis: "subtle" });

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

  
  const renderSearchBarCard = () => (
    <div className="w-full text-left flex flex-col justify-start pointer-events-auto rounded-[12px] h-auto overflow-hidden">
      <div className="border-[1px] border-[#ededed] dark:border-white/10 rounded-[12px] relative w-full flex flex-row items-start justify-start overflow-hidden h-[60px] pl-4 pr-20 pt-[11px] pb-[11px] bg-white dark:bg-[#141414] z-10">
        <textarea
          ref={inputRef}
          inputMode="text"
          enterKeyHint="search"
          rows={2}
          title="Search design tools"
          aria-label="Search design tools"
          data-cuelume-type
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-google text-[13px] leading-tight theme-text-primary font-medium bg-transparent w-full resize-none overflow-hidden outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-hidden focus-visible:outline-hidden tracking-[0.001rem] z-10"
        />

        <AnimatePresence mode="wait">
          {!inputValue && (
            <motion.div
              key={placeholderIndex}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute left-4 top-[11px] pointer-events-none font-google text-[13px] leading-tight theme-text-soft font-semibold tracking-[0.001rem] select-none"
            >
              {placeholders[placeholderIndex]}
            </motion.div>
          )}
        </AnimatePresence>

        {inputValue ? (
          <div className="absolute right-3 top-[9px] z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              data-cuelume-close
              data-cuelume-emphasis="subtle"
              className="font-(family-name:--font-inter-stack) text-[13px] theme-text-soft hover:theme-text-primary transition shrink-0"
            >
              clear
            </button>
            <Kbd className="hidden sm:inline-flex" aria-label="Enter">↵</Kbd>
          </div>
        ) : (
          <Kbd
            className="absolute right-3 top-[9px] z-20 hidden sm:inline-flex"
            aria-label="Press slash to focus search"
          >
            /
          </Kbd>
        )}
      </div>
    </div>
  );

  // Strip: 4 equal-width cells (1 row of 4 on desktop, 2x2 on mobile).
  const SPONSOR_SLOTS = 4;
  const stripSponsors = allSponsors.slice(0, SPONSOR_SLOTS);

  const sponsorCellClassName =
    "col-span-1 flex min-h-[56px] min-w-0 items-center justify-center sm:min-h-0";

  const sponsorLineProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeDasharray: "6 6",
  } as const;

  const renderStatsRow = () => (
    <div className="mt-4 flex w-full items-center justify-center gap-3 overflow-x-auto no-scrollbar px-1 font-(family-name:--font-inter-stack) text-[11px] sm:text-[13px] theme-text-soft font-semibold select-none pointer-events-auto">
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
        <MousePointerClick size={15} className="shrink-0" aria-hidden="true" />
        {stats && (
          <span>
            {stats.pageviews.toLocaleString()} views <span className="hidden sm:inline">this month</span>
          </span>
        )}
      </div>
      {stats && stats.visitors > 0 && (
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
          <Users size={15} className="shrink-0" aria-hidden="true" />
          <span>{stats.visitors.toLocaleString()} visitors</span>
        </div>
      )}
      {toolcount > 0 && (
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
          <Hammer size={15} className="shrink-0" aria-hidden="true" />
          <span>{toolcount} tools</span>
        </div>
      )}
    </div>
  );

  const renderSponsorStrip = () => (
    <div className="relative mt-5 w-full pointer-events-auto">
      {/* Desktop: 4 columns in a single row */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 hidden h-full w-full pointer-events-none text-[#e2e2e2] dark:text-[#333] sm:block"
        {...sponsorLineProps}
      >
        <line x1="0" x2="100%" y1="1.5" y2="1.5" />
        <line x1="0" x2="100%" y1="100%" y2="100%" transform="translate(0,-1.5)" />
        {[1, 2, 3].map((n) => (
          <line key={n} x1={`${(n / 4) * 100}%`} x2={`${(n / 4) * 100}%`} y1="5%" y2="95%" />
        ))}
      </svg>
      {/* Mobile: 2 columns, 2 rows */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full pointer-events-none text-[#f0f0f0] dark:text-[#2a2a2a] sm:hidden"
        {...sponsorLineProps}
      >
        <line x1="0" x2="100%" y1="1.5" y2="1.5" />
        <line x1="0" x2="100%" y1="50%" y2="50%" />
        <line x1="0" x2="100%" y1="100%" y2="100%" transform="translate(0,-1.5)" />
        <line x1="50%" x2="50%" y1="2.5%" y2="47.5%" />
        <line x1="50%" x2="50%" y1="52.5%" y2="97.5%" />
      </svg>
      <div className="grid grid-cols-2 font-(family-name:--font-inter-stack) sm:h-[64px] sm:grid-cols-4">
        {stripSponsors.map((sponsor) => (
          <a
            key={sponsor.id}
            href={withUtm(sponsor.website_url, { content: "sponsor-strip" })}
            target="_blank"
            rel="sponsored noopener noreferrer"
            data-cuelume-emphasis="subtle"
            title={sponsor.description || sponsor.name}
            className={`${sponsorCellClassName} gap-1.5 px-2 sm:gap-1 sm:px-3 theme-text-soft hover:theme-text-primary transition`}
          >
            {(LOCAL_SPONSOR_LOGOS[sponsor.name.toLowerCase()] || sponsor.og_image_link) && (
              <img
                src={
                  LOCAL_SPONSOR_LOGOS[sponsor.name.toLowerCase()] ||
                  getOptimizedImageUrl(sponsor.og_image_link, { width: 64, quality: 76 }) ||
                  "/favicon.ico"
                }
                alt=""
                width={32}
                height={32}
                loading="lazy"
                className={`shrink-0 ${LOCAL_SPONSOR_LOGOS[sponsor.name.toLowerCase()] ? "mr-[5px] h-auto w-6 object-contain sm:w-5" : "size-9 rounded-[4px] object-cover sm:size-8"}`}
              />
            )}
            <span className="truncate text-[20px] font-semibold sm:text-[18px]">{sponsor.name}</span>
          </a>
        ))}

        {Array.from({ length: SPONSOR_SLOTS - stripSponsors.length }).map((_, i) => (
          <a
            key={`open-${i}`}
            href="/sponsor"
            data-cuelume-navigate
            data-cuelume-emphasis="subtle"
            className={`${sponsorCellClassName} justify-center gap-1.5 px-2 text-[16px] font-medium sm:text-[13px] theme-text-soft hover:theme-text-primary transition`}
          >
            <span aria-hidden="true">+</span>
            <span className="truncate">sponsor</span>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col">
      <main
        className={`pointer-events-none relative z-30 flex items-center justify-center px-4 sm:px-6 transition-all duration-300 ${
          isSearchActive
            ? "h-auto pt-10 pb-6"
            : "min-h-screen pt-10 pb-12"
        }`}
      >
        <div className="flex w-full flex-col items-center justify-center">
          <h1
            className={`z-20 font-gatuzo tracking-[0.001rem] text-center text-[28px] sm:text-[32px] md:text-[45px] leading-tight font-semibold theme-hero-title dark:text-[#d4d4d4] dark:[text-shadow:0_2px_10px_rgb(0_0_0/0.9),0_8px_28px_rgb(0_0_0/0.8)] transition-all duration-300 bg-transparent ${
              isSearchActive ? "hidden" : ""
            }`}
          >
            find any design tool
          </h1>

          <div className="w-full max-w-[600px] mt-5 md:mt-5">
            {renderSearchBarCard()}
            {!isSearchActive && renderStatsRow()}
            {!isSearchActive && renderSponsorStrip()}
          </div>
        </div>
      </main>

      <div className="w-full max-w-4xl mx-auto px-6 mt-6 z-30 pointer-events-auto">
        {/* Loading */}
        {loading && (
          <div className="w-full">
            <p className="font-google text-[11px] tracking-[0.05rem] font-medium theme-text-primary animate-pulse mb-4">
              Searching...
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#141416] shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-black/5 dark:ring-white/10"
                >
                  <div
                    className="skeleton-shimmer aspect-video w-full"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />

                  <div className="flex flex-col gap-2.5 p-3 sm:p-4">
                    <div
                      className="skeleton-shimmer h-[17px] w-2/3 rounded-md"
                      style={{ animationDelay: `${i * 120 + 60}ms` }}
                    />
                    <div className="flex flex-col gap-1.5">
                      <div
                        className="skeleton-shimmer h-3 w-full rounded-md"
                        style={{ animationDelay: `${i * 120 + 120}ms` }}
                      />
                      <div
                        className="skeleton-shimmer h-3 w-4/5 rounded-md"
                        style={{ animationDelay: `${i * 120 + 180}ms` }}
                      />
                    </div>
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
              <div className="mb-6 flex items-center justify-between gap-3">
                <RadioGroupPrimitive
                  aria-label="Result type"
                  className={segmentedControlRootClassName}
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as "relevant" | "similar")}
                >
                  {(
                    [
                      { value: "relevant", label: "Relevant", count: relevantResults.length },
                      { value: "similar", label: "Similar", count: similarResults.length },
                    ] as const
                  ).map((tab) => (
                    <RadioPrimitive.Root
                      key={tab.value}
                      value={tab.value}
                      data-cuelume-select
                      className={resultTabClassName}
                    >
                      {tab.label}
                      <span className="tabular-nums opacity-60">{tab.count}</span>
                    </RadioPrimitive.Root>
                  ))}
                </RadioGroupPrimitive>

                <button
                  type="button"
                  onClick={handleClear}
                  data-cuelume-close
                  data-cuelume-emphasis="subtle"
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 font-google text-[13px] font-semibold theme-text-soft transition-colors hover:bg-muted hover:theme-text-primary"
                >
                  <X className="size-3.5" aria-hidden="true" />
                  Clear
                </button>
              </div>

              {displayedResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 pb-10 sm:gap-6 lg:grid-cols-3">
                  {gridEntries.map((entry) => {
                    const isSponsor = entry.kind === "sponsor";
                    const card = isSponsor
                      ? {
                          key: entry.key,
                          href: entry.sponsor.website_url,
                          name: entry.sponsor.name,
                          description: entry.sponsor.description,
                          og_image_link: entry.sponsor.og_image_link,
                        }
                      : {
                          key: String(entry.item.id),
                          href: `/${entry.item.id}/${encodeURIComponent(entry.item.tool_name)}`,
                          name: entry.item.tool_name,
                          description: entry.item.description,
                          og_image_link: entry.item.og_image_link,
                        };

                    return (
                    <a
                      key={card.key}
                      href={card.href}
                      {...(isSponsor
                        ? { target: "_blank", rel: "sponsored noopener noreferrer" }
                        : { "data-cuelume-navigate": true })}
                      data-cuelume-emphasis="subtle"
                      className="group relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#141416] shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-black/5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.1)] dark:shadow-[0_4px_14px_rgb(0_0_0/0.8),0_14px_36px_-8px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)] dark:ring-white/10 dark:hover:shadow-[0_6px_18px_rgb(0_0_0/0.85),0_22px_48px_-8px_rgb(0_0_0/1),inset_0_1px_0_rgb(255_255_255/0.08)]"
                    >
                      {isSponsor && (
                        <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-[var(--app-bg)]/80 px-2 py-0.5 font-google text-[10px] font-semibold uppercase tracking-[0.1em] theme-text-primary backdrop-blur">
                          Sponsored
                        </span>
                      )}
                      <div className="overflow-hidden [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04]">
                        <ToolImage
                          alt={card.description.toLowerCase()}
                          width={1200}
                          height={675}
                          src={
                            getOptimizedImageUrl(
                              card.og_image_link,
                              { width: 640, quality: 78 },
                            ) || undefined
                          }
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
                        <h3 className="font-google text-[15px] font-semibold leading-snug theme-text-primary sm:text-[17px]">{card.name}</h3>
                        <p className="line-clamp-2 font-google text-[13px] font-medium leading-5 theme-text-soft sm:text-sm">{card.description}</p>
                      </div>
                    </a>
                    );
                  })}
                </div>
              ) : (
                <div
                  role="status"
                  className="mb-10 flex min-h-56 flex-col items-center justify-center rounded-xl bg-[var(--app-surface-soft)] px-6 py-10 text-center"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-[var(--sidebar-accent)] theme-text-muted">
                    <SearchX className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-4 font-google text-lg font-semibold theme-text-primary">
                    No {activeTab === "relevant" ? "relevant" : "similar"} results
                  </span>
                  <span className="mt-1 max-w-sm font-(family-name:--font-inter-stack) text-sm font-medium theme-text-soft">
                    {otherResults.length > 0
                      ? `Nothing matched closely enough here, but ${otherResults.length} ${otherResults.length === 1 ? "tool was" : "tools were"} found in the other tab.`
                      : "Try searching for different terms."}
                  </span>
                  {otherResults.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab(activeTab === "relevant" ? "similar" : "relevant")}
                      data-cuelume-tap
                      className="group/cta mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[var(--app-text)] pr-2.5 pl-4 font-google text-[13px] font-medium text-[var(--app-bg)] shadow-sm ring-1 ring-(--app-text)/10 transition-[opacity,transform,box-shadow] duration-200 ease-out hover:opacity-90 hover:shadow-md active:scale-[0.96]"
                    >
                      View {activeTab === "relevant" ? "similar" : "relevant"} results
                      <span className="flex h-6 items-center gap-1 rounded-lg bg-(--app-bg)/15 pr-1.5 pl-2 text-[12px] tabular-nums">
                        {otherResults.length}
                        <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Empty state */}
        {!loading &&
          activeQuery &&
          results.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center px-4 text-center">
              <span className="font-google text-xl theme-text-primary md:text-2xl font-semibold">
                No tools match your search
              </span>

              <span className="mt-2 text-sm theme-text-soft md:text-base font-(family-name:--font-inter-stack) font-medium">
                Try searching for other terms or categories
              </span>
              {error && (
                <div className="text-red-400 font-(family-name:--font-inter-stack) text-[15px] font-medium mb-[10px] items-center justify-center">
                  {error}
                </div>
              )}
            </div>
          )}
      </div>

    </div>
  );
}
