"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadId = searchParams.get("upload_id");
  const [countdown, setCountdown] = useState(3);

  const redirect = useCallback(() => {
    if (uploadId) {
      router.push(`/processing/${uploadId}`);
    } else {
      router.push("/dashboards");
    }
  }, [uploadId, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          redirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [redirect]);

  // Confetti effect
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("canvas-confetti").then((mod) => {
      const confetti = mod.default;
      const duration = 2000;
      const end = Date.now() + duration;

      function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#1DB954", "#F5A623", "#ffffff"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#1DB954", "#F5A623", "#ffffff"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }

      frame();
      cleanup = () => confetti.reset();
    });
    return () => cleanup?.();
  }, []);

  return (
    <main className="min-h-screen pt-14 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Animated checkmark */}
        <div className="w-20 h-20 rounded-full bg-green/20 flex items-center justify-center mx-auto mb-6 animate-[scaleIn_0.5s_ease_forwards]">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-green animate-[drawCheck_0.4s_ease_forwards_0.3s]"
            style={{ strokeDasharray: 30, strokeDashoffset: 30 }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-3">
          Payment Successful!
        </h1>
        <p className="text-text-secondary mb-8">
          Your dashboard is being generated. You&apos;ll be redirected in{" "}
          {countdown} second{countdown !== 1 ? "s" : ""}...
        </p>

        <button
          onClick={redirect}
          className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
        >
          View Progress
        </button>

        {!uploadId && (
          <p className="text-xs text-text-muted mt-6">
            <Link href="/dashboards" className="hover:text-text-secondary transition-colors underline">
              Go to My Dashboards
            </Link>
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes drawCheck {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-14 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-green/20 border-t-green animate-spin" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
