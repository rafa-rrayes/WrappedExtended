"use client";

import { useEffect, useMemo, useState } from "react";
import type { MLEmbeddings } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  ArtistLink,
  MlPanel,
  MlSection,
  MlUnavailable,
  asArray,
} from "./ml-primitives";

/**
 * The nearest-neighbour browser over the artist embedding.
 *
 * `similar_artists` is keyed by artist name, so the whole panel is a picker plus a
 * neighbour list — no extra requests, everything already came down with the payload.
 */
export function SimilarArtistsSection({
  basePath,
  embeddings,
}: {
  basePath: string;
  embeddings?: MLEmbeddings | null;
}) {
  const artists = useMemo(() => {
    const map = embeddings?.similar_artists;
    if (!map || typeof map !== "object") return [];
    return Object.keys(map).filter((key) => asArray(map[key]).length > 0);
  }, [embeddings]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected((current) =>
      current && artists.includes(current) ? current : (artists[0] ?? null),
    );
  }, [artists]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return artists;
    return artists.filter((artist) => artist.toLowerCase().includes(needle));
  }, [artists, query]);

  const neighbors = useMemo(() => {
    if (!selected) return [];
    return asArray(embeddings?.similar_artists?.[selected]);
  }, [embeddings, selected]);

  const topTrack = embeddings?.similar_to_top_track;

  return (
    <MlSection
      id="similar-artists"
      eyebrow="Embeddings — Neighbours"
      title="Who sits next to whom"
      blurb="The same vectors that place artists on the map also answer 'who is closest to this artist, for me'. This is your own similarity graph — two artists are close because you play them together, not because a genre tag says so."
      method="Cosine similarity between artist vectors from the PPMI + SVD embedding; 1.0 would mean identical listening context."
    >
      {!artists.length ? (
        <MlUnavailable title="No similarity graph yet">
          <p>
            Neighbours only mean something once an artist has been played across enough
            different sessions. There isn&apos;t enough co-listening in this history yet.
          </p>
        </MlUnavailable>
      ) : (
        <div className="space-y-4">
          <MlPanel className="grid gap-0 p-0 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
            <div className="border-b border-border p-4 md:border-b-0 md:border-r">
              <label className="sr-only" htmlFor="similar-artist-filter">
                Filter artists
              </label>
              <input
                id="similar-artist-filter"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find an artist…"
                className="mb-3 w-full rounded-[var(--radius-sm)] border border-border bg-bg-deep px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-green focus:outline-none"
              />
              <ul className="max-h-[320px] space-y-0.5 overflow-y-auto pr-1">
                {filtered.map((artist) => (
                  <li key={artist}>
                    <button
                      type="button"
                      onClick={() => setSelected(artist)}
                      aria-current={selected === artist}
                      className={cn(
                        "w-full truncate rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors",
                        selected === artist
                          ? "bg-green-dim text-green"
                          : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                      )}
                    >
                      {artist}
                    </button>
                  </li>
                ))}
                {!filtered.length ? (
                  <li className="px-3 py-2 text-sm text-text-muted">No match.</li>
                ) : null}
              </ul>
            </div>

            <div className="p-5">
              {selected ? (
                <>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-text-primary">
                      Closest to{" "}
                      <ArtistLink
                        basePath={basePath}
                        artist={selected}
                        className="text-green"
                      />
                    </h3>
                    <span className="text-xs text-text-muted">cosine similarity</span>
                  </div>

                  <ul className="space-y-2.5">
                    {neighbors.map((neighbor) => (
                      <li key={neighbor.artist} className="flex items-center gap-3">
                        <ArtistLink
                          basePath={basePath}
                          artist={neighbor.artist}
                          className="w-[38%] shrink-0 truncate text-sm text-text-secondary"
                        />
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated">
                          <span
                            className="block h-full rounded-full bg-green"
                            style={{
                              width: `${Math.max(
                                Math.min((neighbor.score ?? 0) * 100, 100),
                                2,
                              )}%`,
                            }}
                          />
                        </span>
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-text-muted">
                          {(neighbor.score ?? 0).toFixed(3)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </MlPanel>

          {topTrack && asArray(topTrack.neighbors).length ? (
            <MlPanel className="p-5">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
                Same idea, at track level
              </p>
              <p className="mb-3 text-sm text-text-secondary">
                Tracks nearest to{" "}
                <span className="font-semibold text-text-primary">{topTrack.track}</span> in
                the same embedding space.
              </p>
              <ul className="flex flex-wrap gap-2">
                {asArray(topTrack.neighbors)
                  .slice(0, 10)
                  .map((neighbor) => (
                    <li
                      key={neighbor.track}
                      className="flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-xs text-text-secondary"
                    >
                      <span className="max-w-[220px] truncate">{neighbor.track}</span>
                      <span className="tabular-nums text-text-muted">
                        {(neighbor.score ?? 0).toFixed(2)}
                      </span>
                    </li>
                  ))}
              </ul>
            </MlPanel>
          ) : null}
        </div>
      )}
    </MlSection>
  );
}
