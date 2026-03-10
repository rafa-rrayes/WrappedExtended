"use client";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function Toasts({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-[var(--radius-sm)] text-sm font-medium backdrop-blur-xl border animate-[fadeUp_0.3s_ease_forwards] ${
            t.type === "success"
              ? "bg-green/20 border-green/30 text-green"
              : t.type === "error"
                ? "bg-red-500/20 border-red-500/30 text-red-400"
                : "bg-bg-card/80 border-border text-text-secondary"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
