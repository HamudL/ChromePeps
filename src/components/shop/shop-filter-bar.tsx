import {
  CategoryPills,
  QuickFilterChip,
  SortSelect,
} from "@/components/shop/product-filters";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

/**
 * Sticky Filter-Bar für Shop-Listing und Kategorie-Landingpages —
 * ruhige Werkzeugzeile im Protokoll-Stil. Server-Wrapper, der die
 * Client-Tags (CategoryPills) + QuickFilter + Sort zusammenhält und den
 * gemeinsamen Container-Frame (Sticky, Blur, Haarlinien) liefert.
 *
 * `basePath` entscheidet, wohin die Client-Filter (Quick, Sort)
 * Navigationen schreiben. Auf /products bleibt es "/products"; auf
 * einer Kategorie-Landingpage /products/category/peptide wird es
 * entsprechend übergeben, damit Filter innerhalb der Kategorie bleiben.
 */
export function ShopFilterBar({
  categories,
  currentCategory,
  totalCount,
  basePath = "/products",
}: {
  categories: Category[];
  currentCategory?: string;
  totalCount?: number;
  basePath?: string;
}) {
  return (
    <div className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Akzent-Haarlinie als oberer Abschluss — bindet die Werkzeugzeile
          an die Protokoll-Sprache, ohne den Sticky-Frame zu stören. */}
      <div aria-hidden className="rule-gold" />
      <div className="container">
        <div className="flex items-center gap-4 overflow-x-auto py-3 scrollbar-none">
          {/* Mono-Label als ruhiger Zeilenanfang — nur ab md, auf Mobile
              zählt jeder Pixel Scrollbreite. */}
          <span
            aria-hidden
            className="mono-tag hidden shrink-0 text-muted-foreground md:inline"
          >
            Filter
          </span>

          <CategoryPills
            categories={categories}
            currentCategory={currentCategory}
            totalCount={totalCount}
          />

          {/* Trennlinie zwischen Kategorie-Tags und Quick-Filtern */}
          <span aria-hidden className="h-5 w-px shrink-0 bg-border" />

          <div className="flex shrink-0 items-center gap-2">
            <QuickFilterChip
              param="inStock"
              label="Auf Lager"
              basePath={basePath}
            />
            <QuickFilterChip
              param="minPurity"
              onValue="99"
              label="Ab 99 % Reinheit"
              basePath={basePath}
            />
          </div>

          <div className="ml-auto shrink-0">
            <SortSelect basePath={basePath} />
          </div>
        </div>
      </div>
    </div>
  );
}
