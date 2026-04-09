import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shop segment loading state — used while any server component inside
 * the `(shop)` route group streams in. Mirrors the rough shape of the
 * product catalog so the layout doesn't jump when data arrives.
 */
export default function ShopLoading() {
  return (
    <div className="container py-8">
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Filters row */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-0">
            <Skeleton className="aspect-square w-full rounded-t-lg rounded-b-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
