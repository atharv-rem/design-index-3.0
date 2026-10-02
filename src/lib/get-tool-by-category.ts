import {
  categoryCacheKey,
  getCachedJson,
  setCachedJsonInBackground,
} from "@/lib/cache";

import { supabase } from "@/lib/supabase";

import {
  normalizeToolCards,
  type ToolCard,
} from "@/lib/tools";

export async function getToolsByCategory(
  category: string,
): Promise<ToolCard[]> {
  const cacheKey = categoryCacheKey(category);

  const cached = await getCachedJson<ToolCard[]>(cacheKey);

  if (cached) {
    console.log(`cache hit: ${category} page (${cacheKey})`);

    return cached;
  }

  console.log(`cache miss: ${category} page (${cacheKey})`);

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

  setCachedJsonInBackground(cacheKey, tools);

  return tools;
}
