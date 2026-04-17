import type { APIRoute } from "astro";
import { CACHE_TTL_SECONDS, getCachedJson, setCachedJson } from "@/lib/cache";
import { supabase } from "@/lib/supabase";
import { normalizeTools, type ToolItem } from "@/lib/tools";

const categoryMap: Record<string, string> = {
  colours: "colour",
  colour: "colour",
  "design-inspo": "design_inspiration",
  design_inspiration: "design_inspiration",
  fonts: "font",
  font: "font",
  icons: "icon",
  icon: "icon",
  illustrations: "illustration",
  illustration: "illustration",
  mockups: "mockup",
  mockup: "mockup",
  tools: "tool",
  tool: "tool",
};

const resolveCategory = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  return categoryMap[value.toLowerCase()] ?? null;
};

export const GET: APIRoute = async ({ url }) => {
  const requestedCategory = resolveCategory(url.searchParams.get("category"));
  const cacheKey = requestedCategory
    ? `design-index:tools:list:${requestedCategory}`
    : "design-index:tools:list:all";

  const cachedTools = await getCachedJson<ToolItem[]>(cacheKey);

  if (cachedTools) {
    return Response.json(cachedTools, {
      headers: {
        "x-cache": "hit",
      },
    });
  }

  let query = supabase.from("design_index").select("*");

  if (requestedCategory) {
    query = query.eq("category", requestedCategory);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json(
      { error: "Unable to fetch tools." },
      { status: 500 },
    );
  }

  const normalized = normalizeTools(data);
  await setCachedJson(cacheKey, normalized, CACHE_TTL_SECONDS);

  return Response.json(normalized, {
    headers: {
      "x-cache": "miss",
    },
  });
};
