"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type {
  ArtistMonthHeatmap,
  ArtistDailyHeatmap,
  SongMonthlyBreakdown,
  SongDailyBreakdown,
} from "@/types/dashboard";
import { SectionReveal } from "@/components/dashboard/section-reveal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BarChartRaceProps {
  artistMonthHeatmap?: ArtistMonthHeatmap[];
  songMonthlyBreakdown?: SongMonthlyBreakdown[];
  artistDailyHeatmap?: ArtistDailyHeatmap[];
  songDailyBreakdown?: SongDailyBreakdown[];
}

type Category = "artist" | "track";
type Mode = "cumulative" | "rolling";
type StepSize = "day" | "month";

interface Bar {
  name: string;
  value: number;
  color: string;
  rank?: number;
}

interface Frame {
  date: Date;
  bars: Bar[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PALETTE = [
  "#1db954", "#e8115b", "#f573a0", "#ff6437", "#ffa42b", "#f7c845",
  "#a0c4ff", "#7c4dff", "#1e90ff", "#00bcd4", "#b388ff", "#ea80fc",
  "#ff8a65", "#81c784", "#4dd0e1", "#ffab91", "#ce93d8", "#80deea",
  "#ef5350", "#66bb6a", "#42a5f5", "#ab47bc", "#26c6da", "#ffee58",
  "#8d6e63",
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MARGIN = { top: 60, right: 200, bottom: 80, left: 220 };

// ─── Helpers ────────────────────────────────────────────────────────────────

function niceNum(val: number): number {
  const exp = Math.floor(Math.log10(val));
  const frac = val / Math.pow(10, exp);
  let nice: number;
  if (frac <= 1) nice = 1;
  else if (frac <= 2) nice = 2;
  else if (frac <= 5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function formatDate(d: Date, step: StepSize): string {
  if (step === "day")
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  return MONTHS[d.getMonth()] + " " + d.getFullYear();
}

function formatDateWatermark(d: Date): string {
  return MONTHS[d.getMonth()] + " " + d.getFullYear();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BarChartRace({
  artistMonthHeatmap,
  songMonthlyBreakdown,
  artistDailyHeatmap,
  songDailyBreakdown,
}: BarChartRaceProps) {
  // ─── Canvas refs ───
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<Frame[]>([]);
  const frameTimesRef = useRef<number[]>([]);
  const colorMapRef = useRef<Record<string, string>>({});
  const colorIdxRef = useRef(0);
  const playingRef = useRef(false);
  const animIdRef = useRef<number | null>(null);
  const playbackTimeRef = useRef(0);
  const lastTimestampRef = useRef<number | null>(null);
  const recordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const currentFrameRef = useRef(0);

  // ─── State ───
  const [category, setCategory] = useState<Category>("artist");
  const [mode, setMode] = useState<Mode>("cumulative");
  const [windowDays, setWindowDays] = useState(30);
  const [topNVal, setTopNVal] = useState(12);
  const [stepSize, setStepSize] = useState<StepSize>("month");
  const [speed, setSpeed] = useState("1");
  const [playbackReady, setPlaybackReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [progressMax, setProgressMax] = useState(100);
  const [progressValue, setProgressValue] = useState(0);
  const [timeLabelText, setTimeLabelText] = useState("-");

  // Refs for animation loop access
  const categoryRef = useRef(category);
  const modeRef = useRef(mode);
  const windowDaysRef = useRef(windowDays);
  const topNRef = useRef(topNVal);
  const stepSizeRef = useRef(stepSize);
  const speedRef = useRef(speed);

  useEffect(() => { categoryRef.current = category; }, [category]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { windowDaysRef.current = windowDays; }, [windowDays]);
  useEffect(() => { topNRef.current = topNVal; }, [topNVal]);
  useEffect(() => { stepSizeRef.current = stepSize; }, [stepSize]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ─── Check data availability ───
  const hasData = useMemo(() => {
    return (
      (artistMonthHeatmap && artistMonthHeatmap.length > 0) ||
      (songMonthlyBreakdown && songMonthlyBreakdown.length > 0) ||
      (artistDailyHeatmap && artistDailyHeatmap.length > 0) ||
      (songDailyBreakdown && songDailyBreakdown.length > 0)
    );
  }, [artistMonthHeatmap, songMonthlyBreakdown, artistDailyHeatmap, songDailyBreakdown]);

  // Determine which step sizes and categories are available
  const availableCategories = useMemo(() => {
    const cats: Category[] = [];
    if (artistMonthHeatmap?.length || artistDailyHeatmap?.length) cats.push("artist");
    if (songMonthlyBreakdown?.length || songDailyBreakdown?.length) cats.push("track");
    return cats;
  }, [artistMonthHeatmap, artistDailyHeatmap, songMonthlyBreakdown, songDailyBreakdown]);

  const availableSteps = useMemo(() => {
    const steps: StepSize[] = [];
    if (
      (category === "artist" && artistMonthHeatmap?.length) ||
      (category === "track" && songMonthlyBreakdown?.length)
    ) steps.push("month");
    if (
      (category === "artist" && artistDailyHeatmap?.length) ||
      (category === "track" && songDailyBreakdown?.length)
    ) steps.push("day");
    return steps;
  }, [category, artistMonthHeatmap, artistDailyHeatmap, songMonthlyBreakdown, songDailyBreakdown]);

  // Auto-correct stepSize if not available
  useEffect(() => {
    if (availableSteps.length > 0 && !availableSteps.includes(stepSize)) {
      setStepSize(availableSteps[0]);
    }
  }, [availableSteps, stepSize]);

  // Auto-correct category if not available
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(category)) {
      setCategory(availableCategories[0]);
    }
  }, [availableCategories, category]);

  // ─── Color assignment ───
  const getColor = useCallback((group: string): string => {
    if (!colorMapRef.current[group]) {
      colorMapRef.current[group] = PALETTE[colorIdxRef.current++ % PALETTE.length];
    }
    return colorMapRef.current[group];
  }, []);

  // ─── Drawing ───
  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frame = framesRef.current[idx];
    if (!frame) return;

    setTimeLabelText(formatDate(frame.date, stepSizeRef.current));

    const W = canvas.width;
    const H = canvas.height;
    const nBars = frame.bars.length || 1;
    const barAreaH = H - MARGIN.top - MARGIN.bottom;
    const barH = Math.min((barAreaH / nBars) * 0.7, 60);
    const gap = (barAreaH - barH * nBars) / (nBars + 1);
    const scaleMax = Math.max(frame.bars[0]?.value || 1, 1);
    const barAreaW = W - MARGIN.left - MARGIN.right;

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "left";
    const catLabel = categoryRef.current === "artist" ? "Artists" : "Tracks";
    const modeLabel =
      modeRef.current === "cumulative"
        ? "Total listening"
        : `${windowDaysRef.current}-day rolling`;
    ctx.fillText(
      `Top ${topNRef.current} ${catLabel} – ${modeLabel} (minutes)`,
      MARGIN.left,
      40,
    );

    // Gridlines
    const tickCount = 5;
    const tickStep = niceNum(scaleMax / tickCount);
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "center";
    for (let v = tickStep; v <= scaleMax * 1.05; v += tickStep) {
      const x = MARGIN.left + (v / scaleMax) * barAreaW;
      if (x > W - MARGIN.right + 5) break;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, H - MARGIN.bottom);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(formatNumber(v), x, MARGIN.top - 8);
    }

    // Bars
    frame.bars.forEach((bar, i) => {
      const y = MARGIN.top + gap * (i + 1) + barH * i;
      const w = (bar.value / scaleMax) * barAreaW;
      ctx.fillStyle = bar.color;
      ctx.beginPath();
      roundRect(ctx, MARGIN.left, y, Math.max(w, 2), barH, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "right";
      const label =
        bar.name.length > 28 ? bar.name.substring(0, 26) + "\u2026" : bar.name;
      ctx.fillText(label, MARGIN.left - 12, y + barH / 2 + 5);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = '15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(formatNumber(bar.value), MARGIN.left + w + 10, y + barH / 2 + 5);
    });

    // Date watermark
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = 'bold 80px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = "right";
    ctx.fillText(formatDateWatermark(frame.date), W - 40, H - 30);
  }, []);

  const drawInterpolated = useCallback(
    (fromIdx: number, toIdx: number, t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const frames = framesRef.current;
      const from = frames[fromIdx];
      const to = frames[toIdx];
      if (!from || !to) {
        drawFrame(fromIdx);
        return;
      }

      const W = canvas.width;
      const H = canvas.height;
      const nBars = Math.max(from.bars.length, to.bars.length) || 1;
      const barAreaH = H - MARGIN.top - MARGIN.bottom;
      const barH = Math.min((barAreaH / nBars) * 0.7, 60);
      const gap = (barAreaH - barH * nBars) / (nBars + 1);

      const allNames = new Set([
        ...from.bars.map((b) => b.name),
        ...to.bars.map((b) => b.name),
      ]);
      const fromMap = Object.fromEntries(
        from.bars.map((b, i) => [b.name, { ...b, rank: i }]),
      );
      const toMap = Object.fromEntries(
        to.bars.map((b, i) => [b.name, { ...b, rank: i }]),
      );

      const interpBars: (Bar & { rank: number })[] = [];
      for (const name of allNames) {
        const fb = fromMap[name];
        const tb = toMap[name];
        const fromVal = fb ? fb.value : 0;
        const toVal = tb ? tb.value : 0;
        const fromRank = fb ? fb.rank : nBars;
        const toRank = tb ? tb.rank : nBars;
        const val = fromVal + (toVal - fromVal) * t;
        const rank = fromRank + (toRank - fromRank) * t;
        if (val > 0) {
          interpBars.push({
            name,
            value: val,
            rank,
            color: (fb || tb).color,
          });
        }
      }
      interpBars.sort((a, b) => a.rank - b.rank);
      const displayBars = interpBars.slice(0, topNRef.current);

      const scaleMax = Math.max(displayBars[0]?.value || 1, 1);
      const barAreaW = W - MARGIN.left - MARGIN.right;

      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "#fff";
      ctx.font = 'bold 28px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "left";
      const catLabel = categoryRef.current === "artist" ? "Artists" : "Tracks";
      const modeLabel =
        modeRef.current === "cumulative"
          ? "Total listening"
          : `${windowDaysRef.current}-day rolling`;
      ctx.fillText(
        `Top ${topNRef.current} ${catLabel} – ${modeLabel} (minutes)`,
        MARGIN.left,
        40,
      );

      const tickCount = 5;
      const tickStep = niceNum(scaleMax / tickCount);
      ctx.font = '13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "center";
      for (let v = tickStep; v <= scaleMax * 1.05; v += tickStep) {
        const x = MARGIN.left + (v / scaleMax) * barAreaW;
        if (x > W - MARGIN.right + 5) break;
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.beginPath();
        ctx.moveTo(x, MARGIN.top);
        ctx.lineTo(x, H - MARGIN.bottom);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(formatNumber(v), x, MARGIN.top - 8);
      }

      displayBars.forEach((bar) => {
        const y = MARGIN.top + gap * (bar.rank + 1) + barH * bar.rank;
        const w = (bar.value / scaleMax) * barAreaW;
        ctx.fillStyle = bar.color;
        ctx.beginPath();
        roundRect(ctx, MARGIN.left, y, Math.max(w, 2), barH, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = "right";
        const label =
          bar.name.length > 28 ? bar.name.substring(0, 26) + "\u2026" : bar.name;
        ctx.fillText(label, MARGIN.left - 12, y + barH / 2 + 5);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = '15px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(
          formatNumber(Math.round(bar.value)),
          MARGIN.left + w + 10,
          y + barH / 2 + 5,
        );
      });

      const interpDate = new Date(
        from.date.getTime() + (to.date.getTime() - from.date.getTime()) * t,
      );
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = 'bold 80px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = "right";
      ctx.fillText(formatDateWatermark(interpDate), W - 40, H - 30);
      setTimeLabelText(formatDate(interpDate, stepSizeRef.current));
    },
    [drawFrame],
  );

  // ─── Animation loop ───
  const stopPlayback = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    recordingRef.current = false;
    setRecording(false);
  }, []);

  const animate = useCallback(
    (ts: number) => {
      if (!playingRef.current) return;
      if (lastTimestampRef.current === null) lastTimestampRef.current = ts;
      const dt = (ts - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = ts;

      const spd = parseFloat(speedRef.current);
      playbackTimeRef.current += dt * spd;

      const ft = frameTimesRef.current;
      const totalTime = ft[ft.length - 1];
      if (playbackTimeRef.current >= totalTime) {
        playbackTimeRef.current = totalTime;
        currentFrameRef.current = framesRef.current.length - 1;
        drawFrame(currentFrameRef.current);
        setProgressValue(currentFrameRef.current);
        stopPlayback();
        if (recordingRef.current) stopRecording();
        return;
      }

      let lo = 0;
      let hi = ft.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (ft[mid] <= playbackTimeRef.current) lo = mid;
        else hi = mid;
      }
      currentFrameRef.current = lo;
      const fromTime = ft[lo];
      const toTime = ft[hi];
      const interpT =
        toTime > fromTime
          ? (playbackTimeRef.current - fromTime) / (toTime - fromTime)
          : 0;

      drawInterpolated(lo, hi, interpT);
      setProgressValue(lo);

      animIdRef.current = requestAnimationFrame(animate);
    },
    [drawFrame, drawInterpolated, stopPlayback, stopRecording],
  );

  const startPlayback = useCallback(() => {
    playingRef.current = true;
    setPlaying(true);
    lastTimestampRef.current = null;
    animIdRef.current = requestAnimationFrame(animate);
  }, [animate]);

  // ─── Build frame times ───
  const buildFrameTimes = useCallback(() => {
    const frames = framesRef.current;
    if (!frames.length) return;
    const ft = new Array<number>(frames.length);
    const step = stepSizeRef.current;

    if (step === "day") {
      // Daily step: each month lasts exactly 5 seconds
      const firstDate = frames[0].date;
      const firstMonth = firstDate.getFullYear() * 12 + firstDate.getMonth();
      let i = 0;
      while (i < frames.length) {
        const d = frames[i].date;
        const monthKey = d.getFullYear() * 12 + d.getMonth();
        const monthOffset = monthKey - firstMonth;
        const slotStart = monthOffset * 5;
        let j = i;
        while (j < frames.length) {
          const dj = frames[j].date;
          if (dj.getFullYear() * 12 + dj.getMonth() !== monthKey) break;
          j++;
        }
        const count = j - i;
        for (let k = 0; k < count; k++) {
          ft[i + k] = slotStart + (k / count) * 5;
        }
        i = j;
      }
    } else {
      const firstDay = Math.floor(frames[0].date.getTime() / 86_400_000);
      let i = 0;
      while (i < frames.length) {
        const day = Math.floor(frames[i].date.getTime() / 86_400_000);
        const dayOffset = day - firstDay;
        let j = i;
        while (
          j < frames.length &&
          Math.floor(frames[j].date.getTime() / 86_400_000) === day
        )
          j++;
        const count = j - i;
        for (let k = 0; k < count; k++) {
          ft[i + k] = dayOffset + k / count;
        }
        i = j;
      }
    }
    frameTimesRef.current = ft;
  }, []);

  // ─── Generate frames from pre-computed data ───
  const handleGenerate = useCallback(() => {
    const cat = categoryRef.current;
    const md = modeRef.current;
    const winDays = windowDaysRef.current;
    const nBars = topNRef.current;
    const step = stepSizeRef.current;

    // Reset colors
    colorMapRef.current = {};
    colorIdxRef.current = 0;

    // Pick the right data source
    type TimeEntry = { date: Date; entries: { name: string; colorKey: string; value: number }[] };

    const buildTimeEntries = (): TimeEntry[] => {
      if (cat === "artist") {
        const src = step === "day" ? artistDailyHeatmap : artistMonthHeatmap;
        if (!src?.length) return [];

        // Collect all time points
        const timeMap = new Map<string, Map<string, number>>();
        for (const artist of src) {
          for (const d of artist.data) {
            const key = "date" in d ? (d as { date: string }).date : (d as { month: string }).month;
            if (!timeMap.has(key)) timeMap.set(key, new Map());
            timeMap.get(key)!.set(artist.artist_name, d.minutes ?? d.hours * 60);
          }
        }

        return Array.from(timeMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entries]) => ({
            date: step === "day" ? new Date(key + "T00:00:00") : new Date(key + "-01T00:00:00"),
            entries: Array.from(entries.entries()).map(([name, value]) => ({
              name,
              colorKey: name,
              value,
            })),
          }));
      } else {
        const src = step === "day" ? songDailyBreakdown : songMonthlyBreakdown;
        if (!src?.length) return [];

        const timeMap = new Map<string, Map<string, { minutes: number; artist: string }>>();
        for (const track of src) {
          for (const d of track.data) {
            const key = "date" in d ? (d as { date: string }).date : (d as { month: string }).month;
            if (!timeMap.has(key)) timeMap.set(key, new Map());
            timeMap.get(key)!.set(track.track_name, {
              minutes: d.minutes ?? d.plays,
              artist: track.artist_name,
            });
          }
        }

        return Array.from(timeMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entries]) => ({
            date: step === "day" ? new Date(key + "T00:00:00") : new Date(key + "-01T00:00:00"),
            entries: Array.from(entries.entries()).map(([name, { minutes, artist }]) => ({
              name,
              colorKey: artist,
              value: minutes,
            })),
          }));
      }
    };

    const timeEntries = buildTimeEntries();
    if (!timeEntries.length) return;

    // Build cumulative or rolling frames
    const newFrames: Frame[] = [];
    const cumulative = new Map<string, { total: number; colorKey: string }>();

    for (let ti = 0; ti < timeEntries.length; ti++) {
      const te = timeEntries[ti];

      if (md === "cumulative") {
        // Add this time point's values to running totals
        for (const entry of te.entries) {
          const prev = cumulative.get(entry.name);
          cumulative.set(entry.name, {
            total: (prev?.total ?? 0) + entry.value,
            colorKey: entry.colorKey,
          });
        }

        const sorted = Array.from(cumulative.entries())
          .map(([name, { total, colorKey }]) => ({
            name,
            value: Math.round(cat === "artist" ? total : total),
            color: getColor(colorKey),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, nBars);

        newFrames.push({ date: te.date, bars: sorted });
      } else {
        // Rolling window: sum values within window
        const windowMs = winDays * 86_400_000;
        const windowStart = te.date.getTime() - windowMs;
        const rolling = new Map<string, { total: number; colorKey: string }>();

        for (let j = 0; j <= ti; j++) {
          if (timeEntries[j].date.getTime() < windowStart) continue;
          if (timeEntries[j].date.getTime() > te.date.getTime()) break;
          for (const entry of timeEntries[j].entries) {
            const prev = rolling.get(entry.name);
            rolling.set(entry.name, {
              total: (prev?.total ?? 0) + entry.value,
              colorKey: entry.colorKey,
            });
          }
        }

        const sorted = Array.from(rolling.entries())
          .map(([name, { total, colorKey }]) => ({
            name,
            value: Math.round(total),
            color: getColor(colorKey),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, nBars);

        newFrames.push({ date: te.date, bars: sorted });
      }
    }

    framesRef.current = newFrames;
    currentFrameRef.current = 0;
    playbackTimeRef.current = 0;
    setPlaybackReady(true);
    setProgressMax(newFrames.length - 1);
    setProgressValue(0);

    buildFrameTimes();
    drawFrame(0);
  }, [
    artistMonthHeatmap, artistDailyHeatmap,
    songMonthlyBreakdown, songDailyBreakdown,
    getColor, buildFrameTimes, drawFrame,
  ]);

  // ─── Play/Pause ───
  const handlePlayPause = useCallback(() => {
    if (playingRef.current) {
      stopPlayback();
    } else {
      if (currentFrameRef.current >= framesRef.current.length - 1) {
        currentFrameRef.current = 0;
        playbackTimeRef.current = 0;
      }
      startPlayback();
    }
  }, [stopPlayback, startPlayback]);

  // ─── Progress scrub ───
  const handleProgressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      currentFrameRef.current = val;
      playbackTimeRef.current = frameTimesRef.current[val] || 0;
      setProgressValue(val);
      drawFrame(val);
    },
    [drawFrame],
  );

  // ─── Recording ───
  const handleRecord = useCallback(() => {
    if (recordingRef.current) {
      stopRecording();
      return;
    }
    const cvs = canvasRef.current;
    if (!cvs) return;
    const stream = cvs.captureStream(60);
    const mr = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
      videoBitsPerSecond: 8_000_000,
    });
    recordedChunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size) recordedChunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "spotify-bar-race.webm";
      a.click();
      URL.revokeObjectURL(url);
      // Stop the capture stream tracks
      stream.getTracks().forEach((track) => track.stop());
      recordingRef.current = false;
      setRecording(false);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    recordingRef.current = true;
    setRecording(true);
    currentFrameRef.current = 0;
    playbackTimeRef.current = 0;
    startPlayback();
  }, [stopRecording, startPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!hasData) return null;

  return (
    <SectionReveal id="bar-chart-race" className="py-24">
      {() => (
        <>
          {/* Header */}
          <div className="mb-12">
            <span className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold tracking-[0.2em] uppercase text-[#E91E63] mb-2.5 block">
              Bar Chart Race
            </span>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.8rem)] font-extrabold leading-[1.15]">
              Watch Your <span className="text-green">Favorites</span> Race
            </h2>
          </div>

          <Card>
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
              {/* Category */}
              {availableCategories.length > 1 && (
                <ControlGroup label="Category">
                  <StyledSelect
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    options={availableCategories.map((c) =>
                      c === "artist" ? ["artist", "Artists"] : ["track", "Tracks"],
                    )}
                  />
                </ControlGroup>
              )}

              {/* Mode */}
              <ControlGroup label="Mode">
                <StyledSelect
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Mode)}
                  options={[
                    ["cumulative", "Total (cumulative)"],
                    ["rolling", "Rolling window"],
                  ]}
                />
              </ControlGroup>

              {/* Rolling window size */}
              {mode === "rolling" && (
                <ControlGroup label="Window (days)">
                  <input
                    type="number"
                    value={windowDays}
                    onChange={(e) =>
                      setWindowDays(parseInt(e.target.value) || 30)
                    }
                    min={1}
                    max={3650}
                    className="bg-bg-deep border border-border text-text-primary px-3 py-2 rounded-md text-sm w-[140px] focus:outline-none focus:border-green"
                  />
                </ControlGroup>
              )}

              {/* Top N */}
              <ControlGroup label="Top N bars">
                <input
                  type="number"
                  value={topNVal}
                  onChange={(e) => setTopNVal(parseInt(e.target.value) || 12)}
                  min={3}
                  max={25}
                  className="bg-bg-deep border border-border text-text-primary px-3 py-2 rounded-md text-sm w-[140px] focus:outline-none focus:border-green"
                />
              </ControlGroup>

              {/* Step size */}
              {availableSteps.length > 1 && (
                <ControlGroup label="Step">
                  <StyledSelect
                    value={stepSize}
                    onChange={(e) => setStepSize(e.target.value as StepSize)}
                    options={availableSteps.map((s) =>
                      s === "day" ? ["day", "Daily"] : ["month", "Monthly"],
                    )}
                  />
                </ControlGroup>
              )}

              {/* Generate */}
              <Button onClick={handleGenerate} variant="primary" className="px-6 py-2 text-sm">
                Generate
              </Button>
            </div>

            {/* Canvas */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
              <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="w-full h-full block"
              />
              {!playbackReady && (
                <div className="absolute inset-0 flex items-center justify-center text-text-muted text-lg pointer-events-none">
                  Configure options and click Generate
                </div>
              )}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handlePlayPause}
                disabled={!playbackReady}
                variant="outline"
                className="px-6 py-2 text-sm"
              >
                {playing ? "\u23F8 Pause" : "\u25B6 Play"}
              </Button>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="range"
                  min={0}
                  max={progressMax}
                  value={progressValue}
                  onChange={handleProgressChange}
                  disabled={!playbackReady}
                  className="w-full accent-green"
                />
              </div>

              <span className="text-xs text-text-muted min-w-[60px]">
                {timeLabelText}
              </span>

              <div className="flex items-center gap-1.5">
                <label className="text-xs text-text-muted">Speed</label>
                <StyledSelect
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  options={[
                    ["0.5", "0.5x"], ["1", "1x"], ["2", "2x"], ["4", "4x"],
                    ["6", "6x"], ["8", "8x"], ["10", "10x"], ["15", "15x"], ["20", "20x"],
                  ]}
                  className="min-w-[70px] py-1 px-2 text-xs"
                />
              </div>

              <Button
                onClick={handleRecord}
                disabled={!playbackReady}
                variant="outline"
                className="px-6 py-2 text-sm"
              >
                {recording ? "Stop Recording" : "Record WebM"}
              </Button>

              {recording && (
                <span className="inline-flex items-center gap-1.5 bg-[#e0245e] text-white px-3 py-1 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  REC
                </span>
              )}
            </div>
          </Card>
        </>
      )}
    </SectionReveal>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[][];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`bg-bg-deep border border-border text-text-primary px-3 py-2 rounded-md text-sm min-w-[140px] focus:outline-none focus:border-green ${className ?? ""}`}
    >
      {options.map(([val, label]) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
}
