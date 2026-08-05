import { Suspense } from "react";
import { ComparePage } from "@/components/dashboard/compare/compare-page";
import { CompareSkeleton } from "@/components/dashboard/compare/compare-states";

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
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-5 sm:py-8">
          <CompareSkeleton />
        </div>
      }
    >
      <ComparePage />
    </Suspense>
  );
}
