const UTM_SOURCE = "designindex.xyz";

type UtmOptions = {
  /** Where on our site the click happened, e.g. "tool-page" or "sponsor-strip". */
  content?: string;
};

/**
 * Tags an outbound link so the destination's analytics attributes the visit to us.
 * Leaves the URL untouched if it already carries a utm_source (e.g. affiliate links)
 * or isn't a valid http(s) URL.
 */
export function withUtm(url: string, { content }: UtmOptions = {}): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return url;
    if (u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", UTM_SOURCE);
    u.searchParams.set("utm_medium", "referral");
    if (content) u.searchParams.set("utm_content", content);
    return u.toString();
  } catch {
    return url;
  }
}
