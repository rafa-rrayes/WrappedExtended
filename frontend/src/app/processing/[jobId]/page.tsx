"use client";

import { useParams, useRouter } from "next/navigation";
import { useUploadStatus } from "@/lib/hooks/use-upload-status";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function ProcessingPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const { data, error } = useUploadStatus(params.jobId);

  if (data?.status === "completed" && data.dashboard_id) {
    router.push(`/dashboard/${data.dashboard_id}`);
  }

  const isPendingPayment = data?.status === "pending_payment";
  const isFailed = data?.status === "failed";
  const title = isFailed
    ? "Processing Failed"
    : isPendingPayment
      ? "Confirming Payment..."
      : "Processing Your History";

  return (
    <AuthGuard>
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
            {title}
          </h1>

          {error && (
            <p className="text-red-400 mb-4">
              Failed to check status. Please refresh.
            </p>
          )}

          {isFailed ? (
            <div>
              <p className="text-text-secondary mb-4">
                {data.error_message || "An unexpected error occurred."}
              </p>
              <button
                onClick={() => router.push("/upload")}
                className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
              >
                Try Again
              </button>
            </div>
          ) : isPendingPayment ? (
            <div>
              <p className="text-text-secondary mb-4">
                Your payment is being confirmed. This usually takes a few seconds...
              </p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-text-secondary mb-8">
                Crunching {data?.status === "validating" ? "and validating" : ""} your streaming data...
              </p>

              {/* Progress bar */}
              <div className="w-full bg-bg-card border border-border rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-green rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${data?.progress_pct ?? 0}%` }}
                />
              </div>
              <p className="text-text-muted text-sm mt-2">
                {data?.progress_pct ?? 0}% complete
              </p>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
