"use client";

import { RouteErrorCard } from "@/components/dashboard/shell/route-states";

/** Per-section error boundary for `/demo/*` — keeps the shell up around a broken view. */
export default function DemoError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorCard {...props} escapeHref="/demo" escapeLabel="Back to the demo" />;
}
