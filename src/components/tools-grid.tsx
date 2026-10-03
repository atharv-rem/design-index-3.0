import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroupPrimitive, RadioPrimitive } from "@/components/ui/radio-group";
import { segmentedControlItemVariants, segmentedControlRootClassName } from "@/lib/segmented-control";
import { getOptimizedImageUrl } from "@/lib/images";
import ToolImage from "@/components/tool-image";
import type { ToolCard } from "@/lib/tools";
import type { SponsorCard } from "@/lib/sponsors";


type PricingFilter = "free" | "paid" | "freemium" | "all";

type ToolsGridProps = {
  category: string;
  initialTools: ToolCard[];
  sponsors?: SponsorCard[];
};

// One sponsored card after every N tools (2 rows on the 4-column grid).
const SPONSOR_INTERVAL = 8;

// First row on the 4-column grid loads eagerly so above-the-fold images aren't deferred.
const PRIORITY_IMAGE_COUNT = 4;

type GridEntry =
  | { kind: "tool"; tool: ToolCard }
  | { kind: "sponsor"; sponsor: SponsorCard; key: string };

const filterItemClassName = segmentedControlItemVariants({
  className: "flex-1 font-google font-semibold sm:flex-none",
  state: "checked",
});

const filters: { value: PricingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
  { value: "freemium", label: "Freemium" },
];


export default function ToolsGrid({ category, initialTools, sponsors: allSponsors = [] }: ToolsGridProps) {
  const sponsors = useMemo(
    () => allSponsors.filter((sponsor) => !sponsor.homepage_only),
    [allSponsors],
  );
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

  const counts = useMemo(
    () => ({
      all: tools.length,
      free: tools.filter((item) => item.pricing === "free").length,
      paid: tools.filter((item) => item.pricing === "paid").length,
      freemium: tools.filter((item) => item.pricing === "free,paid").length,
    }),
    [tools]
  );

  const entries = useMemo(() => {
    const result: GridEntry[] = [];
    let sponsorCount = 0;

    filtered.forEach((tool, index) => {
      result.push({ kind: "tool", tool });

      if (sponsors.length > 0 && (index + 1) % SPONSOR_INTERVAL === 0) {
        const sponsor = sponsors[sponsorCount % sponsors.length];
        result.push({ kind: "sponsor", sponsor, key: `sponsor-${sponsor.id}-${sponsorCount}` });
        sponsorCount += 1;
      }
    });

    return result;
  }, [filtered, sponsors]);

  return (
    <section className="mt-5 w-full">
      <p className="mb-2 font-google font-semibold text-[11px] uppercase tracking-[0.16em] theme-text-soft">Filter by pricing</p>
      <RadioGroupPrimitive
        aria-label="Filter by pricing"
        className={cn(segmentedControlRootClassName, "w-full max-w-full overflow-x-auto sm:w-fit")}
        value={items}
        onValueChange={(value) => setItems(value as PricingFilter)}
      >
        {filters.map((filter) => (
          <RadioPrimitive.Root
            key={filter.value}
            value={filter.value}
            className={filterItemClassName}
          >
            {filter.label}
            <span className="tabular-nums opacity-60">{counts[filter.value]}</span>
          </RadioPrimitive.Root>
        ))}
      </RadioGroupPrimitive>

      {filtered.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {entries.map((entry, index) => {
            const isPriority = index < PRIORITY_IMAGE_COUNT;
            const isSponsor = entry.kind === "sponsor";
            const item = isSponsor
              ? {
                  key: entry.key,
                  href: entry.sponsor.website_url,
                  name: entry.sponsor.name,
                  description: entry.sponsor.description,
                  og_image_link: entry.sponsor.og_image_link,
                }
              : {
                  key: String(entry.tool.id),
                  href: `/${entry.tool.id}/${encodeURIComponent(entry.tool.tool_name)}`,
                  name: entry.tool.tool_name,
                  description: entry.tool.description,
                  og_image_link: entry.tool.og_image_link,
                };

            return (
              <a
                key={item.key}
                href={item.href}
                {...(isSponsor
                  ? { target: "_blank", rel: "sponsored noopener noreferrer" }
                  : { "data-astro-prefetch": "viewport" })}
                className="group relative flex flex-col overflow-hidden rounded-xl bg-[var(--app-surface-soft)] shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-black/5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_-12px_rgb(0_0_0/0.1)] dark:shadow-[0_4px_14px_rgb(0_0_0/0.8),0_14px_36px_-8px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)] dark:ring-white/10 dark:hover:shadow-[0_6px_18px_rgb(0_0_0/0.85),0_22px_48px_-8px_rgb(0_0_0/1),inset_0_1px_0_rgb(255_255_255/0.08)]"
              >
                {isSponsor && (
                  <span className="absolute left-2.5 top-2.5 z-10 rounded-md bg-[var(--app-bg)]/80 px-2 py-0.5 font-google text-[10px] font-semibold uppercase tracking-[0.1em] theme-text-primary backdrop-blur">
                    Sponsored
                  </span>
                )}
                <div className="overflow-hidden [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04]">
                  <ToolImage
                    alt={item.description.toLowerCase()}
                    priority={isPriority}
                    width={1200}
                    height={675}
                    src={
                      getOptimizedImageUrl(
                        item.og_image_link,
                        { width: 640, quality: 78 },
                      ) || undefined
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <h3 className="font-google text-[17px] font-semibold leading-snug theme-text-primary">{item.name}</h3>
                  <p className="line-clamp-2 font-google text-sm font-medium leading-5 theme-text-soft">{item.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div
          role="status"
          className="mt-6 flex min-h-56 flex-col items-center justify-center rounded-xl bg-[var(--app-surface-soft)] px-6 py-10 text-center"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--sidebar-accent)] theme-text-muted">
            <SearchX className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 font-google text-lg font-semibold theme-text-primary">
            No {filters.find((filter) => filter.value === items)?.label.toLowerCase()} tools here yet
          </p>
          <p className="mt-1 max-w-sm font-google text-sm font-medium theme-text-soft">
            Nothing in this category matches that pricing. Try a different filter or view everything.
          </p>
          <button
            type="button"
            onClick={() => setItems("all")}
            className="mt-5 rounded-lg bg-[var(--app-text)] px-3.5 py-1.5 font-google text-sm font-semibold text-[var(--app-bg)] transition-opacity hover:opacity-85"
          >
            Show all tools
          </button>
        </div>
      )}
    </section>
  );
}
