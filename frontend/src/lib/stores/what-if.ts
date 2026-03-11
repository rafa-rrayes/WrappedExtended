import { create } from "zustand";
import type { DashboardData } from "@/types/dashboard";

interface WhatIfState {
  open: boolean;
  excludeArtists: string[];
  excludeTracks: string[];
  minMs: number | null;
  loading: boolean;
  result: DashboardData | null;
  setOpen: (open: boolean) => void;
  toggleArtist: (name: string) => void;
  toggleTrack: (name: string) => void;
  setMinMs: (ms: number | null) => void;
  fetchResult: (dashboardId: string) => Promise<void>;
  reset: () => void;
}

export const useWhatIfStore = create<WhatIfState>((set, get) => ({
  open: false,
  excludeArtists: [],
  excludeTracks: [],
  minMs: null,
  loading: false,
  result: null,
  setOpen: (open) => set({ open }),
  toggleArtist: (name) => {
    const { excludeArtists } = get();
    set({ excludeArtists: excludeArtists.includes(name) ? excludeArtists.filter((a) => a !== name) : [...excludeArtists, name], result: null });
  },
  toggleTrack: (name) => {
    const { excludeTracks } = get();
    set({ excludeTracks: excludeTracks.includes(name) ? excludeTracks.filter((t) => t !== name) : [...excludeTracks, name], result: null });
  },
  setMinMs: (ms) => set({ minMs: ms, result: null }),
  fetchResult: async (dashboardId) => {
    const { excludeArtists, excludeTracks, minMs } = get();
    set({ loading: true });
    try {
      const token = localStorage.getItem("access_token");
      const { API_BASE_URL } = await import("@/lib/constants");
      const body: Record<string, unknown> = {};
      if (excludeArtists.length) body.exclude_artists = excludeArtists;
      if (excludeTracks.length) body.exclude_tracks = excludeTracks;
      if (minMs !== null) body.min_ms = minMs;
      const res = await fetch(`${API_BASE_URL}/dashboards/${dashboardId}/what-if/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      set({ result: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
  reset: () => set({ excludeArtists: [], excludeTracks: [], minMs: null, result: null }),
}));
