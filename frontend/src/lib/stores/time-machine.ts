import { create } from "zustand";
import type { DashboardData } from "@/types/dashboard";

interface TimeMachineState {
  active: boolean;
  startDate: string;
  endDate: string;
  compareStartDate: string;
  compareEndDate: string;
  comparing: boolean;
  loading: boolean;
  filteredData: DashboardData | null;
  compareData: DashboardData | null;
  setActive: (active: boolean) => void;
  setDateRange: (start: string, end: string) => void;
  setCompareRange: (start: string, end: string) => void;
  setComparing: (comparing: boolean) => void;
  fetchFilteredData: (dashboardId: string) => Promise<void>;
  reset: () => void;
}

export const useTimeMachineStore = create<TimeMachineState>((set, get) => ({
  active: false,
  startDate: "",
  endDate: "",
  compareStartDate: "",
  compareEndDate: "",
  comparing: false,
  loading: false,
  filteredData: null,
  compareData: null,
  setActive: (active) => set({ active, filteredData: active ? get().filteredData : null, compareData: null }),
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),
  setCompareRange: (start, end) => set({ compareStartDate: start, compareEndDate: end }),
  setComparing: (comparing) => set({ comparing, compareData: null }),
  fetchFilteredData: async (dashboardId) => {
    const { startDate, endDate, comparing, compareStartDate, compareEndDate } = get();
    if (!startDate || !endDate) return;
    set({ loading: true });
    try {
      const token = localStorage.getItem("access_token");
      const body: Record<string, string> = { start: startDate, end: endDate };
      if (comparing && compareStartDate && compareEndDate) {
        body.compare_start = compareStartDate;
        body.compare_end = compareEndDate;
      }
      const { API_BASE_URL } = await import("@/lib/constants");
      const res = await fetch(`${API_BASE_URL}/dashboards/${dashboardId}/time-machine/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      set({ filteredData: data.period_a, compareData: data.period_b ?? null, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  reset: () => set({ active: false, startDate: "", endDate: "", compareStartDate: "", compareEndDate: "", comparing: false, loading: false, filteredData: null, compareData: null }),
}));
