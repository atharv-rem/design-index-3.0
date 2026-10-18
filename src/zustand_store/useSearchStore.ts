import { create } from "zustand";

export type ToolResult = {
  id: number;
  tool_name: string;
  description: string;
  og_image_link: string;
  category?: string;
  matchedKeywordsCount: number;
  /** The query words this tool has (strong and weak). */
  matched?: string[];
  /** Matched words on only a tiny share of the tool's pages: not counted in matchedKeywordsCount. */
  weakMatches?: string[];
  /** The tool's best page for its strongest matched word, when that is not its homepage. */
  matchedPage?: { word: string; url: string } | null;
  /** The query names this tool (its website or its exact name). */
  pinned?: boolean;
};

interface SearchState {
  inputValue: string;
  activeQuery: string;
  loading: boolean;
  results: ToolResult[];
  notes: string[];
  error: string | null;
  activeTab: "relevant" | "similar";
  stats: { pageviews: number; visitors: number } | null;
  toolcount: number;
  setInputValue: (val: string) => void;
  setActiveQuery: (val: string) => void;
  setLoading: (val: boolean) => void;
  setResults: (val: ToolResult[]) => void;
  setNotes: (val: string[]) => void;
  setError: (val: string | null) => void;
  setActiveTab: (val: "relevant" | "similar") => void;
  setStats: (val: { pageviews: number; visitors: number } | null) => void;
  setToolcount: (val: number) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  inputValue: "",
  activeQuery: "",
  loading: false,
  results: [],
  notes: [],
  error: null,
  activeTab: "relevant",
  stats: null,
  toolcount: 0,
  setInputValue: (val) => set({ inputValue: val }),
  setActiveQuery: (val) => set({ activeQuery: val }),
  setLoading: (val) => set({ loading: val }),
  setResults: (val) => set({ results: val }),
  setNotes: (val) => set({ notes: val }),
  setError: (val) => set({ error: val }),
  setActiveTab: (val) => set({ activeTab: val }),
  setStats: (val) => set({ stats: val }),
  setToolcount: (val) => set({ toolcount: val }),
  resetSearch: () =>
    set({
      inputValue: "",
      activeQuery: "",
      results: [],
      notes: [],
      error: null,
      loading: false,
    }),
}));
