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
 * Sticky Filter-Bar für Shop-Listing und Kategorie-Landingpages im
 * Apotheke-Stil. Server-Wrapper, der die Client-Pills + QuickFilter +
 * Sort zusammenhält und den gemeinsamen Container-Frame (Sticky, Blur,
 * Border-Bottom) liefert.
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
      <div className="container">
        <div className="flex items-center gap-4 overflow-x-auto py-3.5 scrollbar-none">
          <CategoryPills
            categories={categories}
            currentCategory={currentCategory}
            totalCount={totalCount}
          />

          {/* Trennlinie zwischen Kategorie-Pills und Quick-Filtern */}
          <span
            aria-hidden
            className="h-5 w-px shrink-0 bg-border"
          />

          <div className="flex items-center gap-2 shrink-0">
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
