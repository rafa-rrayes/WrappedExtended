"use client";

import { useCallback } from "react";
import { toPng } from "html-to-image";
import { useWidgetExportStore } from "@/lib/stores/widget-export";

export function WidgetExportButton({ sectionId }: { sectionId: string }) {
  const { setOpen } = useWidgetExportStore();

  return (
    <button
      onClick={() => setOpen(true, sectionId)}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-text-muted hover:text-green"
      title="Export as image"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    </button>
  );
}

export function WidgetExportModal() {
  const { open, sectionId, theme, aspectRatio, setOpen, setTheme, setAspectRatio, reset } = useWidgetExportStore();

  const handleExport = useCallback(async () => {
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (!el) return;

    try {
      const dataUrl = await toPng(el, {
        backgroundColor: theme === "dark" ? "#0a0a0a" : "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `wrapex-${sectionId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [sectionId, theme]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); reset(); }}>
      <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary mb-4">Export Widget</h3>

        <div className="space-y-4">
          <div>
            <label className="text-text-muted text-xs uppercase tracking-wider mb-2 block">Theme</label>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2 rounded-[var(--radius-sm)] border text-sm capitalize transition-all ${
                    theme === t ? "bg-green/20 border-green text-green" : "bg-white/[0.03] border-border text-text-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-text-muted text-xs uppercase tracking-wider mb-2 block">Aspect Ratio</label>
            <div className="flex gap-2">
              {(["1:1", "16:9", "9:16"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`flex-1 py-2 rounded-[var(--radius-sm)] border text-sm transition-all ${
                    aspectRatio === r ? "bg-green/20 border-green text-green" : "bg-white/[0.03] border-border text-text-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2.5 bg-green text-black font-semibold rounded-[var(--radius-sm)] hover:bg-green/90 transition-colors"
          >
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
