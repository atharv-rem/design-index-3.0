import type { APIRoute } from "astro";
import { CACHE_TTL_SECONDS, getCachedJson, setCachedJson } from "@/lib/cache";
import { supabase } from "@/lib/supabase";
import { normalizeTools, type ToolItem } from "@/lib/tools";
import { slugifyToolName } from "@/lib/tool-slug";

type ToolDetailPayload = {
  tool: ToolItem;
  suggestedTools: ToolItem[];
};

export const GET: APIRoute = async ({ params }) => {
  const slug = (params.slug ?? "").trim();

  if (!slug) {
    return Response.json({ error: "Missing tool slug." }, { status: 400 });
  }

  const cacheKey = `design-index:tools:detail:${slug}`;
  const cachedPayload = await getCachedJson<ToolDetailPayload>(cacheKey);

  if (cachedPayload) {
    return Response.json(cachedPayload, {
      headers: {
        "x-cache": "hit",
      },
    });
  }

  const { data, error } = await supabase.from("design_index").select("*");

  if (error) {
    return Response.json(
      { error: "Unable to fetch tool details." },
      { status: 500 },
    );
  }

  const allTools = normalizeTools(data);
  const tool = allTools.find((item) => slugifyToolName(item.tool_name) === slug);

  if (!tool) {
    return Response.json({ error: "Tool not found." }, { status: 404 });
  }

  const suggestedTools = allTools
    .filter((item) => item.id !== tool.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const payload: ToolDetailPayload = { tool, suggestedTools };
  await setCachedJson(cacheKey, payload, CACHE_TTL_SECONDS);

  return Response.json(payload, {
    headers: {
      "x-cache": "miss",
    },
  });
};
