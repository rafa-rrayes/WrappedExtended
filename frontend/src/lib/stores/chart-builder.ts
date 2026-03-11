import { create } from "zustand";

export type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

interface ChartConfig {
  metric: string;
  groupBy: string;
  chartType: ChartType;
  limit: number;
}

interface ChartBuilderState {
  open: boolean;
  config: ChartConfig;
  data: Record<string, unknown>[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  setConfig: (config: Partial<ChartConfig>) => void;
  fetchData: (dashboardId: string) => Promise<void>;
  reset: () => void;
}

const DEFAULT_CONFIG: ChartConfig = {
  metric: "hours",
  groupBy: "artist_name",
  chartType: "bar",
  limit: 20,
};

export const useChartBuilderStore = create<ChartBuilderState>((set, get) => ({
  open: false,
  config: DEFAULT_CONFIG,
  data: [],
  loading: false,
  setOpen: (open) => set({ open }),
  setConfig: (partial) => set({ config: { ...get().config, ...partial } }),
  fetchData: async (dashboardId) => {
    const { config } = get();
    set({ loading: true });
    try {
      const token = localStorage.getItem("access_token");
      const { API_BASE_URL } = await import("@/lib/constants");
      const res = await fetch(`${API_BASE_URL}/dashboards/${dashboardId}/chart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ metric: config.metric, group_by: config.groupBy, limit: config.limit }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      set({ data: json.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  reset: () => set({ config: DEFAULT_CONFIG, data: [], loading: false }),
}));
