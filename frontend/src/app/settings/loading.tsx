export default function SettingsLoading() {
  return (
    <main className="min-h-screen pt-14">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="h-10 w-32 bg-bg-card rounded animate-pulse mb-8" />
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-bg-card/60 border border-border rounded-[var(--radius-card)] p-6 animate-pulse h-48"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
