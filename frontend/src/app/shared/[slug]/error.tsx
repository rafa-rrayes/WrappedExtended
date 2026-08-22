"use client";

import { useParams } from "next/navigation";
import { RouteErrorCard } from "@/components/dashboard/shell/route-states";

/** Per-section error boundary for `/shared/[slug]/*` — keeps the shell up around a broken view. */
export default function SharedDashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { slug } = useParams<{ slug?: string }>();
  return (
    <RouteErrorCard
      {...props}
      escapeHref={slug ? `/shared/${slug}` : "/"}
      escapeLabel={slug ? "Back to overview" : "Go home"}
    />
  );
}
