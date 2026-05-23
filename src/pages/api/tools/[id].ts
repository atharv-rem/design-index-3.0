import type { APIRoute } from "astro";
import {
  CACHE_TTL_SECONDS,
  getCachedJson,
  setCachedJson,
} from "@/lib/cache";

import { supabase } from "@/lib/supabase";

import {
  normalizeToolDetail,
  normalizeToolCards,
  type SupabaseToolRow,
  type ToolCard,
  type ToolDetail,
} from "@/lib/tools";

type ToolDetailPayload = {
  tool: ToolDetail;
  suggestedTools: ToolCard[];
};

export const GET: APIRoute = async ({
  params,
  cache,
}) => {
  const idParam = (params.id ?? "").trim();

  const toolId = Number(idParam);

  if (!idParam || Number.isNaN(toolId)) {
    return Response.json(
      { error: "Missing tool id." },
      { status: 400 },
    );
  }

  const cacheKey =
    `design-index:tools:detail:id:${toolId}`;

  const cachedPayload =
    await getCachedJson<ToolDetailPayload>(
      cacheKey,
    );

  if (cachedPayload) {
    return Response.json(cachedPayload, {
      headers: {
        "x-cache": "hit",
      },
    });
  }

  const { data, error } = await supabase
    .from("design_index")
    .select(`primary_key, tool_name, pricing, extended_description, og_image_link, website`,
    )
    .gte("primary_key", toolId - 2)
    .lte("primary_key", toolId + 2)
    .order("primary_key", {
      ascending: true,
    });

  if (error || !data?.length) {
    return Response.json(
      { error: "Tool not found." },
      { status: 404 },
    );
  }

  const toolRow = data.find(
    (item) => item.primary_key === toolId,
  );

  if (!toolRow) {
    return Response.json(
      { error: "Tool not found." },
      { status: 404 },
    );
  }

  const suggestionRows = data
    .filter(
      (item) =>
        item.primary_key !== toolId,
    )
    .slice(0, 3);

  const payload: ToolDetailPayload = {
    tool: normalizeToolDetail( toolRow as SupabaseToolRow,),
    suggestedTools: normalizeToolCards(suggestionRows as SupabaseToolRow[],),
  };

  if (cache.enabled) {
    cache.set({
      maxAge: 3600,
    });
  }

  void setCachedJson(
    cacheKey,
    payload,
    CACHE_TTL_SECONDS,
  );

  return Response.json(payload, {
    headers: {
      "Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",

      "x-cache": "miss",
    },
  });
};