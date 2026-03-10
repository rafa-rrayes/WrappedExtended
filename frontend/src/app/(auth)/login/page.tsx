"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/upload";
  const { login, isAuthenticated, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirect);
    }
  }, [isLoading, isAuthenticated, router, redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push(redirect);
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-2">
          Welcome back
        </h1>
        <p className="text-text-secondary mb-8">
          Sign in to access your dashboards.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-[var(--radius-sm)]">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green hover:bg-green/90 text-bg-deep font-semibold py-3 rounded-[var(--radius-sm)] transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-text-muted text-sm mt-6 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-green hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
