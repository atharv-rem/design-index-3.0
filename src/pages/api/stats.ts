export const prerender = false;

export async function GET() {
  const apiKey = import.meta.env.DATABUDDY_API_KEY;
  const websiteId = import.meta.env.DATABUDDY_WEBSITE_ID;

  if (!apiKey || !websiteId) {
    return new Response(
      JSON.stringify({ error: "Missing API credentials" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(`https://api.databuddy.cc/v1/websites/${websiteId}/stats?period=30d`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats from Databuddy');
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ pageviews: data.pageviews || 0 }), 
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}