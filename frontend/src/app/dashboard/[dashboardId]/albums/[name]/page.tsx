"use client";

import { useParams } from "next/navigation";
import { EntityDetailPage } from "@/components/dashboard/library/entity-detail-page";

export default function AlbumDetailRoute() {
  const { name } = useParams<{ name: string }>();
  return <EntityDetailPage type="album" name={name} />;
}
