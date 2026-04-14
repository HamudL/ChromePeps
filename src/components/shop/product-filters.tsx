"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

/**
 * Category pills — horizontal scrollable bar. Each pill is a link, so
 * keyboard/right-click "open in new tab" works, and the active state
 * reflects the current URL query.
 */
export function CategoryPills({
  categories,
  currentCategory,
}: {
  categories: Category[];
  currentCategory?: string;
}) {
  const pillBase =
    "inline-flex items-center whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-200";
  const pillInactive =
    "border-border/60 bg-background hover:border-primary/40 hover:text-primary text-muted-foreground";
  const pillActive =
    "border-primary bg-primary text-primary-foreground hover:bg-primary";

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <Link
        href="/products"
        className={cn(pillBase, !currentCategory ? pillActive : pillInactive)}
      >
        Alle
      </Link>
      {categories.map((cat) => {
        const isActive = currentCategory === cat.slug;
        return (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className={cn(pillBase, isActive ? pillActive : pillInactive)}
          >
            {cat.name}
            <span
              className={cn(
                "ml-2 text-[11px] tabular-nums",
                isActive ? "text-primary-foreground/80" : "text-muted-foreground/60"
              )}
            >
              {cat._count.products}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Sort dropdown — compact, used in the sticky filter bar.
 */
export function SortSelect() {
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
    router.push(`/products?${params.toString()}`);
  };

  const SORT_LABELS: Record<string, string> = {
    newest: "Neueste",
    price_asc: "Preis: aufsteigend",
    price_desc: "Preis: absteigend",
    name_asc: "Name: A–Z",
    name_desc: "Name: Z–A",
  };

  return (
    <Select value={currentSort} onValueChange={updateSort}>
      <SelectTrigger className="h-10 w-[180px] bg-background/60 border-border/60 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRODUCT_SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {SORT_LABELS[opt.value] ?? opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Legacy wrapper — some older pages still use <ProductFilters />.
 * Kept for backwards compatibility but the shop page now uses
 * CategoryPills + SortSelect directly for a tighter editorial layout.
 */
export function ProductFilters({ categories }: { categories: Category[] }) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") ?? undefined;

  return (
    <div className="flex flex-col gap-4">
      <CategoryPills categories={categories} currentCategory={currentCategory} />
      <SortSelect />
    </div>
  );
}
