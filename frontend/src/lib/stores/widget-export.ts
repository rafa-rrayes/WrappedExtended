import { create } from "zustand";

interface WidgetExportState {
  open: boolean;
  sectionId: string | null;
  theme: "dark" | "light";
  aspectRatio: "1:1" | "16:9" | "9:16";
  setOpen: (open: boolean, sectionId?: string | null) => void;
  setTheme: (theme: "dark" | "light") => void;
  setAspectRatio: (ratio: "1:1" | "16:9" | "9:16") => void;
  reset: () => void;
}

export const useWidgetExportStore = create<WidgetExportState>((set) => ({
  open: false,
  sectionId: null,
  theme: "dark",
  aspectRatio: "16:9",
  setOpen: (open, sectionId = null) => set({ open, sectionId }),
  setTheme: (theme) => set({ theme }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  reset: () => set({ open: false, sectionId: null, theme: "dark", aspectRatio: "16:9" }),
}));
