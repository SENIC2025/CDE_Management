/**
 * Skeleton loading placeholders replacing spinner animations.
 * Shows pulsing grey blocks that hint at the content shape.
 */

function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
  );
}

/** Page-level skeleton: header + stats row + content area */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-72" />
        </div>
      </div>
      <Bone className="h-0.5 w-full" />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
            <Bone className="h-3 w-20 mb-3" />
            <Bone className="h-8 w-16 mb-2" />
            <Bone className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bone className="w-6 h-6 rounded" />
              <Bone className="h-4 w-32" />
            </div>
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table skeleton: header row + body rows */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex gap-4">
        {[...Array(cols)].map((_, i) => (
          <Bone key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-5 py-4 border-b border-slate-100 flex gap-4">
          {[...Array(cols)].map((_, j) => (
            <Bone key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Dashboard skeleton: hero + grid */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Bone className="h-48 w-full rounded-xl" />
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <Bone className="h-3 w-16 mb-2" />
            <Bone className="h-7 w-10" />
          </div>
        ))}
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Bone className="h-64 rounded-xl" />
        <Bone className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

/** Simple inline loader for small sections */
export function InlineSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {[...Array(lines)].map((_, i) => (
        <Bone key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export { Bone };
