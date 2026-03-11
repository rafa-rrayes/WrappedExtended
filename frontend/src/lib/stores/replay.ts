import { create } from "zustand";

interface ReplayState {
  active: boolean;
  playing: boolean;
  speed: number;
  position: number;
  year: number | null;
  setActive: (active: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  setYear: (year: number | null) => void;
  reset: () => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  active: false,
  playing: false,
  speed: 1,
  position: 0,
  year: null,
  setActive: (active) => set({ active }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  setPosition: (position) => set({ position }),
  setYear: (year) => set({ year }),
  reset: () => set({ active: false, playing: false, speed: 1, position: 0, year: null }),
}));
