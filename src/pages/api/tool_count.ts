import type { APIRoute } from "astro";
import { logError, note, timed } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { log } = locals;

  try {
    const { count, error } = await timed("db", "the tool count", () =>
      supabase
        .from("design_index")
        .select("*", { count: "exact", head: true }),
    );

    if (error) {
      logError("Could not count the tools in the database.", new Error(error.message), {
        toolCount: { databaseErrorCode: error.code },
      });
      return Response.json(
        { error: "Failed to fetch tool count." },
        { status: 500 }
      );
    }

    log.set({ toolCount: { count: count || 0 } });
    note(`Counted ${count || 0} tools in the database.`);

    return Response.json(
      { count: count || 0 },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      }
    );
  } catch (err) {
    logError("Counting the tools crashed unexpectedly.", err);
    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
};