export default function DashboardsLoading() {
  return (
    <main className="min-h-screen pt-14">
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="h-10 w-48 bg-bg-card rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-[var(--radius-card)] p-6 animate-pulse h-48"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
