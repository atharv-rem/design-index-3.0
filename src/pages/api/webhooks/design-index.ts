import type { APIRoute } from "astro";

import {
  categoryCacheKey,
  deleteCached,
  toolCacheKey,
} from "@/lib/cache";
import { RECENT_TOOLS_TAG, categoryTag, purgePageTags, toolTag } from "@/lib/page-cache";
import { RECENT_TOOLS_CACHE_KEY } from "@/lib/recent-tools";

export const prerender = false;

const env = (name: string) =>
  import.meta.env[name] ??
  (typeof process !== "undefined" ? process.env?.[name] : undefined);

const webhookSecret =
  env("SUPABASE_WEBHOOK_SECRET") ??
  env("CACHE_PURGE_TOKEN") ??
  env("SPONSORS_REFRESH_TOKEN");

type ToolRow = {
  primary_key?: number;
  category?: string | null;
  tool_name?: string | null;
  description?: string | null;
  og_image_link?: string | null;
  pricing?: string | null;
};

// Supabase Database Webhook payload for the `design_index` table.
type WebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  record?: ToolRow | null;
  old_record?: ToolRow | null;
};

// Fields that appear on the category-list cards (see get-tool-by-category.ts).
const CARD_FIELDS = [
  "tool_name",
  "description",
  "og_image_link",
  "pricing",
  "category",
] as const;

const cardChanged = (before: ToolRow, after: ToolRow) =>
  CARD_FIELDS.some((field) => before[field] !== after[field]);

/** Works out the minimal Redis keys and page tags a row change makes stale. */
const getStale = ({ type, record, old_record }: WebhookPayload) => {
  const keys = new Set<string>();
  const tags = new Set<string>();

  for (const row of [record, old_record]) {
    if (row?.primary_key) {
      keys.add(toolCacheKey(row.primary_key));
      tags.add(toolTag(row.primary_key));
    }
  }

  // The tool's own entry is always dropped; category lists only when a card on them changed.
  // Without an old row to diff against, assume the card changed.
  const listChanged =
    type !== "UPDATE" || !record || !old_record || cardChanged(old_record, record);

  if (listChanged) {
    // The homepage "recently added" list is built from the same card fields.
    keys.add(RECENT_TOOLS_CACHE_KEY);
    tags.add(RECENT_TOOLS_TAG);

    for (const row of [record, old_record]) {
      if (row?.category) {
        keys.add(categoryCacheKey(row.category));
        tags.add(categoryTag(row.category));
      }
    }
  }

  return { keys: [...keys], tags: [...tags] };
};

// Point a Supabase Database Webhook (INSERT/UPDATE/DELETE on `design_index`) here, with
// header `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>`.
// Clears the Redis copies first, then the edge-cached pages built from them.
export const POST: APIRoute = async ({ request }) => {
  if (!webhookSecret || request.headers.get("authorization") !== `Bearer ${webhookSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: WebhookPayload;

  try {
    payload = (await request.json()) as WebhookPayload;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (payload.table !== "design_index" || !payload.type) {
    return Response.json({ error: "Not a design_index change." }, { status: 400 });
  }

  const { keys, tags } = getStale(payload);

  if (!keys.length) {
    return Response.json({ deleted: 0, keys, tags });
  }

  let deleted: number;

  try {
    deleted = await deleteCached(keys);
  } catch {
    // Non-2xx lets Supabase surface the failed delivery.
    return Response.json({ error: "Failed to purge cache." }, { status: 502 });
  }

  // After Redis: a page re-rendered before the delete would re-cache the old rows.
  const pagesPurged = await purgePageTags(tags);

  console.log(
    `[webhook] ${payload.type} design_index -> purged ${keys.join(", ")}; pages ${tags.join(", ")} (${pagesPurged ? "ok" : "failed"})`,
  );

  if (!pagesPurged) {
    return Response.json({ error: "Failed to purge cached pages.", deleted, keys, tags }, { status: 502 });
  }

  return Response.json({ deleted, keys, tags });
};
