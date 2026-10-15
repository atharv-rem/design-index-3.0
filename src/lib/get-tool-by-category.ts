import {
  categoryCacheKey,
  getCachedJson,
  setCachedJsonInBackground,
} from "@/lib/cache";

import { timed } from "@/lib/logger";
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
    return cached;
  }

  const { data, error } = await timed("db", `the ${category} category list`, () =>
    supabase
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
      .eq("category", category),
  );

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
