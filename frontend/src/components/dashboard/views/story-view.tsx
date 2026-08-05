"use client";

import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { SideNav } from "@/components/layout/side-nav";
import { useDashboardContext } from "@/components/dashboard/shell/dashboard-context";

/**
 * The original single-scroll dashboard, preserved as its own route.
 *
 * This is the only place `SideNav` still lives: the scroll-spy rail is meaningless on the
 * split routes, but it is exactly right for a 25-section narrative whose anchors it
 * already knows. Data comes from the shell's context — no second fetch.
 */
export function StoryView() {
  const { dashboard, refresh } = useDashboardContext();

  return (
    <>
      <SideNav />
      <DashboardContent data={dashboard} showSharePanel onUpdate={refresh} />
    </>
  );
}
