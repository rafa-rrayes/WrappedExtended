"use client";

import type { ReactNode } from "react";

/**
 * The one tooltip shell the compare route draws.
 *
 * Both charts on this page show the same thing — period A on one line, period B on the
 * next — and had grown their own copy of the surface and the row layout, which had already
 * started to drift (one had an extra column, the other different padding). One component,
 * one look, and the A/B row order can never disagree between two charts again.
 *
 * Recharts passes `active`/`payload` to whatever is handed to `<Tooltip content={…} />`,
 * so each chart keeps its own thin wrapper for reading its own row shape and hands the
 * result here.
 */
export function CompareTooltip({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-green/30 bg-bg-deep/95 px-3 py-2 text-xs shadow-2xl">
      <div className="mb-1 font-semibold text-text-primary">{title}</div>
      {children}
    </div>
  );
}

/**
 * One period's line inside the tooltip.
 *
 * `detail` is the optional middle column — the temporal overlay uses it for the real
 * calendar month behind an aligned point, which is the whole reason that chart's tooltip
 * exists; the distribution chart has nothing to put there and omits it.
 */
export function CompareTooltipRow({
  color,
  label,
  detail,
  value,
}: {
  color: string;
  label: string;
  detail?: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="text-text-muted">{label}</span>
      {detail ? <span className="text-text-secondary">{detail}</span> : null}
      <span className="ml-auto pl-2 font-semibold text-text-primary">{value}</span>
    </div>
  );
}
