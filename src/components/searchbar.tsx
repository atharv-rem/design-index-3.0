"use client";

import { useState, useEffect, useRef } from "react";
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
  return { nlp: nlpInstance, its: itsInstance };
}


type ToolResult = {
  id: number;
  tool_name: string;
  description: string;
  pricing: string;
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

  // Focus the input field on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
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

    // Process the input value to extract keywords using WinkNLP
    let finalKeywords: string[] = [];
    try {
      const { nlp, its } = getNLP();
      if (!nlp || !its) {
        throw new Error("NLP model not available.");
      }
      const doc = nlp.readDoc(trimmed);
      let mainkeywords = doc
        .tokens()
        .filter((token: any) => {
          // @ts-ignore
          const pos = token.out(its.pos);
          return ["NOUN", "ADJ", "PROPN", "VERB"].includes(pos);
        })
        // @ts-ignore
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
      ];
      mainkeywords = mainkeywords.filter(
        (word) =>
          word.length > 1 &&
          /[a-z]/i.test(word) &&
          !customStopwords.includes(word)
      );

      // regex fallback
      const regexFallback = trimmed.toLowerCase().match(/\b[\da-z\-]{2,}\b/g) || [];
      const extraKeywords = regexFallback.filter(
        (w) => /\d/.test(w) && /[a-z]/i.test(w)
      );
      finalKeywords = [...new Set([...mainkeywords, ...extraKeywords])].map(
        (k) => k.toLowerCase()
      );
    } catch (err) {
      console.error("WinkNLP extraction error:", err);
      finalKeywords = trimmed
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 1);
    }

    setKeywords(finalKeywords);

    if (finalKeywords.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/search?keywords=${encodeURIComponent(finalKeywords.join(","))}`);
      if (!res.ok) {
        throw new Error("Search service encountered an error.");
      }
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Fetch search results error:", err);
      setError("Failed to fetch search results. Please try again.");
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(inputValue);
      e.currentTarget.blur(); // Hides mobile keyboard automatically
    }
  };

  const isSearchActive = activeQuery.length > 0 || loading;

  return (
    <div className="pointer-events-auto w-full flex flex-col items-center">
      {/* Heading — hidden when search results are showing */}
      <h1
        className={`font-kal text-left md:text-center text-[50px] leading-[45px] md:leading-none font-semibold text-white md:text-[40px] [text-shadow:0_205px_57px_rgba(0,0,0,0.01),0_131px_52px_rgba(0,0,0,0.09),0_74px_44px_rgba(0,0,0,0.30),0_33px_33px_rgba(0,0,0,0.51),0_8px_18px_rgba(0,0,0,0.59)] transition-all duration-300 ${
          isSearchActive ? "hidden" : ""
        }`}
      >
        Find any design tool you need
      </h1>
      {/* Black box input matching the exact shadow-everywhere and ask anything styles */}
      <div className="shadow-everywhere mt-5 md:mt-5 h-auto w-full max-w-[430px] bg-black px-2.5 py-2 text-left flex items-center">
        <textarea
          ref={inputRef}
          inputMode="text"
          enterKeyHint="search"
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ask anything"
          className="font-kal text-[13px] leading-tight text-white font-semibold placeholder:text-white bg-transparent w-full resize-none overflow-hidden outline-none focus:outline-none tracking-[0.05rem]"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 font-kal text-[13px] text-[#bebebe] hover:text-white transition shrink-0"
          >
            clear
          </button>
        )}
      </div>

      {/* Skeletons, Errors, and Search Results below search input */}
      <div className="w-full max-w-4xl mt-10">
        {/* Loading skeleton */}
        {loading && (
          <div className="w-full">
            <p className="font-departure text-[11px] uppercase tracking-[0.16em] text-white animate-pulse mb-4">
              Searching...
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[8px] border border-white/10 bg-[#111111]/80 p-4 animate-pulse space-y-4 shadow-md"
                >
                  <div className="aspect-video w-full rounded bg-zinc-800" />
                  <div className="space-y-2">
                    <div className="h-4 w-1/2 rounded bg-zinc-800" /> 
                    <div className="h-3 w-5/6 rounded bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-red-200 font-departure text-xs">
            {error}
          </div>
        )}

        {/* Search Results */}
        {!loading && activeQuery && results.length > 0 && (
          <div className="w-full">
            <div className="flex items-center justify-between border-b border-white/30 pb-3 mb-6">
              <p className="font-departure font-semibold text-[11px] uppercase tracking-[0.16em] text-white select-none">
                Search Results ({results.length})
              </p>
              <button
                type="button"
                onClick={handleClear}
                className="font-departure text-[11px] uppercase tracking-[0.16em] text-zinc-400 hover:text-white transition"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-1 gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((item) => (
                <a
                  key={item.id}
                  href={`/${encodeURIComponent(item.tool_name)}?id=${item.id}`}
                  className="group overflow-hidden rounded-[8px] border border-white/10 bg-[#111111]/80 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/20 shadow-2xl flex flex-col"
                >
                  <img
                    alt={item.tool_name}
                    loading="lazy"
                    decoding="async"
                    src={item.og_image_link || "/favicon.svg"}
                    className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    onError={(e) => {
                      e.currentTarget.src = "/favicon.svg";
                      e.currentTarget.className = "aspect-video w-full object-contain p-8 opacity-45";
                    }}
                  />
                  <div className="space-y-3 p-4">
                    <h3 className="font-departure text-base leading-5 text-zinc-100 md:text-lg">
                      {item.tool_name}
                    </h3>
                    <p className="text-sm font-departure leading-5 text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* No results empty state */}
        {!loading && activeQuery && results.length === 0 && (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/2 px-4 text-center">
            <span className="font-departure text-xl text-zinc-100 md:text-2xl">
              No tools match your search
            </span>
            <span className="mt-2 text-sm text-zinc-400 md:text-base font-departure">
              Try searching for other terms or categories
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
