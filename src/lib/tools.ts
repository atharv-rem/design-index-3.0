export type ToolPricing = "free" | "paid" | "free,paid";

export type SupabaseToolRow = {
  id?: number;
  primary_key?: number;
  tool_name?: string;
  category?: string;
  pricing?: string;
  description?: string;
  extended_description?: string;
  og_image_link?: string;
  website?: string;
  website_url?: string;
};

export type ToolItem = {
  id: number;
  tool_name: string;
  category: string;
  pricing: ToolPricing;
  description: string;
  extended_description: string;
  og_image_link: string;
  website_url: string;
};

const categoryMap: Record<string, string> = {
  colour: "colours",
  design_inspiration: "design-inspo",
  font: "fonts",
  icon: "icons",
  illustration: "illustrations",
  mockup: "mockups",
  tool: "tools",
};

const isToolPricing = (value: string): value is ToolPricing => {
  return value === "free" || value === "paid" || value === "free,paid";
};

export const normalizeTool = (item: SupabaseToolRow): ToolItem => {
  const rawPricing = (item.pricing ?? "free").toLowerCase();
  const pricing: ToolPricing = isToolPricing(rawPricing) ? rawPricing : "free";

  const name = item.tool_name?.trim() || "Untitled Tool";
  const description = item.description?.trim() || "No description available.";

  return {
    id: item.primary_key ?? item.id ?? 0,
    tool_name: name,
    category: categoryMap[item.category ?? ""] ?? (item.category ?? "tools"),
    pricing,
    description,
    extended_description: item.extended_description?.trim() || description,
    og_image_link: item.og_image_link || "https://placehold.co/1200x675?text=Design+Index",
    website_url: item.website_url || item.website || "https://example.com",
  };
};

export const normalizeTools = (rows: SupabaseToolRow[] | null | undefined): ToolItem[] => {
  if (!rows?.length) {
    return [];
  }

  return rows.map(normalizeTool);
};

export async function getToolsByCategory(
	category: string,
): Promise<ToolItem[]> {
	const response = await fetch(
		`${import.meta.env.SITE}/api/tools?category=${encodeURIComponent(category)}`
	);

	if (!response.ok) {
		throw new Error("Failed to fetch tools");
	}

	return response.json();
}
