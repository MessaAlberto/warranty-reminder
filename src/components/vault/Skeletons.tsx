function Bar({ className }: { className: string }) {
  return (
    <span className={`skeleton block rounded-full ${className}`}>
      <span className="skeleton-sheen" />
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-4 ring-1 ring-border" aria-hidden>
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2">
          <Bar className="h-4 w-2/3" />
          <Bar className="h-3 w-1/2" />
        </div>
        <Bar className="h-5 w-20 shrink-0 rounded-full" />
      </div>
      <Bar className="mt-4 h-3 w-4/5" />
      <Bar className="mt-3 h-1 w-full" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Caricamento garanzie">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-3 px-5" role="status" aria-label="Caricamento dettagli">
      <div className="glass rounded-2xl p-5 ring-1 ring-border">
        <Bar className="h-5 w-3/4" />
        <Bar className="mt-3 h-3 w-1/2" />
        <Bar className="mt-5 h-1 w-full" />
      </div>
      <div className="glass space-y-3 rounded-2xl p-5 ring-1 ring-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonImage() {
  return (
    <div className="skeleton aspect-[3/5] w-full rounded-2xl" aria-hidden>
      <span className="skeleton-sheen" />
    </div>
  );
}
