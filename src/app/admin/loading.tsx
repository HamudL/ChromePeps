import { Skeleton } from "@/components/ui/skeleton";

/**
 * Admin segment loading state. Matches the dashboard's stat-card layout
 * so navigating between admin pages feels instant rather than janky.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="rounded-lg border p-6 lg:col-span-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-6 h-[280px] w-full" />
        </div>
        <div className="rounded-lg border p-6 lg:col-span-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-52" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border p-6">
        <Skeleton className="h-5 w-40" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
