import type { APIRoute } from "astro";
import { logWarn, note } from "@/lib/logger";
import { purgeSponsorPages, refreshSponsors } from "@/lib/sponsors";

export const prerender = false;

const refreshToken =
  import.meta.env.SPONSORS_REFRESH_TOKEN ??
  (typeof process !== "undefined" ? process.env?.SPONSORS_REFRESH_TOKEN : undefined);

// Call after editing the `sponsors` table: overwrites the long-lived Redis copy.
export const POST: APIRoute = async ({ request, locals }) => {
  const { log } = locals;

  const authorization = request.headers.get("authorization");

  if (!refreshToken || authorization !== `Bearer ${refreshToken}`) {
    logWarn("auth", "Someone tried to refresh the sponsor list without a valid token.", {
      tokenConfigured: Boolean(refreshToken),
    });

    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sponsors = await refreshSponsors();

  if (!sponsors) {
    note("Could not reload the sponsor list from the database.");

    return Response.json(
      { error: "Failed to refresh sponsors." },
      { status: 502 },
    );
  }

  const pagesPurged = await purgeSponsorPages();

  log.set({ sponsors: { count: sponsors.length, pageCopiesCleared: pagesPurged } });
  note(`Reloaded ${sponsors.length} sponsors from the database${pagesPurged ? " and cleared the CDN's page copies" : ""}.`);

  return Response.json({ refreshed: sponsors.length, pagesPurged });
};
