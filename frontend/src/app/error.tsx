"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-4">
        Something went wrong
      </h1>
      <p className="text-text-secondary mb-8">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
        >
          Try Again
        </button>
        <a
          href="/"
          className="border border-border hover:border-text-muted text-text-secondary hover:text-text-primary px-8 py-3 rounded-full transition-all"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}
