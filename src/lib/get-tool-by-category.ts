import { CACHE_TTL_SECONDS, getCachedJson, setCachedJson } from "@/lib/cache";
import { supabase } from "@/lib/supabase";
import { normalizeTools, type ToolItem } from "@/lib/tools";

export async function getToolsByCategory(
	category: string,
): Promise<ToolItem[]> {
	const cacheKey = `design-index:tools:${category}`;

	// Redis HIT
	const cached = await getCachedJson<ToolItem[]>(cacheKey);

	if (cached) {
		console.log("cache hit");
		return cached;
	}

	// Supabase query
	const { data, error } = await supabase
		.from("design_index")
		.select("primary_key, tool_name, pricing, website, description, og_image_link, category, extended_description")
		.eq("category", category);

	if (error) {
		throw new Error("Failed to fetch tools");
	}

	const tools = normalizeTools(data);

	// Redis SET
	await setCachedJson(
		cacheKey,
		tools,
		CACHE_TTL_SECONDS,
	);

	console.log("cache miss");

	return tools;
}
