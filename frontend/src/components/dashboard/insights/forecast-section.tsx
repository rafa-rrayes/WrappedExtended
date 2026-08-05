"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MLAnomalousDay, MLForecast } from "@/types/dashboard";
import {
  MlChip,
  MlPanel,
  MlSection,
  MlStat,
  MlUnavailable,
  asArray,
  formatDayLabel,
  formatMonthLabel,
  formatPercent,
} from "./ml-primitives";

interface ChartRow {
  month: string;
  history: number | null;
  forecast: number | null;
  /** `[lower, upper]` — Recharts renders a two-value Area as a band. */
  band: [number, number] | null;
}

export function ForecastSection({ forecast }: { forecast?: MLForecast | null }) {
  const history = useMemo(() => asArray(forecast?.history), [forecast]);
  const projection = useMemo(() => asArray(forecast?.forecast_next_6_months), [forecast]);
  const anomalies = useMemo(() => asArray(forecast?.anomalous_days), [forecast]);

  const rows = useMemo<ChartRow[]>(() => {
    const out: ChartRow[] = history.map((point) => ({
      month: point.month,
      history: point.hours,
      forecast: null,
      band: null,
    }));

    // Bridge point: without it the dashed forecast line starts floating in mid-air,
    // detached from the history it continues.
    const last = out[out.length - 1];
    if (last && last.history != null) {
      last.forecast = last.history;
      last.band = [last.history, last.history];
    }

    for (const point of projection) {
      out.push({
        month: point.month,
        history: null,
        forecast: point.hours,
        band: [point.lower ?? point.hours, point.upper ?? point.hours],
      });
    }
    return out;
  }, [history, projection]);

  const hasChart = rows.length > 1;
  const nextMonth = projection[0];

  return (
    <MlSection
      id="forecast"
      eyebrow="Model 4 — Forecast & anomalies"
      title="Where your listening is heading"
      blurb="Your monthly hours, extended six months out with a seasonal model, plus the days that don't look like any of your others."
      method="Holt-Winters exponential smoothing for the forecast band; IsolationForest over daily listening features for the anomalies."
      aside={
        forecast ? (
          <div className="flex flex-wrap gap-2">
            {forecast.history_months ? (
              <MlChip label="Months of history" value={forecast.history_months} />
            ) : null}
            {forecast.avg_monthly_hours_last_year ? (
              <MlChip
                label="Avg / month (last year)"
                value={`${forecast.avg_monthly_hours_last_year.toFixed(0)} h`}
                tone="green"
              />
            ) : null}
          </div>
        ) : null
      }
    >
      {!forecast || (!hasChart && !anomalies.length) ? (
        <MlUnavailable title="Not enough history to forecast">
          <p>
            The seasonal model needs a couple of years of monthly totals before its
            projection is worth showing. Come back once this export covers more ground.
          </p>
        </MlUnavailable>
      ) : (
        <div className="space-y-4">
          {hasChart ? (
            <MlPanel className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                <LegendSwatch color="#1DB954">Actual hours</LegendSwatch>
                <LegendSwatch color="#F5A623" dashed>
                  Forecast
                </LegendSwatch>
                <LegendSwatch color="rgba(245,166,35,0.28)" block>
                  Confidence band
                </LegendSwatch>
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthLabel}
                      minTickGap={44}
                      tickLine={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={44}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                      tickFormatter={(value: number) => `${Math.round(value)}h`}
                    />
                    <Tooltip content={<ForecastTooltip />} />
                    <Area
                      dataKey="band"
                      stroke="none"
                      fill="#F5A623"
                      fillOpacity={0.16}
                      isAnimationActive={false}
                      connectNulls={false}
                      activeDot={false}
                    />
                    <Line
                      dataKey="history"
                      stroke="#1DB954"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                    <Line
                      dataKey="forecast"
                      stroke="#F5A623"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={{ r: 2.5, fill: "#F5A623", strokeWidth: 0 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {nextMonth ? (
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                  <MlStat
                    label="Next month"
                    value={`${nextMonth.hours.toFixed(0)} h`}
                    hint={formatMonthLabel(nextMonth.month)}
                    accent="gold"
                  />
                  <MlStat
                    label="Likely range"
                    value={`${(nextMonth.lower ?? nextMonth.hours).toFixed(0)}–${(
                      nextMonth.upper ?? nextMonth.hours
                    ).toFixed(0)} h`}
                  />
                  <MlStat
                    label="Next 6 months"
                    value={`${projection
                      .reduce((sum, point) => sum + point.hours, 0)
                      .toFixed(0)} h`}
                    hint="projected total"
                  />
                  <MlStat
                    label="Unusual days"
                    value={anomalies.length}
                    hint="flagged by the model"
                  />
                </div>
              ) : null}
            </MlPanel>
          ) : null}

          {anomalies.length ? (
            <MlPanel className="p-5">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-text-primary">
                  Days that broke the pattern
                </h3>
                <span className="text-xs text-text-muted">
                  ranked by how far outside your normal day they sit
                </span>
              </div>
              <p className="mb-4 text-sm text-text-secondary">
                An outlier detector was fitted on every day of your history — hours, plays,
                artist spread, skipping — and these are the days it couldn&apos;t explain.
              </p>
              <ol className="grid gap-2.5 sm:grid-cols-2">
                {anomalies.slice(0, 8).map((day, index) => (
                  <AnomalyCard key={day.date} day={day} rank={index + 1} />
                ))}
              </ol>
            </MlPanel>
          ) : null}
        </div>
      )}
    </MlSection>
  );
}

/**
 * Custom rather than a `formatter`: each row carries either an actual or a forecast plus a
 * band, never both, and the default tooltip would print an empty line for the other one.
 */
function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const band = row.band;

  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-text-primary">
        {formatMonthLabel(String(label ?? row.month))}
      </p>
      {row.history != null ? (
        <p className="mt-1 text-xs text-text-secondary">
          <span className="text-green">Actual</span> {row.history.toFixed(1)} h
        </p>
      ) : null}
      {row.history == null && row.forecast != null ? (
        <p className="mt-1 text-xs text-text-secondary">
          <span className="text-gold">Forecast</span> {row.forecast.toFixed(1)} h
        </p>
      ) : null}
      {row.history == null && band && band[0] !== band[1] ? (
        <p className="mt-0.5 text-xs tabular-nums text-text-muted">
          likely {band[0].toFixed(0)}–{band[1].toFixed(0)} h
        </p>
      ) : null}
    </div>
  );
}

function AnomalyCard({ day, rank }: { day: MLAnomalousDay; rank: number }) {
  return (
    <li className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-bg-elevated/40 p-3.5">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-dim text-[0.7rem] font-bold text-gold">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {formatDayLabel(day.date)}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="tabular-nums text-text-secondary">
            {day.hours.toFixed(1)} h
          </span>
          <span className="tabular-nums">{day.plays.toLocaleString()} plays</span>
          <span className="tabular-nums">
            {day.unique_artists.toLocaleString()} artists
          </span>
          <span className="tabular-nums">{formatPercent(day.skip_rate ?? 0, 0)} skipped</span>
        </div>
      </div>
    </li>
  );
}

function LegendSwatch({
  color,
  dashed,
  block,
  children,
}: {
  color: string;
  dashed?: boolean;
  block?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {block ? (
        <span className="h-2.5 w-4 rounded-sm" style={{ background: color }} />
      ) : (
        <span
          className="h-0 w-4"
          style={{
            borderTop: `2px ${dashed ? "dashed" : "solid"} ${color}`,
          }}
        />
      )}
      {children}
    </span>
  );
}
