"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { MLSequenceModel } from "@/types/dashboard";
import {
  ArtistLink,
  MlChip,
  MlPanel,
  MlSection,
  MlStat,
  MlUnavailable,
  ML_TOOLTIP_STYLE,
  asArray,
  formatPercent,
} from "./ml-primitives";

export function SequenceModelSection({
  basePath,
  sequenceModel,
}: {
  basePath: string;
  sequenceModel?: MLSequenceModel | null;
}) {
  const available = Boolean(sequenceModel?.available);
  const loss = useMemo(
    () =>
      asArray(sequenceModel?.train_loss_curve).map((value, index) => ({
        epoch: index + 1,
        loss: value,
      })),
    [sequenceModel],
  );
  const samples = useMemo(
    () => asArray(sequenceModel?.sample_predictions),
    [sequenceModel],
  );

  return (
    <MlSection
      id="next-artist"
      eyebrow="Model 5 — Sequence"
      title="Guessing your next artist"
      blurb="Treat your listening history as a language, where artists are words and sessions are sentences. A sequence model reads the last few artists you played and predicts who comes next."
      method="A neural sequence model over artist transitions within sessions, scored on held-out sessions against a most-popular-artist baseline."
      aside={
        available && sequenceModel?.params ? (
          <div className="flex flex-wrap gap-2">
            <MlChip label="Vocab" value={sequenceModel.params.vocab.toLocaleString()} />
            <MlChip label="Epochs" value={sequenceModel.params.epochs} />
          </div>
        ) : null
      }
    >
      {!available ? (
        <MlUnavailable title="Deep sequence model not enabled" detail={sequenceModel?.error}>
          <p>
            This one needs a deep learning runtime that we deliberately don&apos;t install on
            the servers that process your data — it would multiply the memory each run needs
            for a model that predicts, at best, one artist in four.
          </p>
          <p>
            Nothing failed and nothing is missing from the rest of this page: the four models
            above are complete. If you want this one, the analysis suite runs it locally.
          </p>
        </MlUnavailable>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <MlPanel className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <MlStat
                label="Top-1 accuracy"
                value={formatPercent(sequenceModel?.next_artist_top1 ?? 0)}
                hint="exact next artist"
                accent="green"
              />
              <MlStat
                label="Top-5 accuracy"
                value={formatPercent(sequenceModel?.next_artist_top5 ?? 0)}
                hint="in its five guesses"
                accent="green"
              />
              <MlStat
                label="Baseline"
                value={formatPercent(sequenceModel?.baseline_top1 ?? 0)}
                hint="always guessing your top artist"
              />
              <MlStat
                label="Lift"
                value={`${(sequenceModel?.lift_over_baseline ?? 0).toFixed(1)}×`}
                hint="better than the baseline"
                accent="gold"
              />
            </div>

            {sequenceModel?.sessions_train || sequenceModel?.sessions_test ? (
              <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">
                Trained on {(sequenceModel.sessions_train ?? 0).toLocaleString()} sessions,
                scored on {(sequenceModel.sessions_test ?? 0).toLocaleString()} it never saw.
              </p>
            ) : null}

            {loss.length > 1 ? (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-1 flex items-baseline justify-between">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
                    Training loss
                  </p>
                  <p className="text-xs tabular-nums text-text-muted">
                    {loss[0].loss.toFixed(2)} → {loss[loss.length - 1].loss.toFixed(2)}
                  </p>
                </div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={loss} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <YAxis hide domain={["dataMin - 0.2", "dataMax + 0.2"]} />
                      <Tooltip
                        contentStyle={ML_TOOLTIP_STYLE}
                        labelFormatter={(label: number) => `Epoch ${label}`}
                        formatter={(value) => [
                          typeof value === "number" ? value.toFixed(3) : "—",
                          "loss",
                        ]}
                      />
                      <Line
                        dataKey="loss"
                        stroke="#F5A623"
                        strokeWidth={2}
                        dot={{ r: 2, fill: "#F5A623", strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Falling loss per epoch — the model is still learning structure, not noise.
                </p>
              </div>
            ) : null}
          </MlPanel>

          {samples.length ? (
            <MlPanel className="p-5">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
                What it predicts
              </p>
              <p className="mb-4 text-sm text-text-secondary">
                Given only the artist on the left, these are the model&apos;s five most likely
                follow-ups.
              </p>
              <ul className="space-y-3">
                {samples.slice(0, 6).map((sample) => (
                  <li key={sample.after} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-text-primary">
                      After{" "}
                      <ArtistLink basePath={basePath} artist={sample.after}>
                        {sample.after}
                      </ArtistLink>
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {asArray(sample.predicts).map((artist, index) => (
                        <ArtistLink
                          key={`${sample.after}-${artist}`}
                          basePath={basePath}
                          artist={artist}
                          className="rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-xs text-text-secondary hover:border-green/30"
                        >
                          <span className="mr-1 text-text-muted">{index + 1}</span>
                          {artist}
                        </ArtistLink>
                      ))}
                    </div>
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
