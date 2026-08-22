import { describe, expect, it } from "vitest";
import { DASHBOARD_NAV, isNavActive, navHref } from "./nav-routes";

/**
 * The same nav renders under three shells — `/dashboard/{id}`, `/shared/{slug}` and
 * `/demo` — so every href has to be built from the shell's base path, and the active
 * test has to work against each base without one prefix shadowing another.
 */

const BASES = ["/dashboard/abc-123", "/shared/my-slug", "/demo"];

describe("navHref", () => {
  it("appends the segment to whichever base the shell is rendering under", () => {
    for (const base of BASES) {
      expect(navHref(base, "")).toBe(base);
      expect(navHref(base, "/artists")).toBe(`${base}/artists`);
      expect(navHref(base, "/insights")).toBe(`${base}/insights`);
    }
  });

  it("covers every nav item without a double slash", () => {
    for (const base of BASES) {
      for (const item of DASHBOARD_NAV) {
        expect(navHref(base, item.segment)).not.toMatch(/\/\//);
      }
    }
  });
});

describe("isNavActive", () => {
  it("matches the overview only exactly (with or without a trailing slash)", () => {
    for (const base of BASES) {
      expect(isNavActive(base, base, "")).toBe(true);
      expect(isNavActive(`${base}/`, base, "")).toBe(true);
      expect(isNavActive(`${base}/story`, base, "")).toBe(false);
    }
  });

  it("matches a section and everything beneath it", () => {
    for (const base of BASES) {
      expect(isNavActive(`${base}/artists`, base, "/artists")).toBe(true);
      expect(isNavActive(`${base}/artists/Radiohead`, base, "/artists")).toBe(true);
      expect(isNavActive(`${base}/tracks`, base, "/artists")).toBe(false);
    }
  });

  it("does not let a segment that merely shares a prefix light up", () => {
    expect(isNavActive("/demo/artists-of-note", "/demo", "/artists")).toBe(false);
    // `/demo` is a prefix of `/demonstration`, but not its base.
    expect(isNavActive("/demonstration/artists", "/demo", "/artists")).toBe(false);
  });

  it("keeps the owner and public trees apart", () => {
    expect(isNavActive("/shared/my-slug/time", "/dashboard/abc-123", "/time")).toBe(false);
    expect(isNavActive("/dashboard/abc-123/time", "/shared/my-slug", "/time")).toBe(false);
  });
});
