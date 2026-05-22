export type ToolPricing =
  | "free"
  | "paid"
  | "free,paid";

export type SupabaseToolRow = {
  id?: number;
  primary_key?: number;
  tool_name?: string;
  pricing?: string;
  description?: string;
  extended_description?: string;
  og_image_link?: string;
  website?: string;
  website_url?: string;
};

export type ToolCard = {
  id: number;
  tool_name: string;
  description: string;
  og_image_link: string;
};

export type ToolDetail = {
  id: number;
  tool_name: string;
  pricing: ToolPricing;
  extended_description: string;
  og_image_link: string;
  website_url: string;
};

const isToolPricing = (
  value: string,
): value is ToolPricing => {
  return (
    value === "free" ||
    value === "paid" ||
    value === "free,paid"
  );
};

export const normalizeToolDetail = (
  item: SupabaseToolRow,
): ToolDetail => {
  const rawPricing =
    (item.pricing ?? "free").toLowerCase();

  return {
    id: item.primary_key ?? item.id ?? 0,

    tool_name:
      item.tool_name?.trim() ||
      "Untitled Tool",

    pricing: isToolPricing(rawPricing)
      ? rawPricing
      : "free",

    extended_description:
      item.extended_description?.trim() ||
      "",

    og_image_link:
      item.og_image_link || "",

    website_url:
      item.website_url ||
      item.website ||
      "",
  };
};


export const normalizeToolCard = (
  item: SupabaseToolRow,
): ToolCard => {
  return {
    id: item.primary_key ?? item.id ?? 0,

    tool_name:
      item.tool_name?.trim() ||
      "Untitled Tool",

    description:
      item.description?.trim() || "",

    og_image_link:
      item.og_image_link || "",
  };
};

export const normalizeToolCards = (
  rows:
    | SupabaseToolRow[]
    | null
    | undefined,
): ToolCard[] => {
  if (!rows?.length) {
    return [];
  }

  return rows.map(normalizeToolCard);
};

export async function getToolsByCategory(
  category: string,
): Promise<ToolCard[]> {
  const response = await fetch(
    `${import.meta.env.SITE}/api/tools?category=${encodeURIComponent(category)}`,
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch tools",
    );
  }

  return response.json();
}