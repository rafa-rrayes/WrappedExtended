"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EntityListItem, EntitySort, EntityType, SortOrder } from "@/types/dashboard";
import { cn, formatNumber } from "@/lib/utils";
import { columnsFor, type EntityColumn } from "./entity-columns";
import { entityHref, formatDay, formatHoursCompact } from "./entity-meta";
import { SortArrow } from "./entity-table-toolbar";

interface EntityTableProps {
  type: EntityType;
  basePath: string;
  rows: EntityListItem[];
  sort: EntitySort;
  order: SortOrder;
  onSortChange: (sort: EntitySort) => void;
  /** Wraps an href with the active `?from&to` filter. */
  withRange: (href: string) => string;
  /** Dim the rows while a refetch is in flight over kept-alive data. */
  stale?: boolean;
}

export function EntityTable({
  type,
  basePath,
  rows,
  sort,
  order,
  onSortChange,
  withRange,
  stale,
}: EntityTableProps) {
  const columns = columnsFor(type);

  return (
    <div
      className={cn(
        "transition-opacity duration-200",
        stale && "pointer-events-none opacity-50",
      )}
    >
      {/* Desktop: a real table, scrolled horizontally if the viewport is tight. */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-border bg-bg-card md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <HeaderCell
                  key={column.key}
                  column={column}
                  sort={sort}
                  order={order}
                  onSortChange={onSortChange}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <EntityRow
                key={`${row.rank}-${row.name}-${row.artist_name ?? ""}`}
                row={row}
                columns={columns}
                basePath={basePath}
                type={type}
                withRange={withRange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same data as cards — a 7-column table is unreadable at 380px. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li key={`${row.rank}-${row.name}-${row.artist_name ?? ""}`}>
            <Link
              href={withRange(entityHref(basePath, type, row.name, row.artist_name))}
              className="block rounded-[var(--radius-card)] border border-border bg-bg-card p-3.5 transition-colors active:bg-bg-card-hover"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-7 shrink-0 text-right text-xs font-semibold tabular-nums text-text-muted">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">{row.name}</span>
                  {row.artist_name && (
                    <span className="block truncate text-xs text-text-secondary">
                      {row.artist_name}
                    </span>
                  )}
                  <span className="mt-1.5 block text-xs text-text-muted">
                    {formatDay(row.first_listen)} → {formatDay(row.last_listen)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-green">
                    {formatHoursCompact(row.hours)}
                  </span>
                  <span className="block text-xs tabular-nums text-text-muted">
                    {formatNumber(row.plays)} plays
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeaderCell({
  column,
  sort,
  order,
  onSortChange,
}: {
  column: EntityColumn;
  sort: EntitySort;
  order: SortOrder;
  onSortChange: (sort: EntitySort) => void;
}) {
  const active = column.sort !== undefined && column.sort === sort;

  return (
    <th
      scope="col"
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
        column.align === "right" ? "text-right" : "text-left",
        column.className,
      )}
    >
      {column.sort ? (
        <button
          type="button"
          onClick={() => onSortChange(column.sort as EntitySort)}
          className={cn(
            "inline-flex items-center gap-1.5 transition-colors hover:text-text-primary",
            column.align === "right" && "flex-row-reverse",
            active && "text-green",
          )}
        >
          <span>{column.label}</span>
          {active ? (
            <SortArrow order={order} />
          ) : (
            // A permanent placeholder keeps the header from shifting on hover/sort.
            <span className="inline-block w-3 opacity-0 transition-opacity group-hover:opacity-40">
              <SortArrow order="desc" />
            </span>
          )}
        </button>
      ) : (
        column.label
      )}
    </th>
  );
}

function EntityRow({
  row,
  columns,
  basePath,
  type,
  withRange,
}: {
  row: EntityListItem;
  columns: EntityColumn[];
  basePath: string;
  type: EntityType;
  withRange: (href: string) => string;
}) {
  const router = useRouter();
  const href = withRange(entityHref(basePath, type, row.name, row.artist_name));

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-bg-card-hover"
    >
      {columns.map((column) => (
        <td
          key={column.key}
          className={cn(
            "px-4 py-2.5",
            column.align === "right" ? "text-right" : "text-left",
            column.className,
          )}
        >
          {renderCell(column, row, href)}
        </td>
      ))}
    </tr>
  );
}

function renderCell(column: EntityColumn, row: EntityListItem, href: string) {
  switch (column.key) {
    case "rank":
      return <span className="text-xs font-semibold text-text-muted">{row.rank}</span>;
    case "name":
      // A real anchor, so the row is keyboard-reachable and middle-click still opens a tab.
      // The click is stopped from bubbling only to avoid the row handler pushing twice.
      return (
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-text-primary underline-offset-2 hover:text-green hover:underline"
        >
          {row.name}
        </Link>
      );
    case "artist":
      return <span className="text-text-secondary">{row.artist_name ?? "—"}</span>;
    case "hours":
      return <span className="font-semibold text-green">{formatHoursCompact(row.hours)}</span>;
    case "plays":
      return <span className="text-text-secondary">{formatNumber(row.plays)}</span>;
    case "first":
      return <span className="text-xs text-text-muted">{formatDay(row.first_listen)}</span>;
    case "last":
      return <span className="text-xs text-text-muted">{formatDay(row.last_listen)}</span>;
    default:
      return null;
  }
}

/** Placeholder rows that keep the table's shape while the first page loads. */
export function EntityTableSkeleton({ type, rows = 12 }: { type: EntityType; rows?: number }) {
  const columns = columnsFor(type);

  return (
    <div>
      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-border bg-bg-card md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted",
                    column.align === "right" ? "text-right" : "text-left",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border/60 last:border-0">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3", column.className)}>
                    <span
                      className={cn(
                        "block h-3 animate-pulse rounded bg-bg-elevated",
                        column.key === "rank" && "w-5",
                        column.key === "name" && "w-2/3",
                        column.key === "artist" && "w-1/2",
                        column.align === "right" && column.key !== "rank" && "ml-auto w-16",
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <li
            key={index}
            className="h-[86px] animate-pulse rounded-[var(--radius-card)] border border-border bg-bg-card"
          />
        ))}
      </ul>
    </div>
  );
}
