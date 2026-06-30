import { create } from "zustand";

export type ToolResult = {
  id: number;
  tool_name: string;
  description: string;
  og_image_link: string;
  matchedKeywordsCount: number;
  relevanceScore: number;
};

interface SearchState {
  inputValue: string;
  activeQuery: string;
  loading: boolean;
  results: ToolResult[];
  error: string | null;
  activeTab: "relevant" | "similar";
  stats: { pageviews: number } | null;
  toolcount: number;
  setInputValue: (val: string) => void;
  setActiveQuery: (val: string) => void;
  setLoading: (val: boolean) => void;
  setResults: (val: ToolResult[]) => void;
  setError: (val: string | null) => void;
  setActiveTab: (val: "relevant" | "similar") => void;
  setStats: (val: { pageviews: number } | null) => void;
  setToolcount: (val: number) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  inputValue: "",
  activeQuery: "",
  loading: false,
  results: [],
  error: null,
  activeTab: "relevant",
  stats: null,
  toolcount: 0,
  setInputValue: (val) => set({ inputValue: val }),
  setActiveQuery: (val) => set({ activeQuery: val }),
  setLoading: (val) => set({ loading: val }),
  setResults: (val) => set({ results: val }),
  setError: (val) => set({ error: val }),
  setActiveTab: (val) => set({ activeTab: val }),
  setStats: (val) => set({ stats: val }),
  setToolcount: (val) => set({ toolcount: val }),
  resetSearch: () =>
    set({
      inputValue: "",
      activeQuery: "",
      results: [],
      error: null,
      loading: false,
    }),
}));
