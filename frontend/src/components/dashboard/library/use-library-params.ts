"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EntitySort, SortOrder } from "@/types/dashboard";

/**
 * Search / sort / page state for a library route, canonical in the URL.
 *
 * Same contract and same discipline as `use-date-range`: `?q=&sort=&order=&page=` is the
 * only source of truth, so a view is linkable and the back button walks through searches
 * and pages instead of jumping straight out of the route. Writes go through
 * `router.replace` with `scroll: false` — replacing keeps history readable while a user
 * types, and suppressing scroll restoration stops the table jumping under the cursor.
 *
 * Params at their default value are removed rather than written, so the common case stays
 * a clean `/dashboard/{id}/artists`, and `?from&to` (owned by `use-date-range`) is copied
 * through untouched on every write.
 */

export const DEFAULT_SORT: EntitySort = "hours";
export const DEFAULT_ORDER: SortOrder = "desc";
export const PAGE_SIZE = 50;

const SORTS: readonly EntitySort[] = ["hours", "plays", "name", "first", "last"];

/**
 * Which direction a column should take on its *first* click.
 * Biggest-first for magnitudes, A-Z for names, oldest-first for "first listened".
 */
const NATURAL_ORDER: Record<EntitySort, SortOrder> = {
  hours: "desc",
  plays: "desc",
  name: "asc",
  first: "asc",
  last: "desc",
};

export interface LibraryParamsState {
  /** Trimmed search term; `""` when unfiltered. */
  q: string;
  sort: EntitySort;
  order: SortOrder;
  /** 1-based. */
  page: number;
  /** Commit a search term (already debounced by the caller). Resets to page 1. */
  setQuery: (q: string) => void;
  /** Sort by a column: flips direction when it is already the active one. */
  toggleSort: (sort: EntitySort) => void;
  setPage: (page: number) => void;
  clearSearch: () => void;
}

type WritableKey = "q" | "sort" | "order" | "page";

export function useLibraryParams(): LibraryParamsState {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawSort = searchParams.get("sort");
  const sort = SORTS.includes(rawSort as EntitySort) ? (rawSort as EntitySort) : DEFAULT_SORT;

  const rawOrder = searchParams.get("order");
  const order: SortOrder = rawOrder === "asc" || rawOrder === "desc" ? rawOrder : DEFAULT_ORDER;

  // A hand-edited `?page=abc` or `?page=-3` should degrade to page 1, not blow up.
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  const q = (searchParams.get("q") ?? "").trim();

  const write = useCallback(
    (next: Partial<Record<WritableKey, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setQuery = useCallback(
    (value: string) => {
      // A new search invalidates the old page number — page 7 of the previous result set
      // is very likely past the end of the new one.
      write({ q: value.trim() || null, page: null });
    },
    [write],
  );

  const clearSearch = useCallback(() => write({ q: null, page: null }), [write]);

  const toggleSort = useCallback(
    (nextSort: EntitySort) => {
      const nextOrder: SortOrder =
        nextSort === sort
          ? order === "asc"
            ? "desc"
            : "asc"
          : NATURAL_ORDER[nextSort];
      write({
        sort: nextSort === DEFAULT_SORT ? null : nextSort,
        order: nextOrder === DEFAULT_ORDER ? null : nextOrder,
        page: null,
      });
    },
    [order, sort, write],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.max(1, Math.floor(nextPage));
      write({ page: clamped === 1 ? null : String(clamped) });
    },
    [write],
  );

  return useMemo(
    () => ({ q, sort, order, page, setQuery, toggleSort, setPage, clearSearch }),
    [q, sort, order, page, setQuery, toggleSort, setPage, clearSearch],
  );
}
