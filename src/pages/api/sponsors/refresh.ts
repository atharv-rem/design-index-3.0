import type { APIRoute } from "astro";
import { purgeSponsorPages, refreshSponsors } from "@/lib/sponsors";

export const prerender = false;

const refreshToken =
  import.meta.env.SPONSORS_REFRESH_TOKEN ??
  (typeof process !== "undefined" ? process.env?.SPONSORS_REFRESH_TOKEN : undefined);

// Call after editing the `sponsors` table: overwrites the long-lived Redis copy.
export const POST: APIRoute = async ({ request }) => {
  const authorization = request.headers.get("authorization");

  if (!refreshToken || authorization !== `Bearer ${refreshToken}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sponsors = await refreshSponsors();

  if (!sponsors) {
    return Response.json(
      { error: "Failed to refresh sponsors." },
      { status: 502 },
    );
  }

  const pagesPurged = await purgeSponsorPages();

  return Response.json({ refreshed: sponsors.length, pagesPurged });
};
