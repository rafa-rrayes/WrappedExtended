import { cn } from "@/lib/utils";

/**
 * Shared section chrome: numbered eyebrow, display heading, optional note.
 *
 * Mirrors the numbered-section rhythm the long-form dashboard already uses so the compare
 * route reads as part of the same product rather than a bolted-on tool.
 */
export function CompareSection({
  eyebrow,
  title,
  accent,
  note,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  accent?: React.ReactNode;
  note?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-10", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-green">
            {eyebrow}
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.25rem,2.4vw,1.75rem)] font-extrabold leading-tight text-text-primary">
            {title} {accent && <span className="text-gold">{accent}</span>}
          </h2>
        </div>
        {actions}
      </div>
      {note && <p className="mb-4 max-w-3xl text-xs leading-relaxed text-text-muted">{note}</p>}
      {children}
    </section>
  );
}

/** The A/B key, repeated wherever two series share a chart. */
export function PeriodLegend({
  labelA,
  labelB,
  colorA,
  colorB,
}: {
  labelA: string;
  labelB: string;
  colorA: string;
  colorB: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <LegendKey slot="A" label={labelA} color={colorA} />
      <LegendKey slot="B" label={labelB} color={colorB} />
    </div>
  );
}

function LegendKey({ slot, label, color }: { slot: string; label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-text-secondary">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="text-text-muted">{slot}</span>
      <span className="text-text-primary">{label}</span>
    </span>
  );
}
