"use client";

import useSWR from "swr";
import type { EntityListResponse, EntityType } from "@/types/dashboard";
import { ApiError, apiClient } from "@/lib/api-client";
import { useDateRange, useRangeHref } from "@/lib/hooks/use-date-range";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { ENTITY_META } from "./entity-meta";
import { EntityPagination } from "./entity-pagination";
import { EntityTable, EntityTableSkeleton } from "./entity-table";
import { EntityTableToolbar } from "./entity-table-toolbar";
import { LibraryEmpty, LibraryError, LibraryOutOfRange } from "./library-states";
import { PAGE_SIZE, useLibraryParams } from "./use-library-params";

/**
 * The browsable catalogue behind `/artists`, `/tracks` and `/albums`.
 *
 * Everything the user can change — search, sort, page — lives in the URL, and everything
 * the server needs is derived from it, so the SWR key *is* the view. `keepPreviousData`
 * means paging swaps rows in place instead of blanking the table on every click.
 */
export function LibraryPage({ type }: { type: EntityType }) {
  const { dashboardId, bounds } = useDashboardContext();
  const { from, to, isFiltered } = useDateRange(bounds);
  const withRange = useRangeHref();
  const { q, sort, order, page, setQuery, toggleSort, setPage, clearSearch } =
    useLibraryParams();

  const meta = ENTITY_META[type];

  const { data, error, isLoading, isValidating, mutate } = useSWR<EntityListResponse>(
    ["entities", dashboardId, type, q, sort, order, page, from, to],
    () =>
      apiClient.getEntities(dashboardId, {
        type,
        q: q || undefined,
        sort,
        order,
        page,
        page_size: PAGE_SIZE,
        from,
        to,
      }),
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  // With `keepPreviousData` the previous page stays on screen during a refetch, so the
  // skeleton is only for the very first load; later fetches just dim what is already there.
  const showSkeleton = isLoading && !data;
  const stale = isValidating && Boolean(data);

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-text-primary sm:text-3xl">
          {meta.title}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every {meta.singular} in your listening history
          {isFiltered ? ", within the selected dates" : ""}.
        </p>
      </header>

      <EntityTableToolbar
        type={type}
        query={q}
        onQueryChange={setQuery}
        sort={sort}
        order={order}
        onSortChange={toggleSort}
        count={error ? undefined : data?.count}
        busy={stale}
      />

      {error ? (
        <LibraryError
          message={error instanceof ApiError ? error.message : undefined}
          onRetry={() => void mutate()}
        />
      ) : showSkeleton ? (
        <EntityTableSkeleton type={type} />
      ) : data && data.results.length > 0 ? (
        <>
          <EntityTable
            type={type}
            dashboardId={dashboardId}
            rows={data.results}
            sort={sort}
            order={order}
            onSortChange={toggleSort}
            withRange={withRange}
            stale={stale}
          />
          <EntityPagination
            page={data.page}
            pageSize={data.page_size || PAGE_SIZE}
            count={data.count}
            onPageChange={setPage}
            disabled={stale}
          />
        </>
      ) : data && data.count > 0 ? (
        <LibraryOutOfRange plural={meta.plural} onReset={() => setPage(1)} />
      ) : (
        <LibraryEmpty
          query={q}
          plural={meta.plural}
          isFiltered={isFiltered}
          onClearSearch={clearSearch}
        />
      )}
    </main>
  );
}
