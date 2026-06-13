"use client";

/**
 * Produkt-Filter-UI — Chromatogramm-Stil (eckige Specimen-Tags)
 *
 * Alles URL-driven (Query-Params), damit Pagination, Bookmarks und
 * Server-Rendering kompatibel bleiben. Keine Store-Abhängigkeit.
 *
 * - CategoryPills: eckige Tags mit inline-Count, führt auf /products/category/slug
 * - SortSelect: Mono-Dropdown "Sortierung: Neueste ⇵"
 * - QuickFilterChip: Toggle-Tag für Boolean-URL-Filter (inStock etc.)
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

// Eckiges Filter-Tag — identische Sprache wie .pill (globals.css),
// hier als Tailwind-Komposition, damit aktive/inaktive Zustände über
// cn() kombinierbar bleiben.
const chipBase =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] font-medium transition-colors";
const chipInactive =
  "border-border bg-card text-foreground hover:border-foreground";
const chipActive =
  "border-primary bg-accent text-primary-strong";

function countTint(isActive: boolean) {
  return cn(
    "text-[10px] tabular-nums",
    isActive ? "text-primary-strong/60" : "text-muted-foreground"
  );
}

/**
 * Kategorie-Tags mit Count. "Alle" verlinkt auf `/products`,
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
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-fade">
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
 * Toggle-Tag für einen boolean URL-Query-Param (z.B. inStock=true oder
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
      {isActive && <span aria-hidden className="h-1 w-1 bg-primary" />}
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
    price_asc: "Preis ↗",
    price_desc: "Preis ↘",
    name_asc: "Name A–Z",
    name_desc: "Name Z–A",
  };

  return (
    <Select value={currentSort} onValueChange={updateSort}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto gap-2 rounded-[2px] border-transparent bg-transparent px-2 font-mono text-[11px] uppercase tracking-[0.08em]",
          "text-muted-foreground hover:text-foreground focus:ring-0 focus:ring-offset-0",
          "[&>svg]:hidden" // Standard-Chevron ersetzen wir unten durch ChevronsUpDown
        )}
      >
        <span className="text-muted-foreground">Sortierung:</span>
        <span className="text-foreground">
          <SelectValue />
        </span>
        <ChevronsUpDown className="h-3 w-3 opacity-60" aria-hidden />
      </SelectTrigger>
      <SelectContent className="rounded-[2px]">
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
