export function RankingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 rounded-3xl bg-panel2/50 animate-pulse" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-panel2/40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-panel2/40 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-panel2/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
