import type { APIRoute } from "astro";

import {
  getToolWithSuggestions,
  isValidToolId,
} from "@/lib/get-tool";

export const prerender = false;

export const GET: APIRoute = async ({
  params,
  cache,
}) => {
  const toolId = Number((params.id ?? "").trim());

  if (!isValidToolId(toolId)) {
    return Response.json(
      { error: "Invalid tool id." },
      { status: 400 },
    );
  }

  let payload;

  try {
    payload = await getToolWithSuggestions(toolId);
  } catch (error) {
    console.error(`[api/tools] Lookup failed for ${toolId}:`, error);

    return Response.json(
      { error: "Failed to load tool." },
      { status: 502 },
    );
  }

  if (!payload) {
    return Response.json(
      { error: "Tool not found." },
      { status: 404 },
    );
  }

  if (cache.enabled) {
    cache.set({
      maxAge: 86400,
      swr: 43200,
    });
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control":
        "public, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
};
