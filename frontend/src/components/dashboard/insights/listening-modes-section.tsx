"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { MLClustering, MLListeningMode } from "@/types/dashboard";
import { formatHours } from "@/lib/utils";
import {
  MlChip,
  MlPanel,
  MlSection,
  MlUnavailable,
  ML_TOOLTIP_STYLE,
  asArray,
  formatClockHour,
  formatPercent,
} from "./ml-primitives";
import { SCENE_COLORS } from "./scene-palette";

/**
 * The five axes every mode is scored on.
 *
 * `median_start_hour` is a clock reading, not a magnitude, so it is re-expressed as
 * "how late in the waking day" — hours elapsed since 04:00 — which makes a 01:48 median
 * read as *late* rather than as *nearly zero*.
 */
const AXES = [
  { key: "skip", label: "Skipping" },
  { key: "shuffle", label: "Shuffle" },
  { key: "diversity", label: "Diversity" },
  { key: "plays", label: "Session length" },
  { key: "late", label: "Later in day" },
] as const;

interface RadarRow {
  metric: string;
  value: number;
  raw: string;
}

export function ListeningModesSection({ clustering }: { clustering?: MLClustering | null }) {
  const modes = useMemo(() => {
    const list = asArray(clustering?.modes);
    return [...list].sort((a, b) => (b.total_hours ?? 0) - (a.total_hours ?? 0));
  }, [clustering]);

  const maxPlays = useMemo(
    () => Math.max(...modes.map((mode) => mode.avg_plays ?? 0), 1),
    [modes],
  );

  return (
    <MlSection
      id="listening-modes"
      eyebrow="Model 2 — Clustering"
      title="How you listen, not what you listen to"
      blurb="Every listening session was reduced to a behavioural profile — length, skipping, shuffling, how many different artists, what time it started — and then grouped. These are the distinct modes that fell out."
      method="Session feature engineering, then KMeans over the session profiles; each cluster is named from its own profile."
      aside={
        clustering?.n_sessions ? (
          <MlChip
            label="Sessions"
            value={clustering.n_sessions.toLocaleString()}
            tone="green"
          />
        ) : null
      }
    >
      {!modes.length ? (
        <MlUnavailable title="No listening modes yet">
          <p>
            Clustering needs a decent number of complete sessions before the groups it finds
            are stable. There isn&apos;t enough session history here yet.
          </p>
        </MlUnavailable>
      ) : (
        <div className="space-y-4">
          <MlPanel className="p-4 sm:p-5">
            <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
              Share of sessions
            </p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-elevated">
              {modes.map((mode, index) => (
                <span
                  key={mode.mode}
                  title={`${mode.name} — ${mode.pct_sessions}% of sessions`}
                  style={{
                    width: `${Math.max(mode.pct_sessions ?? 0, 0)}%`,
                    background: SCENE_COLORS[index % SCENE_COLORS.length],
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {modes.map((mode, index) => (
                <span
                  key={mode.mode}
                  className="flex items-center gap-1.5 text-xs text-text-secondary"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: SCENE_COLORS[index % SCENE_COLORS.length] }}
                  />
                  {mode.name}
                  <span className="tabular-nums text-text-muted">{mode.pct_sessions}%</span>
                </span>
              ))}
            </div>
          </MlPanel>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modes.map((mode, index) => (
              <ModeCard
                key={mode.mode}
                mode={mode}
                color={SCENE_COLORS[index % SCENE_COLORS.length]}
                maxPlays={maxPlays}
              />
            ))}
          </div>
        </div>
      )}
    </MlSection>
  );
}

function ModeCard({
  mode,
  color,
  maxPlays,
}: {
  mode: MLListeningMode;
  color: string;
  maxPlays: number;
}) {
  const rows = useMemo<RadarRow[]>(() => {
    const lateness = (((mode.median_start_hour ?? 0) - 4 + 24) % 24) / 24;
    const values: Record<(typeof AXES)[number]["key"], { value: number; raw: string }> = {
      skip: { value: (mode.skip_rate ?? 0) * 100, raw: formatPercent(mode.skip_rate ?? 0) },
      shuffle: {
        value: (mode.shuffle_rate ?? 0) * 100,
        raw: formatPercent(mode.shuffle_rate ?? 0),
      },
      diversity: {
        value: (mode.artist_diversity ?? 0) * 100,
        raw: formatPercent(mode.artist_diversity ?? 0),
      },
      plays: {
        value: ((mode.avg_plays ?? 0) / maxPlays) * 100,
        raw: `${(mode.avg_plays ?? 0).toFixed(1)} plays`,
      },
      late: { value: lateness * 100, raw: formatClockHour(mode.median_start_hour ?? 0) },
    };
    return AXES.map((axis) => ({
      metric: axis.label,
      value: Number(values[axis.key].value.toFixed(1)),
      raw: values[axis.key].raw,
    }));
  }, [mode, maxPlays]);

  return (
    <MlPanel className="flex flex-col p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text-primary">
          <span
            className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ background: color }}
          />
          {mode.name}
        </h3>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs tabular-nums text-text-secondary">
          {mode.pct_sessions}%
        </span>
      </div>
      <p className="mb-3 text-xs text-text-muted">
        {mode.n_sessions.toLocaleString()} sessions · {formatHours(mode.total_hours)} total
      </p>

      <div className="-mx-2 h-[190px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rows} outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={ML_TOOLTIP_STYLE}
              labelStyle={{ color: "var(--color-text-primary)" }}
              formatter={(_value, _name, item) => [
                (item?.payload as RadarRow | undefined)?.raw ?? "—",
                "",
              ]}
            />
            <Radar
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.22}
              strokeWidth={1.6}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs">
        <Fingerprint label="Skip rate" value={formatPercent(mode.skip_rate ?? 0)} />
        <Fingerprint label="Shuffle" value={formatPercent(mode.shuffle_rate ?? 0)} />
        <Fingerprint
          label="Artist diversity"
          value={formatPercent(mode.artist_diversity ?? 0)}
        />
        <Fingerprint label="Avg plays" value={(mode.avg_plays ?? 0).toFixed(1)} />
        <Fingerprint
          label="Median start"
          value={formatClockHour(mode.median_start_hour ?? 0)}
        />
        <Fingerprint
          label="Min / track"
          value={`${(mode.avg_min_per_track ?? 0).toFixed(2)}`}
        />
      </dl>
    </MlPanel>
  );
}

function Fingerprint({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="truncate text-text-muted">{label}</dt>
      <dd className="shrink-0 font-semibold tabular-nums text-text-secondary">{value}</dd>
    </div>
  );
}
