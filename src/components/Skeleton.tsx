// Reusable loading skeletons for route-level loading.tsx files. Pure
// presentational; uses Tailwind's animate-pulse (respects reduced motion via the
// browser). `wide` switches to the admin-width container.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/10 ${className}`} />;
}

function Shell({
  wide,
  children,
}: {
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      className={`mx-auto ${wide ? "max-w-6xl" : "max-w-2xl"} space-y-6 p-6`}
      aria-busy="true"
      aria-label="Loading"
    >
      {children}
    </main>
  );
}

function SkeletonCard() {
  return (
    <div className="surface-card space-y-3">
      <Bar className="h-5 w-1/3" />
      <Bar className="h-4 w-full" />
      <Bar className="h-4 w-2/3" />
    </div>
  );
}

export function ListPage({ wide = false, rows = 4 }: { wide?: boolean; rows?: number }) {
  return (
    <Shell wide={wide}>
      <Bar className="h-8 w-44" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="surface-card flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Bar className="h-4 w-1/2" />
              <Bar className="h-3 w-1/3" />
            </div>
            <Bar className="h-8 w-20" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function DetailPage({ wide = false }: { wide?: boolean }) {
  return (
    <Shell wide={wide}>
      <Bar className="h-8 w-40" />
      <Bar className="h-6 w-28 rounded-full" />
      <SkeletonCard />
      <SkeletonCard />
      <Bar className="h-11 w-full" />
    </Shell>
  );
}

export function FormPage({ wide = false }: { wide?: boolean }) {
  return (
    <Shell wide={wide}>
      <Bar className="h-8 w-40" />
      <div className="surface-card space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Bar className="h-4 w-24" />
            <Bar className="h-11 w-full" />
          </div>
        ))}
        <Bar className="h-11 w-full" />
      </div>
    </Shell>
  );
}

export function DashboardPage({ wide = true }: { wide?: boolean }) {
  return (
    <Shell wide={wide}>
      <Bar className="h-9 w-60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card space-y-2 p-5">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-16" />
            <Bar className="h-3 w-24" />
          </div>
        ))}
      </div>
      <TableBlock />
    </Shell>
  );
}

function TableBlock() {
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="border-b border-white/10 bg-white/[0.02] p-4">
        <Bar className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Bar className="h-4 w-1/4" />
            <Bar className="h-4 w-1/4" />
            <Bar className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TablePage({ wide = true }: { wide?: boolean }) {
  return (
    <Shell wide={wide}>
      <Bar className="h-8 w-48" />
      <TableBlock />
    </Shell>
  );
}
