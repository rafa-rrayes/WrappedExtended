"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { ArtistMonthHeatmap, SongMonthlyBreakdown } from "@/types/dashboard";
import { SectionReveal } from "@/components/dashboard/section-reveal";
import { Button } from "@/components/ui/button";

interface BarChartRaceProps {
  artistMonthHeatmap?: ArtistMonthHeatmap[];
  songMonthlyBreakdown?: SongMonthlyBreakdown[];
}

interface FrameEntry {
  name: string;
  value: number;
}

interface Frame {
  label: string;
  entries: FrameEntry[];
}

type Category = "artist" | "track";
type Mode = "cumulative" | "single";

const BAR_COLORS = [
  "#1DB954", "#1ed760", "#F5A623", "#f7b84e", "#E91E63",
  "#9C27B0", "#3498db", "#1abc9c", "#e67e22", "#e74c3c",
  "#f39c12", "#27ae60", "#8e44ad", "#2980b9", "#d35400",
  "#c0392b", "#16a085", "#00BCD4", "#FF5722", "#795548",
];

const W = 1920;
const H = 1080;

function formatMonth(m: string): string {
  const [year, month] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(month) - 1]} ${year}`;
}

function buildArtistFrames(
  data: ArtistMonthHeatmap[],
  mode: Mode,
  topN: number
): Frame[] {
  const monthSet = new Set<string>();
  for (const a of data) for (const d of a.data) monthSet.add(d.month);
  const months = Array.from(monthSet).sort();

  const cumulative = new Map<string, number>();

  return months.map((month) => {
    const entries: FrameEntry[] = [];

    if (mode === "cumulative") {
      for (const a of data) {
        const entry = a.data.find((d) => d.month === month);
        if (entry) {
          cumulative.set(a.artist_name, (cumulative.get(a.artist_name) || 0) + entry.hours);
        }
      }
      for (const [name, value] of cumulative) {
        entries.push({ name, value });
      }
    } else {
      for (const a of data) {
        const entry = a.data.find((d) => d.month === month);
        if (entry && entry.hours > 0) {
          entries.push({ name: a.artist_name, value: entry.hours });
        }
      }
    }

    entries.sort((a, b) => b.value - a.value);
    return { label: formatMonth(month), entries: entries.slice(0, topN) };
  });
}

function buildTrackFrames(
  data: SongMonthlyBreakdown[],
  mode: Mode,
  topN: number
): Frame[] {
  const monthSet = new Set<string>();
  for (const s of data) for (const d of s.data) monthSet.add(d.month);
  const months = Array.from(monthSet).sort();

  const cumulative = new Map<string, number>();

  return months.map((month) => {
    const entries: FrameEntry[] = [];

    if (mode === "cumulative") {
      for (const s of data) {
        const label = `${s.track_name} — ${s.artist_name}`;
        const entry = s.data.find((d) => d.month === month);
        if (entry) {
          cumulative.set(label, (cumulative.get(label) || 0) + entry.plays);
        }
      }
      for (const [name, value] of cumulative) {
        entries.push({ name, value });
      }
    } else {
      for (const s of data) {
        const entry = s.data.find((d) => d.month === month);
        if (entry && entry.plays > 0) {
          entries.push({ name: `${s.track_name} — ${s.artist_name}`, value: entry.plays });
        }
      }
    }

    entries.sort((a, b) => b.value - a.value);
    return { label: formatMonth(month), entries: entries.slice(0, topN) };
  });
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  topN: number,
  colorMap: Map<string, string>,
  category: Category,
  mode: Mode
) {
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, W, H);

  const margin = { top: 80, right: 120, bottom: 60, left: 40 };
  const barAreaW = W - margin.left - margin.right;
  const barAreaH = H - margin.top - margin.bottom;
  const count = Math.min(frame.entries.length, topN);
  const barH = Math.min(barAreaH / topN - 8, 50);
  const gap = (barAreaH - barH * topN) / (topN + 1);
  const maxVal = frame.entries.length > 0 ? frame.entries[0].value : 1;

  const catLabel = category === "artist" ? "Top Artists" : "Top Tracks";
  const unitLabel = category === "artist" ? "Hours" : "Plays";

  // Title
  ctx.fillStyle = "#ececec";
  ctx.font = "bold 28px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`${catLabel} — ${mode === "cumulative" ? "Cumulative " : ""}${unitLabel}`, margin.left, 45);

  // Date label
  ctx.fillStyle = "#999999";
  ctx.font = "24px system-ui";
  ctx.textAlign = "right";
  ctx.fillText(frame.label, W - margin.right, 45);

  // Bars
  for (let i = 0; i < count; i++) {
    const entry = frame.entries[i];
    const y = margin.top + gap * (i + 1) + barH * i;
    const barW = maxVal > 0 ? (entry.value / maxVal) * barAreaW : 0;
    const color = colorMap.get(entry.name) || BAR_COLORS[i % BAR_COLORS.length];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(margin.left, y, Math.max(barW, 2), barH, [0, 6, 6, 0]);
    ctx.fill();

    // Name
    ctx.fillStyle = "#ececec";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "left";
    const nameText = entry.name.length > 35 ? entry.name.slice(0, 33) + "…" : entry.name;
    ctx.fillText(nameText, margin.left + 10, y + barH / 2 + 5);

    // Value
    ctx.fillStyle = "#ececec";
    ctx.font = "16px system-ui";
    ctx.textAlign = "left";
    const valText = category === "artist"
      ? `${entry.value.toFixed(1)}h`
      : `${Math.round(entry.value)}`;
    ctx.fillText(valText, margin.left + barW + 8, y + barH / 2 + 5);
  }

  // Bottom line
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, H - margin.bottom);
  ctx.lineTo(W - margin.right, H - margin.bottom);
  ctx.stroke();
}

export function BarChartRace({ artistMonthHeatmap, songMonthlyBreakdown }: BarChartRaceProps) {
  const hasArtists = artistMonthHeatmap && artistMonthHeatmap.length > 0;
  const hasTracks = songMonthlyBreakdown && songMonthlyBreakdown.length > 0;
  if (!hasArtists && !hasTracks) return null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [category, setCategory] = useState<Category>(hasArtists ? "artist" : "track");
  const [mode, setMode] = useState<Mode>("cumulative");
  const [topN, setTopN] = useState(12);
  const [speed, setSpeed] = useState(1);

  const framesRef = useRef<Frame[]>([]);
  const frameIdxRef = useRef(0);
  const playingRef = useRef(false);
  const colorMapRef = useRef(new Map<string, string>());

  const [frameCount, setFrameCount] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentLabel, setCurrentLabel] = useState("");
  const [generated, setGenerated] = useState(false);

  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frames = framesRef.current;
    if (frames.length === 0) return;
    const idx = Math.min(frameIdxRef.current, frames.length - 1);
    drawFrame(ctx, frames[idx], topN, colorMapRef.current, category, mode);
  }, [topN, category, mode]);

  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const frames = framesRef.current;
    if (frameIdxRef.current >= frames.length - 1) {
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    frameIdxRef.current++;
    setCurrentIdx(frameIdxRef.current);
    setCurrentLabel(frames[frameIdxRef.current]?.label || "");
    drawCurrentFrame();
    animRef.current = window.setTimeout(tick, Math.max(16, 200 / speed));
  }, [speed, drawCurrentFrame]);

  const play = useCallback(() => {
    if (framesRef.current.length === 0) return;
    if (frameIdxRef.current >= framesRef.current.length - 1) {
      frameIdxRef.current = 0;
    }
    playingRef.current = true;
    setIsPlaying(true);
    tick();
  }, [tick]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    if (animRef.current) clearTimeout(animRef.current);
  }, []);

  const seek = useCallback(
    (idx: number) => {
      frameIdxRef.current = idx;
      setCurrentIdx(idx);
      setCurrentLabel(framesRef.current[idx]?.label || "");
      drawCurrentFrame();
    },
    [drawCurrentFrame]
  );

  useEffect(() => {
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, []);

  // Draw placeholder on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#555555";
    ctx.font = "24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Configure options and click Generate", W / 2, H / 2);
  }, []);

  const generate = useCallback(() => {
    pause();

    let frames: Frame[];
    if (category === "artist" && hasArtists) {
      frames = buildArtistFrames(artistMonthHeatmap!, mode, topN);
    } else if (category === "track" && hasTracks) {
      frames = buildTrackFrames(songMonthlyBreakdown!, mode, topN);
    } else {
      return;
    }

    framesRef.current = frames;

    // Build stable color map
    const allNames = new Set<string>();
    for (const f of frames) for (const e of f.entries) allNames.add(e.name);
    const cm = new Map<string, string>();
    let ci = 0;
    for (const name of allNames) {
      cm.set(name, BAR_COLORS[ci % BAR_COLORS.length]);
      ci++;
    }
    colorMapRef.current = cm;

    frameIdxRef.current = 0;
    setFrameCount(frames.length);
    setCurrentIdx(0);
    setCurrentLabel(frames[0]?.label || "");
    setGenerated(true);

    if (frames.length > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawFrame(ctx, frames[0], topN, cm, category, mode);
    }
  }, [category, mode, topN, hasArtists, hasTracks, artistMonthHeatmap, songMonthlyBreakdown, pause]);

  const toggleRecord = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const stream = canvas.captureStream(30);
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bar-chart-race.webm";
      a.click();
      URL.revokeObjectURL(url);
    };
    mediaRecorderRef.current = mr;
    mr.start();
    setIsRecording(true);
    play();
  }, [isRecording, play]);

  const selectClasses =
    "bg-bg-elevated border border-border rounded-[var(--radius-sm)] text-text-primary text-sm px-3 py-2 focus:border-green outline-none appearance-none cursor-pointer";
  const inputClasses =
    "bg-bg-elevated border border-border rounded-[var(--radius-sm)] text-text-primary text-sm px-3 py-2 w-20 focus:border-green outline-none";
  const labelClasses = "text-xs font-semibold uppercase tracking-wider text-text-muted";

  return (
    <SectionReveal id="bar-chart-race" className="py-24">
      <>
        <div className="mb-12">
          <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-green mb-2.5 block">
            Bar Chart Race
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
            Watch Your <span className="text-green">Taste</span> Evolve
          </h2>
        </div>

        {/* Controls */}
        <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className={labelClasses}>Category</label>
              <select
                className={selectClasses}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {hasArtists && <option value="artist">Artist</option>}
                {hasTracks && <option value="track">Track</option>}
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Mode</label>
              <select
                className={selectClasses}
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="cumulative">Cumulative</option>
                <option value="single">Single Month</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelClasses}>Top N</label>
              <input
                type="number"
                className={inputClasses}
                value={topN}
                min={5}
                max={20}
                onChange={(e) => setTopN(Number(e.target.value))}
              />
            </div>

            <Button onClick={generate}>Generate</Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-[var(--radius-card)] overflow-hidden border border-border">
          <div className="aspect-video">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Playback controls */}
        {generated && frameCount > 0 && (
          <div className="bg-bg-card border border-border rounded-[var(--radius-card)] p-4 mt-4 flex flex-wrap items-center gap-4">
            <Button
              variant="outline"
              className="px-4 py-2 text-sm"
              onClick={isPlaying ? pause : play}
            >
              {isPlaying ? "Pause" : "Play"}
            </Button>

            <input
              type="range"
              min={0}
              max={frameCount - 1}
              value={currentIdx}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 min-w-[120px] accent-green"
            />

            <span className="text-text-secondary text-sm min-w-[100px]">{currentLabel}</span>

            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">Speed</label>
              <select
                className="bg-bg-elevated border border-border rounded-[var(--radius-sm)] text-text-primary text-xs px-2 py-1 outline-none"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
                <option value={8}>8x</option>
              </select>
            </div>

            <button
              onClick={toggleRecord}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                isRecording
                  ? "border-red-500 text-red-400"
                  : "border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              {isRecording && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {isRecording ? "Stop" : "Record"}
            </button>
          </div>
        )}
      </>
    </SectionReveal>
  );
}
