import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";
import { normalizeTools } from "@/lib/tools";

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

  return Response.json(normalizeTools(data));
};
