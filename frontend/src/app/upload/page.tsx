"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { AuthGuard } from "@/components/auth/auth-guard";

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [hasPaid, setHasPaid] = useState(false);

  useEffect(() => {
    apiClient.getMe().then((profile) => setHasPaid(profile.has_paid)).catch(() => {});
  }, []);

  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      setError("Payment was cancelled. Please try again.");
    }
  }, [searchParams]);

  const acceptFile = useCallback((f: File) => {
    if (!f.name.endsWith(".zip")) {
      setError("Please upload the .zip file from your Spotify data export.");
      return;
    }
    setError("");
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) acceptFile(dropped);
    },
    [acceptFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) acceptFile(selected);
    },
    [acceptFile]
  );

  async function handleUpload() {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const result = await apiClient.uploadFile(file);
      if (result.checkout_url && !hasPaid) {
        // First-time payment — redirect to Stripe Checkout
        window.location.href = result.checkout_url;
      } else {
        // Already paid — go straight to processing
        router.push(`/processing/${result.id}`);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold mb-2">
          Upload Your Spotify Data
        </h1>
        <p className="text-text-secondary mb-8">
          Drop the <span className="text-text-primary font-medium">my_spotify_data.zip</span> file
          you downloaded from Spotify&apos;s privacy settings.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-[var(--radius-sm)] mb-4">
            {error}
          </div>
        )}

        {/* Dropzone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          className={`border-2 border-dashed rounded-[var(--radius-card)] p-16 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-green bg-green-dim"
              : "border-border hover:border-text-muted"
          }`}
        >
          <input
            type="file"
            accept=".zip"
            onChange={handleFileInput}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="text-4xl mb-4 opacity-50">&#8593;</div>
            <p className="text-text-secondary mb-1">
              Drag & drop your Spotify export here, or click to browse
            </p>
            <p className="text-text-muted text-sm">
              Accepts .zip files only
            </p>
          </label>
        </div>

        {/* Selected file */}
        {file && (
          <div className="mt-6 flex items-center justify-between bg-bg-card border border-border rounded-[var(--radius-sm)] px-4 py-3">
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-text-muted">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              className="text-text-muted hover:text-red-400 transition-colors text-sm"
            >
              Remove
            </button>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 w-full bg-green hover:bg-green/90 text-bg-deep font-semibold py-3 rounded-[var(--radius-sm)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? "Uploading..." : hasPaid ? "Upload" : "Upload & Pay $10"}
        </button>

        {/* Instructions */}
        <div className="mt-10 bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6">
          <h3 className="font-[family-name:var(--font-display)] font-bold text-sm mb-3 text-text-secondary">
            How to get your data
          </h3>
          <ol className="text-sm text-text-muted space-y-2 list-decimal list-inside">
            <li>Go to <span className="text-text-secondary">spotify.com/account/privacy</span></li>
            <li>Request your <span className="text-text-secondary">Extended streaming history</span></li>
            <li>Wait for Spotify&apos;s email (usually 5-30 days)</li>
            <li>Download the .zip and upload it here</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

export default function UploadPage() {
  return (
    <AuthGuard>
      <Suspense>
        <UploadContent />
      </Suspense>
    </AuthGuard>
  );
}
