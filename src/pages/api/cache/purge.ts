import type { APIRoute } from "astro";

import {
  CATEGORY_KEY_PREFIX,
  TOOL_KEY_PREFIX,
  categoryCacheKey,
  deleteCached,
  toolCacheKey,
} from "@/lib/cache";
import { TOOL_DATA_TAG, categoryTag, purgePageTags, toolTag } from "@/lib/page-cache";

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
// Clears the Redis copies, then the edge-cached pages built from them.
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

  let deleted: number;

  try {
    deleted = body.all === true
      ? await deleteCached([], [TOOL_KEY_PREFIX, CATEGORY_KEY_PREFIX])
      : await deleteCached([...ids.map(toolCacheKey), ...categories.map(categoryCacheKey)]);
  } catch {
    return Response.json({ error: "Failed to purge cache." }, { status: 502 });
  }

  // After Redis: a page re-rendered before the delete would re-cache the old rows.
  const pagesPurged = await purgePageTags(
    body.all === true
      ? [TOOL_DATA_TAG]
      : [...ids.map(toolTag), ...categories.map(categoryTag)],
  );

  if (!pagesPurged) {
    return Response.json({ error: "Failed to purge cached pages.", deleted }, { status: 502 });
  }

  return Response.json({ deleted, pagesPurged });
};
