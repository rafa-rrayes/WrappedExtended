"use client";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SideNav } from "@/components/layout/side-nav";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";
import { useDateRange } from "@/lib/hooks/use-date-range";
import { ScopeIgnoredNotice } from "./view-shell";

/**
 * The original single-scroll dashboard, preserved as its own route.
 *
 * This is the only place `SideNav` still lives: the scroll-spy rail is meaningless on the
 * split routes, but it is exactly right for a 25-section narrative whose anchors it
 * already knows. Data comes from the shell's context — no second fetch.
 */
export function StoryView() {
  const { dashboard, refresh } = useDashboardContext();
  // `DashboardContent` is shared with the public `/shared` and `/demo` routes, which have
  // no top bar and no `?from&to` — so the notice belongs here, not inside it.
  const { isFiltered } = useDateRange();

  return (
    <>
      <SideNav />
      {isFiltered && (
        <div className="mx-auto flex max-w-[1280px] justify-end px-6 pt-8">
          <ScopeIgnoredNotice
            isFiltered
            title="The story is written against your full export. Use the Time Machine toolbar further down to narrow it."
          >
            Date filter not applied
          </ScopeIgnoredNotice>
        </div>
      )}
      <DashboardContent data={dashboard} showSharePanel onUpdate={refresh} />
    </>
  );
}
