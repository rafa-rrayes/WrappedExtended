"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  quadtree as buildQuadtree,
  scaleLinear,
  scaleSqrt,
  select,
  zoom as d3Zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomBehavior,
  type ZoomTransform,
} from "d3";
import type { MLEmbeddingPoint } from "@/types/dashboard";
import { SCENE_FALLBACK_COLOR } from "./scene-palette";

/**
 * The taste map's rendering surface.
 *
 * Canvas rather than SVG/Recharts on purpose: a real export puts ~3,000 artists on this
 * map and one DOM node per artist makes pan and zoom unusable. Everything is drawn
 * imperatively into a single `<canvas>`, with a d3 quadtree over the *untransformed*
 * pixel coordinates doing hit-testing, so hover stays O(log n) at any zoom level and the
 * tree never has to be rebuilt while panning.
 */

/** Hard ceiling on drawn points; beyond this we keep the biggest artists by hours. */
const MAX_POINTS = 6000;
const PADDING = 24;
const MIN_RADIUS = 1.6;
const MAX_RADIUS = 13;
const HOVER_RADIUS_PX = 14;

interface Projected {
  point: MLEmbeddingPoint;
  px: number;
  py: number;
  pr: number;
}

export interface TasteMapHover {
  point: MLEmbeddingPoint;
  /** Position within the container, in CSS pixels. */
  left: number;
  top: number;
}

export interface TasteMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}

interface TasteMapCanvasProps {
  points: MLEmbeddingPoint[];
  sceneColors: Map<number, string>;
  /** When set, every other scene is dimmed out. */
  activeScene: number | null;
  /** How many of the biggest artists get a name drawn on the map. 0 disables labels. */
  labelCount: number;
  height: number;
  onHoverChange: (hover: TasteMapHover | null) => void;
  onSelect: (artist: string) => void;
  /** Filled with zoom controls so the toolbar can drive the canvas. */
  controlsRef?: React.RefObject<TasteMapHandle | null>;
}

export function TasteMapCanvas({
  points,
  sceneColors,
  activeScene,
  labelCount,
  height,
  onHoverChange,
  onSelect,
  controlsRef,
}: TasteMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
  const frameRef = useRef<number | null>(null);
  const hoveredRef = useRef<Projected | null>(null);
  const fontRef = useRef("600 11px system-ui, sans-serif");

  const [width, setWidth] = useState(0);

  // Drop the long tail before anything touches it. Sorting ascending by hours once here
  // buys both the draw order (big artists painted last, so they sit on top) and cheap
  // label picking (the biggest are simply the tail).
  const drawn = useMemo(() => {
    const sorted = [...points].sort((a, b) => (a.hours ?? 0) - (b.hours ?? 0));
    return sorted.length > MAX_POINTS ? sorted.slice(sorted.length - MAX_POINTS) : sorted;
  }, [points]);

  const projected = useMemo<Projected[]>(() => {
    if (!width || !height || !drawn.length) return [];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let maxHours = 0;
    for (const point of drawn) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
      if (point.hours > maxHours) maxHours = point.hours;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return [];
    if (minX === maxX) maxX = minX + 1;
    if (minY === maxY) maxY = minY + 1;

    const x = scaleLinear().domain([minX, maxX]).range([PADDING, width - PADDING]);
    const y = scaleLinear().domain([minY, maxY]).range([height - PADDING, PADDING]);
    const r = scaleSqrt()
      .domain([0, Math.max(maxHours, 1)])
      .range([MIN_RADIUS, MAX_RADIUS])
      .clamp(true);

    return drawn.map((point) => ({
      point,
      px: x(point.x),
      py: y(point.y),
      pr: r(point.hours ?? 0),
    }));
  }, [drawn, width, height]);

  const tree = useMemo(() => {
    if (!projected.length) return null;
    return buildQuadtree<Projected>()
      .x((d) => d.px)
      .y((d) => d.py)
      .addAll(projected);
  }, [projected]);

  // The set of artists worth naming does not change while you pan, so pick it once per
  // filter change rather than once per frame.
  const labelled = useMemo(() => {
    if (!projected.length || labelCount <= 0) return [];
    const candidates =
      activeScene === null
        ? projected
        : projected.filter((item) => item.point.scene === activeScene);
    return candidates
      .slice(Math.max(candidates.length - labelCount, 0))
      .sort((a, b) => (b.point.hours ?? 0) - (a.point.hours ?? 0));
  }, [projected, labelCount, activeScene]);

  // ── Sizing ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      setWidth(Math.max(container.getBoundingClientRect().width, 0));
      // next/font generates the real family name at build time, so read it off the DOM
      // instead of hardcoding "Outfit" into the canvas font string.
      const family = window.getComputedStyle(container).fontFamily;
      if (family) fontRef.current = `600 11px ${family}`;
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Drawing ───────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    frameRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !projected.length || !width) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const transform = transformRef.current;
    // Radii grow sub-linearly with zoom: linear growth turns the dense core into one
    // solid blob, a fixed radius makes zooming in pointless.
    const radiusScale = Math.pow(transform.k, 0.4);

    const visible = (px: number, py: number) =>
      px >= -24 && py >= -24 && px <= width + 24 && py <= height + 24;

    // One path per colour — 3,000 individual fills is the difference between a smooth
    // pan and a stuttering one.
    const byColor = new Map<string, Projected[]>();
    const dimmed: Projected[] = [];
    for (const item of projected) {
      if (activeScene !== null && item.point.scene !== activeScene) {
        dimmed.push(item);
        continue;
      }
      const color = sceneColors.get(item.point.scene) ?? SCENE_FALLBACK_COLOR;
      const bucket = byColor.get(color);
      if (bucket) bucket.push(item);
      else byColor.set(color, [item]);
    }

    const paint = (items: Projected[]) => {
      ctx.beginPath();
      for (const item of items) {
        const px = transform.applyX(item.px);
        const py = transform.applyY(item.py);
        if (!visible(px, py)) continue;
        const pr = Math.max(item.pr * radiusScale, 0.8);
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, Math.PI * 2);
      }
      ctx.fill();
    };

    if (dimmed.length) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#6b6b6b";
      paint(dimmed);
    }

    ctx.globalAlpha = activeScene === null ? 0.75 : 0.9;
    for (const [color, items] of byColor) {
      ctx.fillStyle = color;
      paint(items);
    }
    ctx.globalAlpha = 1;

    // Labels, biggest first, skipping any that would collide with one already placed —
    // without this the dense core turns into unreadable stacked text.
    if (labelled.length) {
      ctx.font = fontRef.current;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.lineJoin = "round";
      const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];

      for (const item of labelled) {
        const px = transform.applyX(item.px);
        const py = transform.applyY(item.py);
        if (px < 40 || py < 20 || px > width - 40 || py > height - 6) continue;

        const text =
          item.point.artist.length > 26
            ? `${item.point.artist.slice(0, 24)}…`
            : item.point.artist;
        const textWidth = ctx.measureText(text).width;
        const baseline = py - Math.max(item.pr * radiusScale, 3) - 5;
        const box = {
          x1: px - textWidth / 2 - 3,
          y1: baseline - 12,
          x2: px + textWidth / 2 + 3,
          y2: baseline + 3,
        };
        const collides = placed.some(
          (other) =>
            box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1,
        );
        if (collides) continue;
        placed.push(box);

        ctx.strokeStyle = "rgba(5,5,5,0.92)";
        ctx.lineWidth = 3;
        ctx.strokeText(text, px, baseline);
        ctx.fillStyle = "rgba(236,236,236,0.96)";
        ctx.fillText(text, px, baseline);
      }
    }

    // Hover ring last so nothing paints over it.
    const hovered = hoveredRef.current;
    if (hovered) {
      const px = transform.applyX(hovered.px);
      const py = transform.applyY(hovered.py);
      ctx.strokeStyle = "#ececec";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(hovered.pr * radiusScale, 2) + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [projected, width, height, activeScene, sceneColors, labelled]);

  const scheduleDraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(draw);
  }, [draw]);

  // The zoom behaviour is attached once and must not be torn down every time the draw
  // closure changes (that would happen on every filter click) — it reaches the current
  // scheduler through this ref instead.
  const scheduleDrawRef = useRef(scheduleDraw);
  useEffect(() => {
    scheduleDrawRef.current = scheduleDraw;
  }, [scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [scheduleDraw]);

  // ── Zoom / pan ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const behavior = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.7, 40])
      // Plain wheel scrolling must keep scrolling the page — the map is one card inside a
      // long route, and swallowing the wheel would trap the user mid-page. Ctrl/⌘ + wheel
      // is also what a trackpad pinch emits, so pinch-to-zoom keeps working.
      .filter((event: Event) => {
        if (event.type === "wheel") {
          const wheel = event as WheelEvent;
          return wheel.ctrlKey || wheel.metaKey;
        }
        // One finger keeps scrolling the page; two fingers drive the map.
        if (event.type === "touchstart") return (event as TouchEvent).touches.length >= 2;
        return !(event as MouseEvent).button;
      })
      .on("zoom", (event: D3ZoomEvent<HTMLCanvasElement, unknown>) => {
        transformRef.current = event.transform;
        scheduleDrawRef.current();
      });

    zoomRef.current = behavior;
    const selection = select(canvas);
    selection.call(behavior);
    selection.on("dblclick.zoom", null);

    return () => {
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!controlsRef) return;
    const run = (apply: (behavior: ZoomBehavior<HTMLCanvasElement, unknown>) => void) => {
      const behavior = zoomRef.current;
      if (behavior && canvasRef.current) apply(behavior);
    };
    const transition = () =>
      select(canvasRef.current as HTMLCanvasElement).transition().duration(260);

    controlsRef.current = {
      zoomIn: () => run((behavior) => behavior.scaleBy(transition(), 1.6)),
      zoomOut: () => run((behavior) => behavior.scaleBy(transition(), 1 / 1.6)),
      reset: () => run((behavior) => behavior.transform(transition(), zoomIdentity)),
    };

    const ref = controlsRef;
    return () => {
      ref.current = null;
    };
  }, [controlsRef]);

  // ── Hit testing ───────────────────────────────────────────────────────────
  const findAt = useCallback(
    (clientX: number, clientY: number): Projected | null => {
      const canvas = canvasRef.current;
      if (!canvas || !tree) return null;
      const rect = canvas.getBoundingClientRect();
      const transform = transformRef.current;
      const x = transform.invertX(clientX - rect.left);
      const y = transform.invertY(clientY - rect.top);
      const found = tree.find(x, y, HOVER_RADIUS_PX / transform.k);
      if (!found) return null;
      if (activeScene !== null && found.point.scene !== activeScene) return null;
      return found;
    },
    [tree, activeScene],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === "touch") return;
      const found = findAt(event.clientX, event.clientY);
      if (found !== hoveredRef.current) {
        hoveredRef.current = found;
        scheduleDraw();
      }
      if (!found) {
        onHoverChange(null);
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      onHoverChange({
        point: found.point,
        left: event.clientX - (rect?.left ?? 0),
        top: event.clientY - (rect?.top ?? 0),
      });
    },
    [findAt, onHoverChange, scheduleDraw],
  );

  const handlePointerLeave = useCallback(() => {
    hoveredRef.current = null;
    onHoverChange(null);
    scheduleDraw();
  }, [onHoverChange, scheduleDraw]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const found = findAt(event.clientX, event.clientY);
      if (found) onSelect(found.point.artist);
    },
    [findAt, onSelect],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-[var(--radius-sm)] bg-bg-primary"
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Taste map of ${drawn.length} artists positioned by listening similarity`}
        className="block h-full w-full cursor-crosshair touch-pan-y"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />
    </div>
  );
}
