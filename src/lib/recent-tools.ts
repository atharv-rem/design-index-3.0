import {
  getCachedJson,
  setCachedJsonInBackground,
} from "@/lib/cache";

import { supabase } from "@/lib/supabase";

export type RecentTool = {
  primary_key: number;
  tool_name: string;
  description: string | null;
  og_image_link: string | null;
};

export const RECENT_TOOLS_CACHE_KEY = "design-index:tools:recent";
export const RECENT_TOOLS_COUNT = 10;

// Newest tools first. Cleared by the design_index webhook whenever a tool is added or changed.
export async function getRecentTools(): Promise<RecentTool[]> {
  const cached = await getCachedJson<RecentTool[]>(RECENT_TOOLS_CACHE_KEY);

  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from("design_index")
    .select("primary_key, tool_name, description, og_image_link")
    .order("date", { ascending: false, nullsFirst: false })
    .limit(RECENT_TOOLS_COUNT);

  if (error) {
    console.error("[recent-tools] Failed to fetch:", error.message);
    return [];
  }

  const tools = (data ?? []) as RecentTool[];

  // Don't cache an empty result, so a transient miss can't stick for a day.
  if (tools.length) {
    setCachedJsonInBackground(RECENT_TOOLS_CACHE_KEY, tools);
  }

  return tools;
}
