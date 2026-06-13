"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import type { ProductCardData } from "@/types";

/**
 * Cross-Sell-Block im Warenkorb ("Passt dazu"). Liest die Cart-Produkt-IDs
 * (client-seitig) und holt passende Vorschläge von /api/products/suggestions.
 * Rendert nichts bei leerem Cart oder ohne Vorschläge (hydration-safe).
 *
 * Nutzt nur das bestehende addItem aus dem Cart-Store — kein Eingriff in
 * Sync-/Payload-Logik. Einzel-Selektoren (Zustand v5).
 */
export function CartCrossSell() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const [suggestions, setSuggestions] = useState<ProductCardData[]>([]);

  // Stabiler Schlüssel der distinct Produkt-IDs → Refetch nur bei echter
  // Änderung der Cart-Zusammensetzung, nicht bei reinen Mengen-Updates.
  const idsKey = Array.from(new Set(items.map((i) => i.productId)))
    .sort()
    .join(",");

  useEffect(() => {
    if (!idsKey) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/products/suggestions?ids=${encodeURIComponent(idsKey)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setSuggestions(json.data ?? []);
      })
      .catch(() => {
        /* Cross-Sell ist optional — Fehler still schlucken. */
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (suggestions.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-10">
      <span className="eyebrow">Passt dazu</span>
      <h2 className="display-title mb-6 mt-2 text-2xl">
        Das könnte Sie auch interessieren
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {suggestions.map((p) => {
          const image = p.images[0];
          const hasVariants = p.variants.length > 0;
          const minPrice = hasVariants
            ? Math.min(...p.variants.map((v) => v.priceInCents))
            : p.priceInCents;
          const outOfStock = p.stock <= 0;

          return (
            <div
              key={p.id}
              className="group flex flex-col rounded-sm border border-border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground"
            >
              <Link
                href={`/products/${p.slug}`}
                className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <div className="relative mx-auto mb-3 h-28 w-full">
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt ?? p.name}
                      fill
                      className="object-contain transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 45vw, 22vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <FlaskConical className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-primary-strong">
                  {p.category.name}
                </p>
                <h3 className="line-clamp-1 text-sm font-semibold leading-tight transition-colors group-hover:text-primary">
                  {p.name}
                </h3>
                <p className="mt-1 text-base font-bold tabular-nums">
                  {hasVariants && (
                    <span className="text-xs font-medium text-muted-foreground">
                      ab{" "}
                    </span>
                  )}
                  {formatPrice(minPrice)}
                </p>
              </Link>

              {!hasVariants && !outOfStock ? (
                <button
                  type="button"
                  onClick={() => {
                    addItem({
                      productId: p.id,
                      variantId: null,
                      quantity: 1,
                      name: p.name,
                      variantName: null,
                      priceInCents: p.priceInCents,
                      image: image?.url ?? null,
                      slug: p.slug,
                      stock: p.stock,
                    });
                    toast.success(`${p.name} zum Warenkorb hinzugefügt`);
                  }}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-border py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors hover:border-foreground hover:bg-muted"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  In den Warenkorb
                </button>
              ) : (
                <Link
                  href={`/products/${p.slug}`}
                  className="mt-3 inline-flex items-center justify-center rounded-md border border-border py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {outOfStock ? "Ausverkauft" : "Ansehen"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
