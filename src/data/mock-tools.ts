import database from "@/database.json";

export type ToolPricing = "free" | "paid" | "free,paid";

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

type DatabaseTool = {
  primary_key: number;
  tool_name: string;
  category: string;
  pricing: ToolPricing;
  description: string;
  extended_description?: string;
  og_image_link?: string;
  website?: string;
};

const categoryMap: Record<string, string> = {
  colour: "colours",
  design_inspiration: "design-inspo",
  font: "fonts",
  icon: "icons",
  illustration: "illustrations",
  mockup: "mockups",
};

export const mockTools: ToolItem[] = (database as DatabaseTool[]).map((item) => ({
  id: item.primary_key,
  tool_name: item.tool_name,
  category: categoryMap[item.category] ?? item.category,
  pricing: item.pricing,
  description: item.description,
  extended_description: item.extended_description ?? item.description,
  og_image_link: item.og_image_link ?? "https://placehold.co/1200x675?text=Design+Index",
  website_url: item.website ?? "https://example.com",
}));
