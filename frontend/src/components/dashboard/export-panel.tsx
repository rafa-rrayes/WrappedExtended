"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import type { DashboardDetail } from "@/types/dashboard";

interface ExportPanelProps {
  data: DashboardDetail;
}

type ExportStatus = "idle" | "exporting-pdf" | "exporting-widget";

export function ExportPanel({ data }: ExportPanelProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const panelRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const exportPdf = useCallback(async () => {
    setStatus("exporting-pdf");
    setOpen(false);

    try {
      // Capture the entire dashboard content area
      const dashboardEl = document.getElementById("dashboard-content");
      if (!dashboardEl) return;

      // Get all section elements within the dashboard
      const sections = dashboardEl.querySelectorAll<HTMLElement>("[data-section]");
      if (sections.length === 0) return;

      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      let isFirstPage = true;

      for (const section of sections) {
        try {
          const dataUrl = await toPng(section, {
            backgroundColor: "#0a0a0a",
            pixelRatio: 2,
          });

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = dataUrl;
          });

          // Scale image to fit page width with margins
          const availableWidth = pageWidth - margin * 2;
          const availableHeight = pageHeight - margin * 2;
          const scale = Math.min(
            availableWidth / img.width,
            availableHeight / img.height,
            1
          );
          const imgWidth = img.width * scale;
          const imgHeight = img.height * scale;

          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          // Center the image on the page
          const x = (pageWidth - imgWidth) / 2;
          const y = margin;

          pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight);
        } catch {
          // Skip sections that fail to render (e.g. canvas issues)
          continue;
        }
      }

      pdf.save(`wrapex-dashboard-${data.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setStatus("idle");
    }
  }, [data.id]);

  const exportWidget = useCallback(async () => {
    setStatus("exporting-widget");
    setOpen(false);

    // Wait for the widget card to render
    await new Promise((r) => setTimeout(r, 100));

    try {
      const el = widgetRef.current;
      if (!el) return;

      const dataUrl = await toPng(el, {
        backgroundColor: "#0a0a0a",
        pixelRatio: 3,
      });
      const link = document.createElement("a");
      link.download = `wrapex-widget-${data.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Widget export failed:", err);
    } finally {
      setStatus("idle");
    }
  }, [data.id]);

  const stats = data.dashboard_data;
  const topArtist = stats.top_artists?.[0]?.artist_name ?? "—";
  const topTrack = stats.top_tracks?.[0]?.track_name ?? "—";
  const topTrackArtist = stats.top_tracks?.[0]?.artist_name ?? "";

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen(!open)}
          disabled={status !== "idle"}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary border border-border hover:border-green/30 px-4 py-2 rounded-full transition-all disabled:opacity-50"
        >
          {status !== "idle" ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          )}
          {status === "exporting-pdf" ? "Exporting PDF..." : status === "exporting-widget" ? "Exporting..." : "Export"}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-bg-card/90 backdrop-blur-xl border border-border rounded-[var(--radius-sm)] shadow-lg p-1.5 z-50">
            <button
              onClick={exportPdf}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors text-left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Export as PDF
            </button>
            <button
              onClick={exportWidget}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors text-left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              Export as Widget
            </button>
          </div>
        )}
      </div>

      {/* Widget card — rendered off-screen for capture */}
      {status === "exporting-widget" && (
        <div className="fixed -left-[9999px] top-0" aria-hidden>
          <div
            ref={widgetRef}
            style={{ width: 480, padding: 32, fontFamily: "'Outfit', sans-serif" }}
            className="bg-[#0a0a0a] text-white"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#1DB954" }}>
                WrapEx
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <WidgetStat value={formatNumber(data.total_hours)} label="Hours Listened" accent="#1DB954" />
              <WidgetStat value={formatNumber(data.total_streams)} label="Total Streams" accent="#1DB954" />
              <WidgetStat value={formatNumber(data.unique_artists)} label="Artists" accent="#F5A623" />
              <WidgetStat value={formatNumber(data.unique_tracks)} label="Tracks" accent="#F5A623" />
            </div>

            {/* Top picks */}
            <div style={{ borderTop: "1px solid #222", paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#666", marginBottom: 8 }}>
                Top Artist
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1DB954" }}>{topArtist}</div>
            </div>
            <div style={{ borderTop: "1px solid #222", paddingTop: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#666", marginBottom: 8 }}>
                Top Track
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{topTrack}</div>
              {topTrackArtist && (
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{topTrackArtist}</div>
              )}
            </div>

            {/* Date range */}
            <div style={{ fontSize: 11, color: "#555", textAlign: "center" }}>
              {data.date_range_start && data.date_range_end
                ? `${formatDate(data.date_range_start)} — ${formatDate(data.date_range_end)}`
                : "All time"}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "#444" }}>
              wrapex.app
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WidgetStat({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div style={{ background: "#111", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#888", marginTop: 4, textTransform: "uppercase", letterSpacing: 1.5 }}>
        {label}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
