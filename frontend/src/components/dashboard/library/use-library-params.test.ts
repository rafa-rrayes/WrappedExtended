// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@/test/render-hook";
import {
  DEFAULT_ORDER,
  DEFAULT_SORT,
  PAGE_SIZE,
  useLibraryParams,
} from "./use-library-params";

/**
 * The library routes keep search/sort/page in the URL so a view is linkable and the back
 * button walks through searches. That makes two things worth pinning: a hand-edited URL
 * must degrade to a sane default rather than throwing, and a param sitting at its default
 * must be *absent* — otherwise the common case is a URL full of `?sort=hours&order=desc`.
 */

const nav = vi.hoisted(() => ({
  search: "",
  pathname: "/dashboard/abc-123/artists",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  nav.search = "";
  nav.pathname = "/dashboard/abc-123/artists";
});

/** Render the hook against a given query string. */
function withUrl(search: string) {
  nav.search = search;
  return renderHook(() => useLibraryParams());
}

/** The URL passed to the most recent `router.replace`. */
function lastUrl(): string {
  const call = nav.replace.mock.calls.at(-1);
  if (!call) throw new Error("router.replace was never called");
  return call[0] as string;
}

/** The query params of the most recent `router.replace`, as a plain object. */
function lastParams(): Record<string, string> {
  const [, query = ""] = lastUrl().split("?");
  return Object.fromEntries(new URLSearchParams(query));
}

describe("useLibraryParams — reading", () => {
  it("exposes the documented defaults on a bare URL", () => {
    const { current } = withUrl("");

    expect(current.q).toBe("");
    expect(current.sort).toBe(DEFAULT_SORT);
    expect(current.order).toBe(DEFAULT_ORDER);
    expect(current.page).toBe(1);
  });

  it("has a stable, exported page size and default pair", () => {
    expect(PAGE_SIZE).toBe(50);
    expect(DEFAULT_SORT).toBe("hours");
    expect(DEFAULT_ORDER).toBe("desc");
  });

  it("reads valid params back out", () => {
    const { current } = withUrl("q=radiohead&sort=name&order=asc&page=3");

    expect(current).toMatchObject({ q: "radiohead", sort: "name", order: "asc", page: 3 });
  });

  it("accepts every sort the API supports", () => {
    for (const sort of ["hours", "plays", "name", "first", "last"]) {
      expect(withUrl(`sort=${sort}`).current.sort).toBe(sort);
    }
  });

  it("trims the search term", () => {
    expect(withUrl("q=%20%20radiohead%20%20").current.q).toBe("radiohead");
    expect(withUrl("q=%20%20").current.q).toBe("");
  });
});

describe("useLibraryParams — a hand-edited URL degrades instead of throwing", () => {
  it("falls back to the default sort for an unknown column", () => {
    expect(withUrl("sort=colour").current.sort).toBe(DEFAULT_SORT);
    expect(withUrl("sort=").current.sort).toBe(DEFAULT_SORT);
  });

  it("falls back to the default order for anything but asc/desc", () => {
    expect(withUrl("order=sideways").current.order).toBe(DEFAULT_ORDER);
    expect(withUrl("order=ASC").current.order).toBe(DEFAULT_ORDER);
  });

  it("clamps a nonsensical page to 1", () => {
    expect(withUrl("page=abc").current.page).toBe(1);
    expect(withUrl("page=-3").current.page).toBe(1);
    expect(withUrl("page=0").current.page).toBe(1);
    expect(withUrl("page=").current.page).toBe(1);
    expect(withUrl("page=1e999").current.page).toBe(1);
  });

  it("floors a fractional page rather than passing it to the API", () => {
    expect(withUrl("page=2.9").current.page).toBe(2);
  });
});

describe("useLibraryParams — writing", () => {
  it("replaces rather than pushes, and never scrolls", () => {
    withUrl("").current.setPage(2);

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace.mock.calls[0][1]).toEqual({ scroll: false });
  });

  it("omits every param sitting at its default, leaving a clean path", () => {
    // sort=hours + order=desc + page=1 are all defaults, so the URL should carry none.
    withUrl("sort=name&order=asc&page=4").current.toggleSort("hours");

    expect(lastUrl()).toBe("/dashboard/abc-123/artists");
    expect(lastUrl()).not.toContain("?");
  });

  it("drops the page param when returning to page 1", () => {
    withUrl("page=5").current.setPage(1);

    expect(lastUrl()).toBe("/dashboard/abc-123/artists");
  });

  it("writes a page beyond the first", () => {
    withUrl("").current.setPage(3);

    expect(lastParams()).toEqual({ page: "3" });
  });

  it("clamps a bad page on write too", () => {
    withUrl("page=5").current.setPage(-2);

    expect(lastUrl()).toBe("/dashboard/abc-123/artists");
  });

  it("resets to page 1 when the search term changes", () => {
    // Page 7 of the old result set is almost certainly past the end of the new one.
    withUrl("page=7").current.setQuery("  Fela Kuti  ");

    expect(lastParams()).toEqual({ q: "Fela Kuti" });
  });

  it("removes the search param when the term is cleared", () => {
    withUrl("q=fela&page=3").current.setQuery("   ");
    expect(lastUrl()).toBe("/dashboard/abc-123/artists");

    withUrl("q=fela&page=3").current.clearSearch();
    expect(lastUrl()).toBe("/dashboard/abc-123/artists");
  });
});

describe("useLibraryParams — toggleSort", () => {
  it("flips direction when the column is already active", () => {
    // hours/desc is the default pair, so only the flipped order survives into the URL.
    withUrl("").current.toggleSort("hours");
    expect(lastParams()).toEqual({ order: "asc" });

    withUrl("order=asc").current.toggleSort("hours");
    expect(lastUrl()).toBe("/dashboard/abc-123/artists");
  });

  it("uses each column's natural first-click direction when switching to it", () => {
    withUrl("").current.toggleSort("name");
    expect(lastParams()).toEqual({ sort: "name", order: "asc" });

    withUrl("").current.toggleSort("first");
    expect(lastParams()).toEqual({ sort: "first", order: "asc" });

    // Biggest-first for magnitudes and most-recent-first for "last listened" are the
    // defaults, so those write only the column.
    withUrl("sort=name").current.toggleSort("plays");
    expect(lastParams()).toEqual({ sort: "plays" });

    withUrl("sort=name").current.toggleSort("last");
    expect(lastParams()).toEqual({ sort: "last" });
  });

  it("returns to page 1 on any sort change", () => {
    withUrl("page=6").current.toggleSort("name");

    expect(lastParams()).toEqual({ sort: "name", order: "asc" });
  });
});

describe("useLibraryParams — coexisting with the date filter", () => {
  it("carries ?from and ?to through every write untouched", () => {
    withUrl("from=2021-01-01&to=2021-12-31&page=4").current.setQuery("radiohead");

    expect(lastParams()).toEqual({
      from: "2021-01-01",
      to: "2021-12-31",
      q: "radiohead",
    });
  });

  it("preserves an unrelated param it does not own", () => {
    withUrl("from=2021-01-01&tab=charts").current.toggleSort("name");

    expect(lastParams()).toMatchObject({ from: "2021-01-01", tab: "charts", sort: "name" });
  });

  it("keeps the current pathname, so a write never changes route", () => {
    nav.pathname = "/dashboard/abc-123/albums";
    withUrl("").current.setPage(2);

    expect(lastUrl().startsWith("/dashboard/abc-123/albums")).toBe(true);
  });
});
