import type { APIRoute } from "astro";

import {
  getToolWithSuggestions,
  isValidToolId,
} from "@/lib/get-tool";
import { logError, note } from "@/lib/logger";

export const prerender = false;

export const GET: APIRoute = async ({
  params,
  cache,
  locals,
}) => {
  const { log } = locals;
  const toolId = Number((params.id ?? "").trim());

  log.set({ tool: { id: params.id } });

  if (!isValidToolId(toolId)) {
    note("The tool id in the address is not a positive whole number.");

    return Response.json(
      { error: "Invalid tool id." },
      { status: 400 },
    );
  }

  let payload;

  try {
    payload = await getToolWithSuggestions(toolId);
  } catch (error) {
    logError(`Could not load tool ${toolId} from the database.`, error, { tool: { id: toolId } });

    return Response.json(
      { error: "Failed to load tool." },
      { status: 502 },
    );
  }

  if (!payload) {
    log.set({ tool: { found: false } });
    note(`Tool ${toolId} does not exist.`);

    return Response.json(
      { error: "Tool not found." },
      { status: 404 },
    );
  }

  log.set({
    tool: {
      id: toolId,
      name: payload.tool.tool_name,
      category: payload.tool.category,
      similarTools: payload.suggestedTools.length,
    },
  });
  note(
    `Sent tool ${toolId}${payload.tool.category ? ` (${payload.tool.category})` : ""} with ${payload.suggestedTools.length} similar tools.`,
  );

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
