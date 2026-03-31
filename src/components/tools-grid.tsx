import { useEffect, useMemo, useState } from "react";
import { TOOLS_SEARCH_EVENT } from "@/lib/tools-search-event";
import { normalizeTools, type SupabaseToolRow } from "@/lib/tools";

type PricingFilter = "free" | "paid" | "freemium" | "all";

type ToolsGridProps = {
  category: string;
  initialTools?: SupabaseToolRow[];
};

const filters: { value: PricingFilter; label: string }[] = [
  { value: "free", label: "FREE" },
  { value: "paid", label: "PAID" },
  { value: "freemium", label: "FREEMIUM" },
  { value: "all", label: "ALL" },
];


export default function ToolsGrid({ category, initialTools = [] }: ToolsGridProps) {
  const [items, setItems] = useState<PricingFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedTools = useMemo(() => normalizeTools(initialTools), [initialTools]);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setSearchQuery(customEvent.detail ?? "");
    };

    window.addEventListener(TOOLS_SEARCH_EVENT, handleSearch as EventListener);

    return () => {
      window.removeEventListener(TOOLS_SEARCH_EVENT, handleSearch as EventListener);
    };
  }, []);

  const filtered = useMemo(() => {
    const byCategory = normalizedTools;

    let byPricing = byCategory;

    if (items === "free") {
      byPricing = byCategory.filter((item) => item.pricing === "free");
    }

    if (items === "paid") {
      byPricing = byCategory.filter((item) => item.pricing === "paid");
    }

    if (items === "freemium") {
      byPricing = byCategory.filter((item) => item.pricing === "free,paid");
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return byPricing;
    }

    return byPricing.filter((item) => {
      return (
        item.tool_name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [category, items, normalizedTools, searchQuery]);

  return (
    <section className="mt-5 w-full">
      <p className="mb-2 font-departure text-[11px] uppercase tracking-[0.16em] text-zinc-400">Filter by pricing</p>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = items === filter.value;

          return (
            <button
              type="button"
              key={filter.value}
              onClick={() => setItems(filter.value)}
              className={`rounded-[10px] border px-3 py-1.5 font-departure text-xs transition-colors ${
                active
                  ? "border-zinc-100 bg-zinc-100 text-black"
                  : "border-zinc-700 bg-[#111111] text-zinc-300 hover:border-zinc-500 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-8 pb-10 lg:grid-cols-4">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={`/${encodeURIComponent(item.tool_name)}`}
              className="group overflow-hidden rounded-[8px] border border-white/10 bg-[#111111]/80 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-white/20"
            >
              <img
                alt={item.description.toLowerCase()}
                loading="lazy"
                src={item.og_image_link}
                className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
              />
              <div className="space-y-3 p-4">
                <h3 className="font-departure text-base leading-5 text-zinc-100 md:text-lg">{item.tool_name}</h3>
                <p className="text-sm font-departure leading-5 text-zinc-400">{item.description}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/2 px-4 text-center">
          <span className="font-departure text-xl text-zinc-100 md:text-2xl">No tools match this filter</span>
          <span className="mt-2 text-sm text-zinc-400 md:text-base">Try another search or pricing filter</span>
        </div>
      )}
    </section>
  );
}
