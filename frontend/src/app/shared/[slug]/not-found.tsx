"use client";

import { useParams } from "next/navigation";
import { RouteNotFoundCard } from "@/components/dashboard/shell/route-states";

/** 404 inside a shared dashboard's shell — an unknown path or an entity not in the export. */
export default function SharedDashboardNotFound() {
  const { slug } = useParams<{ slug?: string }>();
  return (
    <RouteNotFoundCard
      escapeHref={slug ? `/shared/${slug}` : "/"}
      escapeLabel={slug ? "Back to overview" : "Go home"}
    />
  );
}
