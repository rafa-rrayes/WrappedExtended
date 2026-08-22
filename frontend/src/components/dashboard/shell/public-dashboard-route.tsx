"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { notFound, useParams } from "next/navigation";
import type { EntityType } from "@/types/dashboard";
import { OverviewView } from "../views/overview-view";
import { ViewPage } from "../views/view-shell";
import { CompareSkeleton } from "../compare/compare-states";

const LIBRARY_SEGMENTS: Record<string, EntityType> = {
  artists: "artist",
  tracks: "track",
  albums: "album",
};

/**
 * Every view but the Overview loads on demand. The owner's route tree gets this for free
 * (one page file per route → one chunk per route); here the whole app hangs off a single
 * catch-all page, and importing all the views statically would ship the 25-section story
 * scroll to someone who only opened `/demo`. The `loading` fallback keeps the suspend
 * local — without one, React would climb to the layout's boundary and flash the whole
 * shell skeleton on every tab switch.
 */
function ViewLoading() {
  return (
    <ViewPage>
      <div
        className="h-72 animate-pulse rounded-[var(--radius-card)] bg-white/[0.05]"
        role="status"
        aria-label="Loading view"
      />
    </ViewPage>
  );
}

const StoryView = dynamic(() => import("../views/story-view").then((m) => m.StoryView), {
  loading: ViewLoading,
});
const TimeView = dynamic(() => import("../views/time-view").then((m) => m.TimeView), {
  loading: ViewLoading,
});
const HabitsView = dynamic(() => import("../views/habits-view").then((m) => m.HabitsView), {
  loading: ViewLoading,
});
const DiscoveryView = dynamic(
  () => import("../views/discovery-view").then((m) => m.DiscoveryView),
  { loading: ViewLoading },
);
const LabView = dynamic(() => import("../views/lab-view").then((m) => m.LabView), {
  loading: ViewLoading,
});
const InsightsPage = dynamic(
  () => import("../insights/insights-page").then((m) => m.InsightsPage),
  { loading: ViewLoading },
);
const ComparePage = dynamic(() => import("../compare/compare-page").then((m) => m.ComparePage), {
  loading: ViewLoading,
});
const LibraryPage = dynamic(() => import("../library/library-page").then((m) => m.LibraryPage), {
  loading: ViewLoading,
});
const EntityDetailPage = dynamic(
  () => import("../library/entity-detail-page").then((m) => m.EntityDetailPage),
  { loading: ViewLoading },
);

/**
 * Maps the public shells' optional catch-all (`/demo/[[...path]]`,
 * `/shared/[slug]/[[...path]]`) onto the same views the owner's route tree renders one file
 * at a time — so a public dashboard has every tab the private one has, from one place.
 *
 *   (none)                      → Overview
 *   story · time · habits · discovery · lab · compare · insights
 *   artists|tracks|albums       → the library
 *   artists|tracks|albums/:name → the entity detail page
 *
 * Anything else is `notFound()`, which renders the segment's `not-found.tsx` inside the
 * shell — same as a stale entity link on the owner's side.
 */
export function PublicDashboardRoute() {
  const { path = [] } = useParams<{ path?: string[] }>();
  const [head, name, ...rest] = path;
  if (rest.length > 0) notFound();

  const libraryType = head === undefined ? undefined : LIBRARY_SEGMENTS[head];
  if (libraryType) {
    return name === undefined ? (
      <LibraryPage type={libraryType} />
    ) : (
      <EntityDetailPage type={libraryType} name={name} />
    );
  }
  if (name !== undefined) notFound();

  switch (head) {
    case undefined:
      return <OverviewView />;
    case "story":
      return <StoryView />;
    case "time":
      return <TimeView />;
    case "habits":
      return <HabitsView />;
    case "discovery":
      return <DiscoveryView />;
    case "lab":
      return <LabView />;
    case "insights":
      return <InsightsPage />;
    case "compare":
      // Same boundary as the owner's compare route: the page reads its two periods from
      // `useSearchParams`, which Next refuses to prerender without one.
      return (
        <Suspense
          fallback={
            <ViewPage>
              <CompareSkeleton />
            </ViewPage>
          }
        >
          <ComparePage />
        </Suspense>
      );
    default:
      notFound();
  }
}
