import {
  getCachedJson,
  setCachedJsonInBackground,
  toolCacheKey,
} from "@/lib/cache";

import { getToolsByCategory } from "@/lib/get-tool-by-category";
import { supabase } from "@/lib/supabase";

import {
  normalizeToolDetail,
  type SupabaseToolRow,
  type ToolCard,
  type ToolDetail,
} from "@/lib/tools";

export type ToolDetailPayload = {
  tool: ToolDetail;
  suggestedTools: ToolCard[];
};

export const SUGGESTION_COUNT = 3;

export const isValidToolId = (id: number) =>
  Number.isInteger(id) && id > 0;

// The tool is cached once under its own key; suggestions come from the
// cached category list, so no row is duplicated across entries.
const getToolDetail = async (id: number): Promise<ToolDetail | null> => {
  const cacheKey = toolCacheKey(id);

  const cached = await getCachedJson<ToolDetail>(cacheKey);

  if (cached) {
    console.log(`cache hit: tool page ${id} (${cacheKey})`);

    return cached;
  }

  console.log(`cache miss: tool page ${id} (${cacheKey})`);

  const { data, error } = await supabase
    .from("design_index")
    .select(
      `primary_key, tool_name, category, pricing, description, extended_description, og_image_link, website`,
    )
    .eq("primary_key", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch tool ${id}: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const tool = normalizeToolDetail(data as SupabaseToolRow);

  setCachedJsonInBackground(cacheKey, tool);

  return tool;
};

// Same-category tools closest to this one by id.
const getSuggestedTools = async (tool: ToolDetail): Promise<ToolCard[]> => {
  if (!tool.category) {
    return [];
  }

  try {
    const sameCategory = await getToolsByCategory(tool.category);

    return sameCategory
      .filter((item) => item.id !== tool.id)
      .sort((a, b) => Math.abs(a.id - tool.id) - Math.abs(b.id - tool.id) || a.id - b.id)
      .slice(0, SUGGESTION_COUNT);
  } catch (error) {
    console.error(`[tools] Failed to load suggestions for tool ${tool.id}:`, error);
    return [];
  }
};

/** Returns null when the tool does not exist; throws if the database is unreachable. */
export const getToolWithSuggestions = async (id: number): Promise<ToolDetailPayload | null> => {
  const tool = await getToolDetail(id);

  if (!tool) {
    return null;
  }

  return {
    tool,
    suggestedTools: await getSuggestedTools(tool),
  };
};
