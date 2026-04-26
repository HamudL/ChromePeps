"use client";

/**
 * ProductCard — Apotheke/Rx (Prescription Label) Stil
 *
 * Weiße Karte mit perforierten Dashed-Linien oben/unten (wie auf einem
 * Medikamenten-Etikett). Oben: Kategorie (gold) + Katalog-Nummer
 * "NNN / Total". Mitte: Produktbild oder Vial-Fallback mit Lot-Label-
 * Overlay. Name (h3). Spec-Rows (Menge, Reinheit, Lot) — Reinheit + Lot
 * aus der neuesten COA, sonst ausgeblendet. Preis + "Ansehen →" CTA
 * (reveal on hover).
 *
 * Props-Signatur unverändert zur vorigen Version, damit Call-Sites
 * (Homepage Bestsellers, Related Products, Wishlist, Katalog) ohne
 * Anpassung weiterlaufen. Cart-Store-Wiring + WishlistButton bleiben
 * erhalten; Quick-Add erscheint auf Hover als schmaler Button im CTA-
 * Bereich (nur bei Produkten ohne Varianten — Varianten erzwingen den
 * Weg über die Detailseite).
 */

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cart-store";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { formatPrice, cn } from "@/lib/utils";
import type { ProductCardData } from "@/types";

interface ProductCardProps {
  product: ProductCardData;
  /**
   * Optionale Position der Karte im Grid (1-basiert). Wird als
   * dezenter Index in der Kopfzeile angezeigt ("017 / 247"). Bei
   * undefined wird der Index ausgeblendet — in Fällen wie
   * Wishlist/Related-Products macht eine "Katalog-Position" keinen
   * Sinn.
   */
  index?: number;
  /**
   * Gesamt-Anzahl im aktuellen Listing (für den Index-Nenner).
   */
  total?: number;
}

export function ProductCard({ product, index, total }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const isOutOfStock = product.stock <= 0;
  const hasDiscount =
    product.compareAtPriceInCents &&
    product.compareAtPriceInCents > product.priceInCents;
  const image = product.images[0];

  const variantPrices = product.variants.map((v) => v.priceInCents);
  const hasVariants = variantPrices.length > 0;
  const minPrice = hasVariants
    ? Math.min(...variantPrices)
    : product.priceInCents;
  const maxPrice = hasVariants
    ? Math.max(...variantPrices)
    : product.priceInCents;

  // Neueste veröffentlichte COA — wir lesen sie aus `certificates[0]`,
  // das `productCardSelect` bereits einzeln per `orderBy testDate desc,
  // take 1` zieht.
  const latestCoa = product.certificates[0];
  const coaPurity = latestCoa?.purity ?? null;
  const coaLot = latestCoa?.batchNumber ?? null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      variantId: null,
      quantity: 1,
      name: product.name,
      variantName: null,
      priceInCents: product.priceInCents,
      image: image?.url ?? null,
      slug: product.slug,
      stock: product.stock,
    });
    openCart();
    toast.success(`${product.name} zum Warenkorb hinzugefügt`);
  };

  const indexLabel =
    typeof index === "number" && typeof total === "number"
      ? `${String(index).padStart(3, "0")} / ${total}`
      : null;

  const priceDisplay =
    hasVariants && minPrice !== maxPrice
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : formatPrice(minPrice);

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group relative flex flex-col",
        "bg-card border border-border rounded-sm",
        // ca. +20 % skaliert ggü. vorher (px-6/pt-7/pb-6) — gibt der
        // Karte deutlich mehr Luft, Grid-Dichte bleibt erhalten weil
        // die Spalten sich responsiv verteilen; die Karte wird also
        // nicht breiter, sondern höher und visuell präsenter.
        "px-7 pt-8 pb-7",
        "transition-all duration-300 ease-out",
        "hover:border-foreground hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_hsl(20_14%_10%/0.2)]",
        "animate-fade-in",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      )}
    >
      {/* Perforierte Linien — typische "Prescription Label"-Optik.
          Top liegt bei ~10px, Bottom bei ~10px — genug Abstand zum
          Padding, damit sie als dekorative Fuge lesen, nicht als Border. */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-2.5 h-px"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, hsl(var(--border)) 0 4px, transparent 4px 8px)",
        }}
      />
      <div
        aria-hidden
        className="absolute left-0 right-0 bottom-2.5 h-px"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, hsl(var(--border)) 0 4px, transparent 4px 8px)",
        }}
      />

      {/* Head: Kategorie + Index + Wishlist */}
      <div className="relative mb-6 flex items-center justify-between font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
        <span className="text-primary font-semibold">
          {product.category.name}
        </span>
        <div className="flex items-center gap-2">
          {indexLabel && <span>{indexLabel}</span>}
          <div
            className="opacity-70 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.preventDefault()}
          >
            <WishlistButton
              productId={product.id}
              className="h-9 w-9 bg-transparent hover:bg-muted"
            />
          </div>
        </div>
      </div>

      {/* Media — Produktbild oder Vial-Fallback.
          Kein Lot-Label-Overlay mehr (die Lot-Nummer steht weiter unten
          in der Spec-Row). object-contain, damit vom User geplante
          freigestellte Vial-Bilder nicht beschnitten werden. Hintergrund
          bewusst reines bg-card (wei\u00df auf hellem Thema) ohne Gradient,
          damit eine transparente Vial optisch ohne grauen Rahmen "floated"
          und nicht mehr in einer Box sitzt. */}
      <div className="relative mx-auto mb-6 h-[200px] w-full max-w-[252px]">
        {image ? (
          <div className="relative h-full w-full bg-card">
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
            />
          </div>
        ) : (
          // Vial-Fallback als CSS-Gradient — nur wenn kein Produktbild da
          // ist. Keeps the "catalog card" coherent statt "Kein Bild"-Text.
          <VialFallback name={product.name} weight={product.weight} lot={coaLot} />
        )}

        {/* "Ausverkauft"-Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-[2px]">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase font-semibold text-destructive">
              Ausverkauft
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="relative text-2xl font-semibold tracking-tight leading-tight line-clamp-1 group-hover:text-primary transition-colors duration-300">
        {product.name}
      </h3>

      {/* Spec-Rows — nur gerenderte Zeilen, die auch Daten haben */}
      <dl className="relative mt-3 space-y-2">
        {product.weight && (
          <SpecRow k="Menge" v={product.weight} />
        )}
        {coaPurity != null && (
          <SpecRow k="Reinheit" v={`${coaPurity.toFixed(2)}%`} gold />
        )}
        {coaLot && <SpecRow k="Lot" v={coaLot} />}
      </dl>

      {/* Price + CTA */}
      <div className="relative mt-auto pt-5 border-t border-border flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums leading-none">
            {priceDisplay}
          </span>
          {!hasVariants && hasDiscount && (
            <span className="text-sm text-muted-foreground line-through tabular-nums">
              {formatPrice(product.compareAtPriceInCents!)}
            </span>
          )}
        </div>

        {/* Quick-Add nur bei Variant-freien, verfügbaren Produkten.
            Slides in on hover, replaces the text-CTA to keep row layout
            stable. */}
        {!isOutOfStock && !hasVariants ? (
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`${product.name} in den Warenkorb`}
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.15em] uppercase font-semibold text-primary",
              "opacity-0 translate-x-2 transition-all duration-250",
              "group-hover:opacity-100 group-hover:translate-x-0",
              "hover:text-primary/80"
            )}
          >
            <ShoppingCart className="h-3 w-3" />
            Add
          </button>
        ) : (
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.15em] uppercase font-semibold text-primary",
              "opacity-0 translate-x-2 transition-all duration-250",
              "group-hover:opacity-100 group-hover:translate-x-0"
            )}
          >
            Ansehen →
          </span>
        )}
      </div>
    </Link>
  );
}

function SpecRow({ k, v, gold }: { k: string; v: string; gold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between font-mono text-[13px]">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={cn(
          "truncate max-w-[60%] text-right",
          gold ? "text-primary font-semibold" : "text-foreground"
        )}
      >
        {v}
      </span>
    </div>
  );
}

function VialFallback({
  name,
  weight,
  lot,
}: {
  name: string;
  weight: string | null;
  lot: string | null;
}) {
  // CSS-Gradient-Vial als ruhiger Fallback. Das echte Produktbild hat
  // Vorrang (Image-Branch oben) — dieser Branch greift nur wenn im
  // Katalog noch kein Bild hinterlegt ist.
  return (
    <div
      className="relative mx-auto h-full w-24 rounded-[6px_6px_3px_3px] transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:-translate-y-0.5"
      style={{
        background:
          "linear-gradient(to right, hsl(45 40% 50% / 0.25) 0%, hsl(45 78% 78%) 30%, hsl(45 88% 90%) 50%, hsl(45 78% 78%) 70%, hsl(45 40% 50% / 0.25) 100%)",
        boxShadow:
          "inset 0 0 16px hsl(45 60% 40% / 0.2), 0 6px 18px hsl(45 70% 40% / 0.12)",
      }}
      aria-hidden
    >
      {/* Gummikappe */}
      <span
        className="absolute -top-3 left-1/2 -translate-x-1/2 h-4 w-8 rounded-sm"
        style={{ background: "hsl(20 15% 20%)" }}
      />
      {/* Label */}
      <div className="absolute inset-x-0 top-[36%] bottom-[18%] bg-background/95 border-y border-[hsl(45_30%_70%)] px-1.5 flex flex-col justify-center">
        <p className="font-mono text-[8px] font-semibold text-center text-foreground leading-tight truncate">
          {lot ?? name}
        </p>
        {weight && (
          <p className="font-mono text-[7px] text-primary text-center leading-tight mt-0.5">
            {weight}
          </p>
        )}
      </div>
    </div>
  );
}
