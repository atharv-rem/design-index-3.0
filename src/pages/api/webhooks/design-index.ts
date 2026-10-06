import type { APIRoute } from "astro";

import {
  categoryCacheKey,
  deleteCached,
  toolCacheKey,
} from "@/lib/cache";
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

/** Works out the minimal set of Redis keys a row change makes stale. */
const getStaleKeys = ({ type, record, old_record }: WebhookPayload): string[] => {
  const keys = new Set<string>();

  for (const row of [record, old_record]) {
    if (row?.primary_key) {
      keys.add(toolCacheKey(row.primary_key));
    }
  }

  // The tool's own entry is always dropped; category lists only when a card on them changed.
  // Without an old row to diff against, assume the card changed.
  const listChanged =
    type !== "UPDATE" || !record || !old_record || cardChanged(old_record, record);

  if (listChanged) {
    // The homepage "recently added" list is built from the same card fields.
    keys.add(RECENT_TOOLS_CACHE_KEY);

    for (const row of [record, old_record]) {
      if (row?.category) {
        keys.add(categoryCacheKey(row.category));
      }
    }
  }

  return [...keys];
};

// Point a Supabase Database Webhook (INSERT/UPDATE/DELETE on `design_index`) here, with
// header `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>`.
// Only Redis is cleared; edge-cached page HTML expires on its own TTL.
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

  const keys = getStaleKeys(payload);

  if (!keys.length) {
    return Response.json({ deleted: 0, keys });
  }

  try {
    const deleted = await deleteCached(keys);

    console.log(`[webhook] ${payload.type} design_index -> purged ${keys.join(", ")}`);

    return Response.json({ deleted, keys });
  } catch {
    // Non-2xx lets Supabase surface the failed delivery.
    return Response.json({ error: "Failed to purge cache." }, { status: 502 });
  }
};
