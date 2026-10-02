import type { APIRoute } from "astro";

import {
  CATEGORY_KEY_PREFIX,
  TOOL_KEY_PREFIX,
  categoryCacheKey,
  deleteCached,
  toolCacheKey,
} from "@/lib/cache";

export const prerender = false;

const env = (name: string) =>
  import.meta.env[name] ??
  (typeof process !== "undefined" ? process.env?.[name] : undefined);

const purgeToken = env("CACHE_PURGE_TOKEN") ?? env("SPONSORS_REFRESH_TOKEN");

type PurgeBody = {
  ids?: unknown;
  categories?: unknown;
  all?: unknown;
};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

// Call after editing the `design_index` table. Body (all optional):
//   { "ids": [12, 40], "categories": ["font"] } or { "all": true }
// Editing a tool: pass its id and its category (the category list embeds the card).
// Only the Redis copy is cleared; page HTML cached at the edge expires on its own TTL.
export const POST: APIRoute = async ({ request }) => {
  if (!purgeToken || request.headers.get("authorization") !== `Bearer ${purgeToken}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: PurgeBody = {};

  try {
    body = (await request.json()) as PurgeBody;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const ids = asArray(body.ids).map(Number).filter((id) => Number.isInteger(id) && id > 0);
  const categories = asArray(body.categories).filter(
    (category): category is string => typeof category === "string" && category.length > 0,
  );

  if (body.all !== true && !ids.length && !categories.length) {
    return Response.json(
      { error: "Provide ids, categories, or all: true." },
      { status: 400 },
    );
  }

  try {
    const deleted = body.all === true
      ? await deleteCached([], [TOOL_KEY_PREFIX, CATEGORY_KEY_PREFIX])
      : await deleteCached([...ids.map(toolCacheKey), ...categories.map(categoryCacheKey)]);

    return Response.json({ deleted });
  } catch {
    return Response.json({ error: "Failed to purge cache." }, { status: 502 });
  }
};
