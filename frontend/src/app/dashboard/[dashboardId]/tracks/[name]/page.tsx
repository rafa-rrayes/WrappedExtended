"use client";

import { useParams } from "next/navigation";
import { EntityDetailPage } from "@/components/dashboard/library/entity-detail-page";

export default function TrackDetailRoute() {
  const { name } = useParams<{ name: string }>();
  return <EntityDetailPage type="track" name={name} />;
}
