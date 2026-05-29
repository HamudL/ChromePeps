import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shop segment loading state — used while any server component inside the
 * `(shop)` route group streams in.
 *
 * Spiegelt jetzt die echte Rx-Produktkarte (rounded-sm, Mono-Kopfzeile,
 * zentriertes h-[200px]-Media, drei Spec-Rows, Preis-Zeile mit border-t)
 * sowie das echte Grid (1/2/3/4 Spalten ab base/sm/md/lg). Dadurch
 * entsteht beim Daten-Eintreffen kein sichtbarer Layout-Sprung mehr.
 */
export default function ShopLoading() {
  return (
    <div className="container py-10 md:py-14">
      {/* Meta-Row: Titel + Count */}
      <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-border pb-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Rx-Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-sm border border-border px-7 pt-8 pb-7"
          >
            {/* Kopfzeile: Kategorie + Index */}
            <div className="mb-6 flex items-center justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2.5 w-12" />
            </div>
            {/* Media */}
            <Skeleton className="mx-auto mb-6 h-[200px] w-full max-w-[252px] rounded-sm" />
            {/* Name */}
            <Skeleton className="h-7 w-3/4" />
            {/* Spec-Rows */}
            <div className="mt-3 space-y-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            {/* Preis-Zeile */}
            <div className="mt-5 border-t border-border pt-5">
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
