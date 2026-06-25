function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-stroke bg-panel2/40 ${className}`}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent animate-shimmer" />
    </div>
  );
}

export function RankingSkeleton() {
  return (
    <div className="space-y-5">
      {/* hero */}
      <Shimmer className="h-28 rounded-3xl" />
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-24" />
        ))}
      </div>
      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Shimmer key={i} className="h-64" />
        ))}
      </div>
      {/* table */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
