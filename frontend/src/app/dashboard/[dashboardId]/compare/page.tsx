import { Suspense } from "react";
import { ComparePage } from "@/components/dashboard/compare/compare-page";
import { CompareSkeleton } from "@/components/dashboard/compare/compare-states";
import { ViewPage } from "@/components/dashboard/views/view-shell";

/**
 * `/dashboard/[dashboardId]/compare`
 *
 * Auth, the sidebar, the top bar and the dashboard payload all come from the layout's
 * shell — this route only owns the comparison itself. The Suspense boundary is here
 * because the page reads its two periods from `useSearchParams`, which Next refuses to
 * prerender without one.
 */
export default function Page() {
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
}
