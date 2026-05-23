import { useMemo, useState } from "react";
import type { ToolCard } from "@/lib/tools";


type PricingFilter = "free" | "paid" | "freemium" | "all";

type ToolsGridProps = {
  category: string;
  initialTools: ToolCard[];
};

const filters: { value: PricingFilter; label: string }[] = [
  { value: "free", label: "FREE" },
  { value: "paid", label: "PAID" },
  { value: "freemium", label: "FREEMIUM" },
  { value: "all", label: "ALL" },
];


export default function ToolsGrid({ category, initialTools }: ToolsGridProps) {
  const [items, setItems] = useState<PricingFilter>("all");
  const tools = initialTools;

  const filtered = useMemo(() => {
    const byCategory = tools;

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

    return byPricing;
  }, [category, items, tools]);

  return (
    <section className="mt-5 w-full">
      <p className="mb-2 font-departure text-[11px] uppercase tracking-[0.16em] theme-text-soft">Filter by pricing</p>
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
                  ? "border-[var(--app-text)] bg-[var(--app-text)] text-[var(--app-bg)]"
                  : "border-[var(--app-border)] bg-[var(--app-surface-soft)] theme-text-muted hover:border-[var(--app-border-strong)] hover:theme-text-primary"
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
              href={`/${encodeURIComponent(item.tool_name)}?id=${item.id}`}
              className="group overflow-hidden rounded-[8px] border border-[var(--app-border)] bg-[var(--app-surface)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[var(--app-border-strong)]"
            >
              <img
                alt={item.description.toLowerCase()}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                referrerPolicy="no-referrer"
                width={1200}
                height={675}
                src={item.og_image_link || null}
                className="aspect-video w-full object-cover transition duration-200 group-hover:scale-[1.02]"
              />
              <div className="space-y-3 p-4">
                <h3 className="font-departure text-base leading-5 theme-text-primary md:text-lg">{item.tool_name}</h3>
                <p className="text-sm font-departure leading-5 theme-text-soft">{item.description}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] px-4 text-center">
          <span className="font-departure text-xl theme-text-primary md:text-2xl">No tools match this filter</span>
          <span className="mt-2 text-sm theme-text-soft md:text-base">Try another pricing filter</span>
        </div>
      )}
    </section>
  );
}
