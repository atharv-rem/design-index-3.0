import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";
import type { ToolResult } from "@/zustand_store/useSearchStore";

let nlpInstance: any = null;
let itsInstance: any = null;

function getNLP() {
  if (typeof window === "undefined") {
    return { nlp: null, its: null };
  }

  if (!nlpInstance) {
    nlpInstance = winkNLP(model);
    itsInstance = nlpInstance.its;
  }

  return {
    nlp: nlpInstance,
    its: itsInstance,
  };
}

export function extractKeywords(text: string): string[] {
  try {
    const { nlp, its } = getNLP();

    if (!nlp || !its) {
      throw new Error("NLP model unavailable");
    }

    const doc = nlp.readDoc(text);

    let mainKeywords = doc
      .tokens()
      .filter((token: any) => {
        const pos = token.out(its.pos);

        // Removed VERB for cleaner search
        return ["NOUN", "ADJ", "PROPN"].includes(pos);
      })
      .out(its.lemma) as string[];

    const customStopwords = [
      "want",
      "need",
      "use",
      "get",
      "have",
      "make",
      "find",
      "see",
      "create",
      "show",
      "add",
      "help",
      "look",
      "tool",
      "tools",
      "website",
      "websites",
      "app",
      "apps",
      "best",
      "good",
    ];

    mainKeywords = mainKeywords.filter(
      (word) =>
        word.length > 1 &&
        /[a-z]/i.test(word) &&
        !customStopwords.includes(word.toLowerCase())
    );

    // Regex fallback for terms like 3d, ai, ui, etc.
    const regexFallback =
      text.toLowerCase().match(/\b[\da-z\-]{2,}\b/g) || [];

    const extraKeywords = regexFallback.filter(
      (w) => /\d/.test(w) || w.length <= 3
    );

    // Merge + dedupe
    let finalKeywords = [
      ...new Set([...mainKeywords, ...extraKeywords]),
    ]
      .map((k) => k.toLowerCase())

      // singular normalization
      .map((k) => {
        if (k.endsWith("s") && k.length > 3) {
          return k.slice(0, -1);
        }

        return k;
      })

      // remove duplicates again
      .filter((value, index, self) => self.indexOf(value) === index);

    return finalKeywords;
  } catch (err) {
    console.error("Keyword extraction error:", err);

    // Basic fallback
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }
}

/**
 * Runs the same search the home page uses: extract keywords with Wink NLP,
 * then rank tools through /api/search. Resolves to [] when no usable keywords
 * can be extracted and throws when the request fails.
 */
export async function searchTools(query: string, signal?: AbortSignal): Promise<ToolResult[]> {
  const keywords = extractKeywords(query.trim());

  if (keywords.length === 0) {
    return [];
  }

  const res = await fetch(`/api/search?keywords=${encodeURIComponent(keywords.join(","))}`, { signal });

  if (!res.ok) {
    throw new Error("Search request failed");
  }

  return (await res.json()) as ToolResult[];
}
