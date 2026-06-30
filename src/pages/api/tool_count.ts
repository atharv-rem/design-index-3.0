import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { count, error } = await supabase
      .from("design_index")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Supabase tool count error:", error);
      return Response.json(
        { error: "Failed to fetch tool count." },
        { status: 500 }
      );
    }

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
    console.error("Unhandled error in tool_count API route:", err);
    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
};