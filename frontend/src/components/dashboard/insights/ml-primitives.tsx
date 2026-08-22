"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { entityHref } from "@/components/dashboard/library/entity-meta";

/**
 * Shared furniture for the Insights page.
 *
 * Every model on this page is trained independently and any one of them can be absent,
 * so each section is built from the same three pieces: a header that always renders, a
 * body that renders when the model is present, and `MlUnavailable` when it is not.
 */

export function MlSection({
  id,
  eyebrow,
  title,
  blurb,
  method,
  aside,
  children,
}: {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  blurb: string;
  /** One-line "how this was computed" note, shown under the header. */
  method: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1.5 block font-[family-name:var(--font-display)] text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-green">
            {eyebrow}
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-text-primary sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">{blurb}</p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-text-muted">
            <FlaskIcon className="mt-[3px] shrink-0" />
            <span>{method}</span>
          </p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The placeholder a section renders instead of its chart.
 *
 * Deliberately quiet: in production `torch` is not installed, so two of the five models
 * are *expected* to land here on every run. It has to read as "not enabled", never as
 * "something broke".
 */
export function MlUnavailable({
  title,
  children,
  detail,
  tone = "muted",
}: {
  title: string;
  children: React.ReactNode;
  /** Raw error text from the backend, shown small and folded away. */
  detail?: string;
  tone?: "muted" | "warning";
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-border bg-bg-card/50 p-6">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            tone === "warning" ? "bg-gold/10 text-gold" : "bg-white/[0.05] text-text-muted",
          )}
        >
          {tone === "warning" ? <AlertIcon /> : <InfoIcon />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <div className="mt-1 space-y-1 text-sm text-text-secondary">{children}</div>
          {detail ? (
            <details className="mt-3 text-xs text-text-muted">
              <summary className="cursor-pointer select-none transition-colors hover:text-text-secondary">
                Technical detail
              </summary>
              <p className="mt-1.5 break-words font-mono text-[0.7rem] leading-relaxed">
                {detail}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MlPanel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-bg-card p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Small labelled number. `accent` is for the one figure a section is really about. */
export function MlStat({
  label,
  value,
  hint,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "green" | "gold";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate font-[family-name:var(--font-display)] text-xl font-bold tabular-nums",
          accent === "green" && "text-green",
          accent === "gold" && "text-gold",
          !accent && "text-text-primary",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

/** Pill used for model metadata (AUC, epochs, "deep model off"). */
export function MlChip({
  label,
  value,
  tone = "muted",
  title,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "green" | "gold" | "muted";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        tone === "green" && "border-green/30 bg-green-dim text-green",
        tone === "gold" && "border-gold/30 bg-gold-dim text-gold",
        tone === "muted" && "border-border bg-white/[0.03] text-text-secondary",
      )}
    >
      <span className="uppercase tracking-wider text-[0.6rem] opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

/** Link to an artist's page; every artist name on this page routes through here. */
export function ArtistLink({
  basePath,
  artist,
  className,
  children,
}: {
  basePath: string;
  artist: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={entityHref(basePath, "artist", artist)}
      className={cn("transition-colors hover:text-green", className)}
    >
      {children ?? artist}
    </Link>
  );
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCompactHours(hours: number): string {
  if (!Number.isFinite(hours)) return "—";
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k h`;
  if (hours >= 100) return `${Math.round(hours)} h`;
  return `${hours.toFixed(1)} h`;
}

export function formatClockHour(hour: number): string {
  if (!Number.isFinite(hour)) return "—";
  const normalized = ((hour % 24) + 24) % 24;
  const h = Math.floor(normalized);
  const m = Math.round((normalized - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** `2024-03-01` → `Mar 2024`, without dragging a date library in. */
export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-");
  const index = Number(mon) - 1;
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  if (!year || Number.isNaN(index) || !names[index]) return month;
  return `${names[index]} ${year}`;
}

export function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Guards every list we read out of the payload — the models are built in parallel. */
export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export const ML_TOOLTIP_STYLE = {
  background: "var(--color-bg-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  fontSize: 12,
} as const;

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 3h6M10 3v6.5L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-9.5V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 8v5M12 16.5v.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
