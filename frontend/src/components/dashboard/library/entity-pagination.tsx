"use client";

import { cn, formatNumber } from "@/lib/utils";

interface EntityPaginationProps {
  page: number;
  pageSize: number;
  /** Total matching entities across all pages. */
  count: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Page numbers with an ellipsis, plus the "1–50 of 10,327" range readout.
 *
 * Always renders the first and last page so a user 200 pages deep can get back to either
 * end in one click, which matters a lot more here than usual: a real export has thousands
 * of pages of tracks.
 */
export function EntityPagination({
  page,
  pageSize,
  count,
  onPageChange,
  disabled,
}: EntityPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const current = Math.min(page, totalPages);
  const firstRow = count === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastRow = Math.min(current * pageSize, count);

  return (
    <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-text-muted">
        {count === 0 ? (
          "No results"
        ) : (
          <>
            <span className="tabular-nums text-text-secondary">
              {formatNumber(firstRow)}–{formatNumber(lastRow)}
            </span>{" "}
            of <span className="tabular-nums text-text-secondary">{formatNumber(count)}</span>
          </>
        )}
      </p>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <PageButton
            onClick={() => onPageChange(current - 1)}
            disabled={disabled || current <= 1}
            label="Previous page"
          >
            <Chevron direction="left" />
          </PageButton>

          {/* Compact on phones — the number strip needs room the viewport doesn't have. */}
          <span className="px-2 text-xs tabular-nums text-text-secondary sm:hidden">
            {current} / {totalPages}
          </span>

          <span className="hidden items-center gap-1 sm:flex">
            {pageWindow(current, totalPages).map((entry, index) =>
              entry === null ? (
                <span key={`gap-${index}`} className="px-1 text-xs text-text-muted">
                  …
                </span>
              ) : (
                <PageButton
                  key={entry}
                  onClick={() => onPageChange(entry)}
                  disabled={disabled}
                  active={entry === current}
                  label={`Page ${entry}`}
                  current={entry === current}
                >
                  <span className="tabular-nums">{entry}</span>
                </PageButton>
              ),
            )}
          </span>

          <PageButton
            onClick={() => onPageChange(current + 1)}
            disabled={disabled || current >= totalPages}
            label="Next page"
          >
            <Chevron direction="right" />
          </PageButton>
        </nav>
      )}
    </div>
  );
}

/**
 * The page numbers to show, with `null` marking an elided run.
 * Always includes page 1, the last page, and the current page's immediate neighbours.
 */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current]);
  for (const offset of [-1, 1]) {
    const candidate = current + offset;
    if (candidate > 1 && candidate < total) pages.add(candidate);
  }
  // Keep the strip a stable width near the ends, where the window has nothing to its left
  // or right to spend.
  if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((page) => pages.add(page));

  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push(null);
    result.push(page);
    previous = page;
  }
  return result;
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  label,
  current,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  current?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-sm)] border px-2 text-xs transition-colors",
        active
          ? "border-green/40 bg-green-dim font-semibold text-green"
          : "border-border bg-bg-card text-text-secondary hover:bg-bg-card-hover hover:text-text-primary",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg-card",
      )}
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
