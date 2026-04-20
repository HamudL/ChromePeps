"use client";

/**
 * Produkt-Filter-UI — Apotheke/Rx-Stil
 *
 * Alles URL-driven (Query-Params), damit Pagination, Bookmarks und
 * Server-Rendering kompatibel bleiben. Keine Store-Abhängigkeit.
 *
 * - CategoryPills: Pills mit inline-Count, führt auf /products/category/slug
 * - SortSelect: Mono-Dropdown "Sortieren: Neueste ⇵"
 * - QuickFilterChip: Toggle-Chip für Boolean-URL-Filter (inStock etc.)
 * - FilterBar: Sticky Container, kombiniert alle drei
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

const chipBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[11px] tracking-[0.05em] font-medium transition-colors";
const chipInactive =
  "border-border bg-card text-foreground hover:border-primary";
const chipActive =
  "border-foreground bg-foreground text-background hover:bg-foreground/90";

function countTint(isActive: boolean) {
  return cn(
    "text-[10.5px] tabular-nums",
    isActive ? "text-background/60" : "text-muted-foreground"
  );
}

/**
 * Kategorie-Pills mit Count-Badge. "Alle" verlinkt auf `/products`,
 * einzelne Kategorien auf `/products/category/{slug}`. Der aktive
 * Zustand wird anhand der übergebenen `currentCategory` (Slug oder
 * undefined = Alle) gesetzt.
 */
export function CategoryPills({
  categories,
  currentCategory,
  totalCount,
}: {
  categories: Category[];
  currentCategory?: string;
  totalCount?: number;
}) {
  const isAllActive = !currentCategory;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
      <Link
        href="/products"
        className={cn(chipBase, isAllActive ? chipActive : chipInactive)}
      >
        Alle
        {typeof totalCount === "number" && (
          <span className={countTint(isAllActive)}>{totalCount}</span>
        )}
      </Link>
      {categories.map((cat) => {
        const isActive = currentCategory === cat.slug;
        return (
          <Link
            key={cat.id}
            href={`/products/category/${cat.slug}`}
            className={cn(chipBase, isActive ? chipActive : chipInactive)}
          >
            {cat.name}
            <span className={countTint(isActive)}>{cat._count.products}</span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Toggle-Chip für einen boolean URL-Query-Param (z.B. inStock=true oder
 * minPurity=99). Klick fügt den Param hinzu / entfernt ihn; resettet
 * Page-Counter auf 1. `onValue` kann statt "true" einen eigenen Wert
 * setzen (z.B. "99" bei minPurity).
 */
export function QuickFilterChip({
  param,
  onValue = "true",
  label,
  basePath = "/products",
}: {
  param: string;
  onValue?: string;
  label: string;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param);
  const isActive = current === onValue;

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) {
      params.delete(param);
    } else {
      params.set(param, onValue);
    }
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isActive}
      className={cn(chipBase, isActive ? chipActive : chipInactive)}
    >
      {label}
    </button>
  );
}

/**
 * Sort-Dropdown — Mono-Optik, keine sichtbare Border im Ruhezustand,
 * passt in die rechte Ecke der Filter-Bar. Liest/schreibt `sort` im
 * URL-Query-Param; resettet page auf 1.
 */
export function SortSelect({
  basePath = "/products",
}: {
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") ?? "newest";

  const updateSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "newest") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    params.set("page", "1");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  const SORT_LABELS: Record<string, string> = {
    newest: "Neueste",
    price_asc: "Preis \u2197",
    price_desc: "Preis \u2198",
    name_asc: "Name A\u2013Z",
    name_desc: "Name Z\u2013A",
  };

  return (
    <Select value={currentSort} onValueChange={updateSort}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto gap-2 border-transparent bg-transparent px-2 font-mono text-[11px] tracking-[0.05em]",
          "text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0",
          "[&>svg]:hidden" // Standard-Chevron ersetzen wir unten durch ChevronsUpDown
        )}
      >
        <span className="text-muted-foreground">Sortieren:</span>
        <SelectValue />
        <ChevronsUpDown className="h-3 w-3 opacity-60" aria-hidden />
      </SelectTrigger>
      <SelectContent>
        {PRODUCT_SORT_OPTIONS.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="font-mono text-xs"
          >
            {SORT_LABELS[opt.value] ?? opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Legacy-Wrapper — einige ältere Seiten importieren <ProductFilters />.
 * Bleibt für Abwärtskompatibilität; der neue Shop-Bereich bindet
 * CategoryPills + SortSelect direkt in der FilterBar ein.
 */
export function ProductFilters({ categories }: { categories: Category[] }) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") ?? undefined;

  return (
    <div className="flex flex-col gap-4">
      <CategoryPills
        categories={categories}
        currentCategory={currentCategory}
      />
      <SortSelect />
    </div>
  );
}
