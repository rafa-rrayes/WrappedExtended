"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MLEmbeddings } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  ArtistLink,
  MlChip,
  MlPanel,
  MlSection,
  MlUnavailable,
  asArray,
  formatCompactHours,
} from "./ml-primitives";
import { buildSceneColors, SCENE_FALLBACK_COLOR, sceneLabel } from "./scene-palette";
import { TasteMapCanvas, type TasteMapHandle, type TasteMapHover } from "./taste-map-canvas";
import { entityHref } from "@/components/dashboard/library/entity-meta";

const DESKTOP_HEIGHT = 560;
const MOBILE_HEIGHT = 380;
const DESKTOP_LABELS = 26;
const MOBILE_LABELS = 8;

export function TasteMapSection({
  basePath,
  embeddings,
}: {
  basePath: string;
  embeddings: MLEmbeddings | null | undefined;
}) {
  const router = useRouter();
  const controlsRef = useRef<TasteMapHandle | null>(null);
  const [activeScene, setActiveScene] = useState<number | null>(null);
  const [hover, setHover] = useState<TasteMapHover | null>(null);
  const isCompact = useIsCompact();

  const points = useMemo(() => asArray(embeddings?.points), [embeddings]);
  const scenes = useMemo(() => {
    const list = asArray(embeddings?.scenes);
    // Biggest scene first so the palette's brand colours land on the artists that matter.
    return [...list].sort((a, b) => (b.hours ?? b.size ?? 0) - (a.hours ?? a.size ?? 0));
  }, [embeddings]);
  const sceneColors = useMemo(() => buildSceneColors(scenes), [scenes]);

  const activeSceneData = useMemo(
    () => scenes.find((scene) => scene.scene === activeScene) ?? null,
    [scenes, activeScene],
  );

  const handleSelect = useCallback(
    (artist: string) => {
      router.push(entityHref(basePath, "artist", artist));
    },
    [router, basePath],
  );

  const method =
    embeddings?.method || "PPMI co-occurrence + truncated SVD (word2vec-equivalent)";
  const projection = embeddings?.projection || "UMAP";

  return (
    <MlSection
      id="taste-map"
      eyebrow="Model 1 — Embeddings"
      title="Your taste map"
      blurb="Every artist you've played, placed by the company they keep. Artists that show up in the same listening sessions end up near each other, so the clusters are your scenes — not genres someone else assigned."
      method={`${method}, projected to 2D with ${projection}. Scenes are clusters in the embedding space.`}
      aside={
        points.length ? (
          <div className="flex flex-wrap gap-2">
            <MlChip label="Artists" value={points.length.toLocaleString()} tone="green" />
            <MlChip label="Scenes" value={scenes.length} />
            {embeddings?.model?.vector_size ? (
              <MlChip label="Dims" value={embeddings.model.vector_size} />
            ) : null}
          </div>
        ) : null
      }
    >
      {!points.length ? (
        <MlUnavailable title="No taste map for this history">
          <p>
            The embedding model needs a few hundred sessions with repeat artists before the
            map means anything. Once there&apos;s more history here, it will fill in.
          </p>
        </MlUnavailable>
      ) : (
        <MlPanel className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-muted">
              {isCompact
                ? "Drag to pan · two fingers to zoom · tap a dot to open the artist"
                : "Drag to pan · ⌘/Ctrl + scroll to zoom · click a dot to open the artist"}
            </p>
            <div className="flex items-center gap-1.5">
              <MapButton label="Zoom in" onClick={() => controlsRef.current?.zoomIn()}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                  <path
                    d="M12 6v12M6 12h12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </MapButton>
              <MapButton label="Zoom out" onClick={() => controlsRef.current?.zoomOut()}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </MapButton>
              <MapButton label="Reset view" onClick={() => controlsRef.current?.reset()}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                  <path
                    d="M4 9a8 8 0 1 1 .6 6M4 5v4h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </MapButton>
            </div>
          </div>

          <div className="relative">
            <TasteMapCanvas
              points={points}
              sceneColors={sceneColors}
              activeScene={activeScene}
              labelCount={isCompact ? MOBILE_LABELS : DESKTOP_LABELS}
              height={isCompact ? MOBILE_HEIGHT : DESKTOP_HEIGHT}
              onHoverChange={setHover}
              onSelect={handleSelect}
              controlsRef={controlsRef}
            />

            {hover ? (
              <div
                className="pointer-events-none absolute z-10 max-w-[220px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-[var(--radius-sm)] border border-border bg-bg-card/95 px-3 py-2 shadow-lg backdrop-blur"
                style={{ left: hover.left, top: hover.top }}
              >
                <p className="truncate text-sm font-semibold text-text-primary">
                  {hover.point.artist}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-secondary">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background:
                        sceneColors.get(hover.point.scene) ?? SCENE_FALLBACK_COLOR,
                    }}
                  />
                  {formatCompactHours(hover.point.hours)}
                </p>
              </div>
            ) : null}
          </div>

          {/* Legend — doubles as the filter. */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
                Scenes
              </p>
              {activeScene !== null ? (
                <button
                  type="button"
                  onClick={() => setActiveScene(null)}
                  className="text-xs text-green underline-offset-4 hover:underline"
                >
                  Show all
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {scenes.map((scene) => {
                const color = sceneColors.get(scene.scene) ?? SCENE_FALLBACK_COLOR;
                const isActive = activeScene === scene.scene;
                return (
                  <button
                    key={scene.scene}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveScene(isActive ? null : scene.scene)}
                    className={cn(
                      "group flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-all",
                      isActive
                        ? "border-white/25 bg-white/[0.08] text-text-primary"
                        : "border-border bg-white/[0.02] text-text-secondary hover:border-white/15 hover:text-text-primary",
                      activeScene !== null && !isActive && "opacity-45",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="truncate">{sceneLabel(scene)}</span>
                    {scene.hours != null ? (
                      <span className="shrink-0 tabular-nums text-text-muted">
                        {formatCompactHours(scene.hours)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {activeSceneData ? (
            <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-bg-elevated/40 p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background:
                      sceneColors.get(activeSceneData.scene) ?? SCENE_FALLBACK_COLOR,
                  }}
                />
                <p className="text-sm font-semibold text-text-primary">
                  {sceneLabel(activeSceneData)}
                </p>
                {activeSceneData.size != null ? (
                  <span className="text-xs text-text-muted">
                    {activeSceneData.size.toLocaleString()} artists
                  </span>
                ) : null}
                {activeSceneData.hours != null ? (
                  <span className="text-xs text-text-muted">
                    · {formatCompactHours(activeSceneData.hours)}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {asArray(activeSceneData.artists)
                  .slice(0, 18)
                  .map((artist) => (
                    <ArtistLink
                      key={artist}
                      basePath={basePath}
                      artist={artist}
                      className="text-sm text-text-secondary"
                    />
                  ))}
              </div>
            </div>
          ) : null}
        </MlPanel>
      )}
    </MlSection>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border bg-white/[0.03] text-text-secondary transition-colors hover:border-white/15 hover:text-text-primary"
    >
      {children}
    </button>
  );
}

/** Below `md` the map gets a shorter canvas and far fewer labels. */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}
