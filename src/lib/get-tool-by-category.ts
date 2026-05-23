import {
  CACHE_TTL_SECONDS,
  getCachedJson,
  setCachedJson,
} from "@/lib/cache";

import { supabase } from "@/lib/supabase";

import {
  normalizeToolCards,
  type ToolCard,
} from "@/lib/tools";

export async function getToolsByCategory(
  category: string,
): Promise<ToolCard[]> {
  const cacheKey =
    `design-index:tools:${category}`;

  const cached = await getCachedJson<ToolCard[]>(  cacheKey, );

  if (cached) {
    console.log("cache hit");

    return cached;
  }

  const { data, error } = await supabase
    .from("design_index")
    .select(
      `
      primary_key,
      tool_name,
      description,
      og_image_link,
      pricing
      `,
    )
    .eq("category", category);

  if (error) {
    throw new Error(
      "Failed to fetch tools",
    );
  }

  const tools =
    normalizeToolCards(data);

  void setCachedJson(
    cacheKey,
    tools,
    CACHE_TTL_SECONDS,
  );

  console.log("cache miss");

  return tools;
}