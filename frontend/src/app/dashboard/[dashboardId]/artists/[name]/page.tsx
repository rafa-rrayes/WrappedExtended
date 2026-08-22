"use client";

import { useParams } from "next/navigation";
import { EntityDetailPage } from "@/components/dashboard/library/entity-detail-page";

export default function ArtistDetailRoute() {
  const { name } = useParams<{ name: string }>();
  return <EntityDetailPage type="artist" name={name} />;
}
