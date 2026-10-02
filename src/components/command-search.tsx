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
import type { ToolResult } from "@/zustand_store/useSearchStore";

type SearchItem = {
  value: string;
  label: string;
  href: string;
  description?: string;
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

    return [
      { value: "Relevant", items: relevant.slice(0, MAX_ITEMS_PER_GROUP).map(toItem) },
      { value: "Similar", items: similar.slice(0, MAX_ITEMS_PER_GROUP).map(toItem) },
    ].filter((group) => group.items.length > 0);
  }, [trimmed, results]);

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
                        window.location.assign(item.href);
                      }}
                      render={<a href={item.href} />}
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
