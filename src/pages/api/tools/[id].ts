import type { APIRoute } from "astro";
import { CACHE_TTL_SECONDS, getCachedJson, setCachedJson } from "@/lib/cache";
import { supabase } from "@/lib/supabase";
import {
  normalizeTool,
  normalizeTools,
  type SupabaseToolRow,
  type ToolItem,
} from "@/lib/tools";

type ToolDetailPayload = {
  tool: ToolItem;
  suggestedTools: ToolItem[];
};

export const GET: APIRoute = async ({ params }) => {
  const idParam = (params.id ?? "").trim();
  const toolId = Number(idParam);

  if (!idParam || Number.isNaN(toolId)) {
    return Response.json({ error: "Missing tool id." }, { status: 400 });
  }

  const cacheKey = `design-index:tools:detail:id:${toolId}`;
  const cachedPayload = await getCachedJson<ToolDetailPayload>(cacheKey);

  if (cachedPayload) {
    return Response.json(cachedPayload, {
      headers: {
        "x-cache": "hit",
      },
    });
  }

  const { data: toolData, error: toolError } = await supabase
    .from("design_index")
    .select(
      "primary_key, tool_name, pricing, extended_description, og_image_link, website",
    )
    .eq("primary_key", toolId)
    .single<SupabaseToolRow>();

  if (toolError || !toolData) {
    return Response.json(
      { error: "Tool not found." },
      { status: 404 },
    );
  }

  const normalizedTool = normalizeTool(toolData);

  const { data: nextToolsData, error: nextToolsError } = await supabase
    .from("design_index")
    .select("primary_key, tool_name, category, pricing, og_image_link, description, website")
    .gt("primary_key", toolId)
    .order("primary_key", { ascending: true })
    .limit(3);

  if (nextToolsError) {
    return Response.json(
      { error: "Unable to fetch suggested tools." },
      { status: 500 },
    );
  }

  let suggestedTools = normalizeTools(nextToolsData);

  if (suggestedTools.length < 3) {
    const remaining = 3 - suggestedTools.length;
    const excludedIds = [normalizedTool.id, ...suggestedTools.map((item) => item.id)];

    const { data: fallbackToolsData, error: fallbackToolsError } = await supabase
      .from("design_index")
      .select("primary_key, tool_name, category, pricing, og_image_link, description, website")
      .lte("primary_key", toolId)
      .order("primary_key", { ascending: true })
      .limit(remaining + 1);

    if (fallbackToolsError) {
      return Response.json(
        { error: "Unable to fetch suggested tools." },
        { status: 500 },
      );
    }

    const fallbackTools = normalizeTools(fallbackToolsData).filter(
      (item) => !excludedIds.includes(item.id),
    );

    suggestedTools = [...suggestedTools, ...fallbackTools].slice(0, 3);
  }

  const payload: ToolDetailPayload = {
    tool: normalizedTool,
    suggestedTools,
  };

  await setCachedJson(cacheKey, payload, CACHE_TTL_SECONDS);

  return Response.json(payload, {
    headers: {
      "x-cache": "miss",
    },
  });
};
