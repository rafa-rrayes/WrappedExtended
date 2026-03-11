"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import type { DashboardDetail } from "@/types/dashboard";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default function SharedDashboardPage() {
  const params = useParams<{ slug: string }>();
  const { data, error, isLoading } = useSWR<DashboardDetail>(
    params.slug ? `/shared/${params.slug}` : null,
    () => apiClient.getPublicDashboard(params.slug),
  );

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-text-muted animate-pulse">
          Loading shared dashboard...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-14">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
            Dashboard Not Found
          </h1>
          <p className="text-text-secondary mb-6">
            This dashboard doesn&apos;t exist or isn&apos;t public.
          </p>
          <Link href="/" className="text-green hover:underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Shared badge */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40">
        <span className="bg-green/20 text-green text-xs font-medium px-4 py-1.5 rounded-full border border-green/30">
          Shared Dashboard
        </span>
      </div>

      <DashboardContent data={data} />

      {/* CTA */}
      <div className="max-w-[1280px] mx-auto px-6 pb-20">
        <div className="mt-12 text-center py-12 border-t border-border">
          <p className="text-text-secondary mb-4">
            Want to analyze your own Spotify history?
          </p>
          <Link
            href="/"
            className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
          >
            Create Your Own Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
