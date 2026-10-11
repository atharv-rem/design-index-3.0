"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
} from "@/components/ui/command";
import { Drawer, DrawerPopup } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { searchTools } from "@/lib/search";
import type { SponsorCard } from "@/lib/sponsors";
import { withUtm } from "@/lib/utm";
import type { ToolResult } from "@/zustand_store/useSearchStore";

type SearchItem = {
  value: string;
  label: string;
  href: string;
  description?: string;
  sponsored?: boolean;
};

type SearchGroup = {
  value: string;
  items: SearchItem[];
};

const DEBOUNCE_MS = 400;
const MAX_ITEMS_PER_GROUP = 20;

const browseGroup: SearchGroup = {
  value: "Browse",
  items: [
    { value: "tools", label: "Tools", href: "/tools" },
    { value: "colours", label: "Colours", href: "/colours" },
    { value: "mockups", label: "Mockups", href: "/mockups" },
    { value: "illustrations", label: "Illustrations", href: "/illustrations" },
    { value: "ui", label: "UI", href: "/ui" },
    { value: "icons", label: "Icons", href: "/icons" },
    { value: "fonts", label: "Fonts", href: "/fonts" },
    { value: "design-inspo", label: "Design Inspiration", href: "/design-inspo" },
  ],
};

// Fetched once per page load, and only once the palette is first used.
let sponsorsPromise: Promise<SponsorCard[]> | undefined;

function loadSponsors(): Promise<SponsorCard[]> {
  sponsorsPromise ??= fetch("/api/sponsors")
    .then((res) => (res.ok ? res.json() : { sponsors: [] }))
    .then((data: { sponsors?: SponsorCard[] }) =>
      (data.sponsors ?? []).filter((sponsor) => !sponsor.homepage_only && sponsor.website_url),
    )
    .catch(() => {
      sponsorsPromise = undefined;
      return [];
    });

  return sponsorsPromise;
}

function toSponsorItem(sponsor: SponsorCard): SearchItem {
  return {
    value: `sponsor-${sponsor.id}`,
    label: sponsor.name,
    description: sponsor.description,
    href: withUtm(sponsor.website_url, { content: "command-search" }),
    sponsored: true,
  };
}

function toItem(tool: ToolResult): SearchItem {
  return {
    value: String(tool.id),
    label: tool.tool_name,
    description: tool.description,
    href: `/${tool.id}/${encodeURIComponent(tool.tool_name)}`,
  };
}

function SearchPanel({ showHints = false }: { showHints?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ToolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadSponsors().then((list) => {
      if (!cancelled) setSponsors(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const data = await searchTools(trimmed, controller.signal);
        setResults(data);
        setFailed(false);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Command search error:", err);
        setFailed(true);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const groups = useMemo<SearchGroup[]>(() => {
    if (!trimmed) {
      return [browseGroup];
    }

    // Same relevance split as the home page results tabs.
    const relevant = results.filter((item) => item.matchedKeywordsCount > 1);
    const similar = results.filter((item) => item.matchedKeywordsCount === 1);

    const found = [
      { value: "Relevant", items: relevant.slice(0, MAX_ITEMS_PER_GROUP).map(toItem) },
      { value: "Similar", items: similar.slice(0, MAX_ITEMS_PER_GROUP).map(toItem) },
    ].filter((group) => group.items.length > 0);

    // A sponsor is pinned as the top result whenever the search has matches.
    if (found.length > 0 && sponsors.length > 0) {
      return [{ value: "Sponsored", items: [toSponsorItem(sponsors[0])] }, ...found];
    }

    return found;
  }, [trimmed, results, sponsors]);

  return (
    <div className="flex min-h-0 flex-1 flex-col font-google **:data-[slot=scroll-area-viewport]:touch-pan-y">
      <Command items={groups} mode="none" onValueChange={setQuery} value={query}>
        <CommandInput aria-label="Search design tools" placeholder="Search design tools..." />
        <CommandPanel className="flex min-h-0 flex-1 flex-col">
          <CommandEmpty className="font-(family-name:--font-inter-stack)">
            {loading
              ? "Searching..."
              : failed
                ? "Something went wrong. Please try again."
                : `No tools match "${trimmed}".`}
          </CommandEmpty>
          <CommandList>
            {(group: SearchGroup) => (
              <CommandGroup items={group.items} key={group.value}>
                <CommandGroupLabel>{group.value}</CommandGroupLabel>
                <CommandCollection>
                  {(item: SearchItem) => (
                    <CommandItem
                      key={item.value}
                      onClick={(event) => {
                        event.preventDefault();
                        if (item.sponsored) {
                          window.open(item.href, "_blank", "noopener,noreferrer");
                        } else {
                          window.location.assign(item.href);
                        }
                      }}
                      render={
                        item.sponsored ? (
                          <a href={item.href} rel="sponsored noopener noreferrer" target="_blank" />
                        ) : (
                          <a href={item.href} />
                        )
                      }
                      value={item}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{item.label}</span>
                        {item.description && (
                          <span className="truncate font-(family-name:--font-inter-stack) text-muted-foreground text-xs">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="ms-auto size-4 shrink-0 opacity-0 transition-opacity group-data-highlighted/item:opacity-60"
                      />
                    </CommandItem>
                  )}
                </CommandCollection>
              </CommandGroup>
            )}
          </CommandList>
        </CommandPanel>
        {showHints && (
          <CommandFooter className="font-(family-name:--font-inter-stack)">
            <span>↑↓ to navigate</span>
            <span>↵ to open · esc to close</span>
          </CommandFooter>
        )}
      </Command>
    </div>
  );
}

type CommandSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open} position="bottom">
        <DrawerPopup className="h-[60dvh]" showBar>
          <div className="flex min-h-0 flex-1 flex-col pt-4">
            <SearchPanel />
          </div>
        </DrawerPopup>
      </Drawer>
    );
  }

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandDialogPopup className="h-105">
        <SearchPanel showHints />
      </CommandDialogPopup>
    </CommandDialog>
  );
}
