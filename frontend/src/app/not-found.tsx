import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
      <h1
        className="font-[family-name:var(--font-display)] text-[8rem] font-extrabold leading-none text-green/20 mb-4"
        style={{ textShadow: "0 0 80px rgba(29, 185, 84, 0.3)" }}
      >
        404
      </h1>
      <p className="text-text-secondary mb-8 text-lg">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="bg-green hover:bg-green/90 text-bg-deep font-semibold px-8 py-3 rounded-full transition-all"
      >
        Go Home
      </Link>
    </main>
  );
}
