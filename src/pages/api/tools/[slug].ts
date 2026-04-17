import type { APIRoute } from "astro";
import { supabase } from "@/lib/supabase";
import { normalizeTools } from "@/lib/tools";
import { slugifyToolName } from "@/lib/tool-slug";

export const GET: APIRoute = async ({ params }) => {
  const slug = (params.slug ?? "").trim();

  if (!slug) {
    return Response.json({ error: "Missing tool slug." }, { status: 400 });
  }

  const { data, error } = await supabase.from("design_index").select("*");

  if (error) {
    return Response.json(
      { error: "Unable to fetch tool details." },
      { status: 500 },
    );
  }

  const allTools = normalizeTools(data);
  const tool = allTools.find((item) => slugifyToolName(item.tool_name) === slug);

  if (!tool) {
    return Response.json({ error: "Tool not found." }, { status: 404 });
  }

  const suggestedTools = allTools
    .filter((item) => item.id !== tool.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return Response.json({ tool, suggestedTools });
};
