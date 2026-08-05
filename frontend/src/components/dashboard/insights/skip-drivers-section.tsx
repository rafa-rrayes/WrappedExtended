"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MLSkipModel } from "@/types/dashboard";
import {
  MlChip,
  MlPanel,
  MlSection,
  MlUnavailable,
  asArray,
  formatPercent,
} from "./ml-primitives";
import { skipFeatureCopy } from "./skip-features";

interface DriverRow {
  feature: string;
  label: string;
  explanation: string;
  importance: number;
  /** Share of the strongest driver, used for the colour ramp. */
  ratio: number;
}

export function SkipDriversSection({ skipModel }: { skipModel?: MLSkipModel | null }) {
  const drivers = useMemo<DriverRow[]>(() => {
    const list = asArray(skipModel?.drivers)
      .filter((driver) => Number.isFinite(driver.importance))
      .sort((a, b) => b.importance - a.importance);
    const max = Math.max(...list.map((driver) => driver.importance), 1e-9);
    return list.map((driver) => {
      const copy = skipFeatureCopy(driver.feature);
      return {
        feature: driver.feature,
        label: copy.label,
        explanation: copy.explanation,
        importance: driver.importance,
        ratio: driver.importance / max,
      };
    });
  }, [skipModel]);

  const mlp = skipModel?.pytorch_mlp;

  return (
    <MlSection
      id="skip-drivers"
      eyebrow="Model 3 — Skip prediction"
      title="What makes you hit skip"
      blurb="A model was trained to predict, play by play, whether you were about to skip. These are the signals it leaned on hardest — shuffled by one feature at a time to see how much the prediction degrades."
      method="Gradient boosting on 12 play-level features, ranked by permutation importance (how much accuracy is lost when a feature is scrambled)."
      aside={
        skipModel ? (
          <div className="flex flex-wrap gap-2">
            <MlChip
              label="AUC"
              value={skipModel.gradient_boosting_auc?.toFixed(3) ?? "—"}
              tone="green"
              title="Area under the ROC curve — 0.5 is a coin flip, 1.0 is perfect."
            />
            <MlChip
              label="You skip"
              value={formatPercent(skipModel.baseline_skip_rate ?? 0)}
              title="Share of all plays that ended in a skip — the baseline the model has to beat."
            />
            {mlp?.available ? (
              <MlChip
                label="Deep model AUC"
                value={mlp.auc?.toFixed(3) ?? "—"}
                tone="gold"
                title={mlp.epochs ? `PyTorch MLP, ${mlp.epochs} epochs` : "PyTorch MLP"}
              />
            ) : null}
          </div>
        ) : null
      }
    >
      {!skipModel || !drivers.length ? (
        <MlUnavailable title="No skip model for this history">
          <p>
            Training a skip predictor needs both plenty of plays and a mix of skipped and
            completed ones. This export doesn&apos;t have enough of both yet.
          </p>
        </MlUnavailable>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <MlPanel className="p-4 sm:p-5">
            <div style={{ height: Math.max(drivers.length * 34 + 40, 240) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={drivers}
                  layout="vertical"
                  margin={{ top: 4, right: 56, bottom: 4, left: 4 }}
                  barCategoryGap="22%"
                >
                  <XAxis type="number" hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={170}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    content={<DriverTooltip />}
                  />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {drivers.map((driver) => (
                      <Cell
                        key={driver.feature}
                        fill={`rgba(29,185,84,${(0.3 + driver.ratio * 0.7).toFixed(3)})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Bars show how much prediction accuracy is lost when that signal is scrambled —
              longer means the model relies on it more.
            </p>
          </MlPanel>

          <div className="space-y-4">
            <MlPanel className="p-5">
              <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
                What the top signals mean
              </p>
              <ol className="space-y-3">
                {drivers.slice(0, 4).map((driver, index) => (
                  <li key={driver.feature} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-dim text-[0.65rem] font-bold text-green">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary">
                        {driver.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-text-muted">
                        {driver.explanation}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </MlPanel>

            <DeepModelCard mlp={mlp} />
          </div>
        </div>
      )}
    </MlSection>
  );
}

/**
 * The PyTorch MLP is trained on the same features as a cross-check.
 *
 * `torch` is deliberately not installed in production, so `available: false` is the
 * *normal* answer here — this card has to read as an optional extra that is switched off,
 * not as a failure.
 */
function DeepModelCard({ mlp }: { mlp?: MLSkipModel["pytorch_mlp"] }) {
  if (mlp?.available) {
    return (
      <MlPanel className="p-5">
        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
          Deep model cross-check
        </p>
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-gold">
          {mlp.auc?.toFixed(3) ?? "—"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          A small PyTorch neural net trained on the same features
          {mlp.epochs ? ` for ${mlp.epochs} epochs` : ""}. Close agreement with the gradient
          boosting AUC means the ranking above is a property of your data, not of one
          algorithm.
        </p>
      </MlPanel>
    );
  }

  return (
    <MlUnavailable title="Deep model not enabled" detail={mlp?.error}>
      <p>
        The optional PyTorch cross-check doesn&apos;t run on our servers — it needs a deep
        learning runtime we don&apos;t ship. The gradient boosting model above is the one
        doing the work, and it&apos;s the one the driver ranking comes from.
      </p>
    </MlUnavailable>
  );
}

function DriverTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DriverRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-[260px] rounded-[var(--radius-sm)] border border-border bg-bg-card/95 p-3 shadow-lg backdrop-blur">
      <p className="text-sm font-semibold text-text-primary">{row.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">{row.explanation}</p>
      <p className="mt-2 font-mono text-[0.7rem] text-text-muted">
        importance {row.importance.toFixed(4)} · {row.feature}
      </p>
    </div>
  );
}
