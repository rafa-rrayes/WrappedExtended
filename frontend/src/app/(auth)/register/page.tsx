"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.register(username, email, password);
      router.push("/login");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-2">
          Create account
        </h1>
        <p className="text-text-secondary mb-8">
          Sign up to start analyzing your listening history.
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
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green transition-colors"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full bg-bg-card border border-border rounded-[var(--radius-sm)] px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-green transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green hover:bg-green/90 text-bg-deep font-semibold py-3 rounded-[var(--radius-sm)] transition-all disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-text-muted text-sm mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
