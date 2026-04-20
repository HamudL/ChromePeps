"use client";

/**
 * Idea 03 — Product Card with Spec Drawer
 *
 * Replaces the original hover-reveal of two floating circle buttons (wishlist
 * + quick-add) with a single elegant "spec drawer" that slides up on hover and
 * shows what actually matters for a research-peptide purchase: purity, lot,
 * stock. The quick-add button lives inside the drawer as a full-width action.
 *
 * Purity + lot are pulled from the newest published COA (see
 * productCardSelect.certificates) so the card always reflects the most
 * recently tested batch. Falls back gracefully when no COA exists.
 */

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { WishlistButton } from "@/components/shop/wishlist-button";
import { formatPrice, cn } from "@/lib/utils";
import type { ProductCardData } from "@/types";

export function ProductCard({ product }: { product: ProductCardData }) {
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

  // Neueste COA (kann fehlen, wenn noch keine eingepflegt ist)
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

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block animate-fade-in rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      {/* Image container */}
      <div
        className={cn(
          "relative aspect-[4/5] overflow-hidden rounded-xl",
          "bg-gradient-to-b from-muted/40 to-muted",
          "border border-border/30",
          "transition-all duration-500 ease-out",
          "group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/5"
        )}
      >
        {image ? (
          <Image
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs font-medium">
            Kein Bild
          </div>
        )}

        {/* mg-Size chip (top-right) — always visible */}
        {product.weight && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center rounded-full border border-border/40 bg-background/90 px-2.5 py-1 text-[11px] font-mono font-medium text-foreground backdrop-blur-sm shadow-sm">
              {product.weight}
            </span>
          </div>
        )}

        {/* Wishlist heart (top-left, reveal on hover) */}
        <div
          className="absolute top-3 left-3 z-10 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
          onClick={(e) => e.preventDefault()}
        >
          <WishlistButton
            productId={product.id}
            className="h-9 w-9 bg-background/90 backdrop-blur-sm hover:bg-background shadow-md"
          />
        </div>

        {/* Subtle bottom gradient on hover */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/70 via-background/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        />

        {/* Spec drawer — bottom, revealed on hover */}
        {!isOutOfStock && (
          <div
            className={cn(
              "absolute inset-x-3 bottom-3 z-20 rounded-lg border border-border/60",
              "bg-background/95 backdrop-blur-md shadow-lg",
              "p-3 space-y-2",
              "opacity-0 translate-y-2 pointer-events-none",
              "transition-all duration-300 ease-out",
              "group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
            )}
          >
            {/* Specs row */}
            <div className="space-y-1.5">
              {coaPurity != null && (
                <div className="flex items-baseline justify-between font-mono text-[10.5px]">
                  <span className="text-muted-foreground tracking-wide">
                    Reinheit
                  </span>
                  <span className="text-primary font-semibold">
                    {coaPurity.toFixed(2)}%
                  </span>
                </div>
              )}
              {coaLot && (
                <div className="flex items-baseline justify-between font-mono text-[10.5px]">
                  <span className="text-muted-foreground tracking-wide">
                    Lot
                  </span>
                  <span className="text-foreground">{coaLot}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between font-mono text-[10.5px]">
                <span className="text-muted-foreground tracking-wide">
                  Auf Lager
                </span>
                <span className="text-foreground">{product.stock} Stk.</span>
              </div>
            </div>

            {/* Quick add (nur bei Produkten ohne Varianten — Varianten
                müssen auf der Detailseite gewählt werden) */}
            {!hasVariants && (
              <Button
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={handleAddToCart}
                aria-label={`${product.name} in den Warenkorb`}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                In den Warenkorb
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content (outside the image card, editorial style) */}
      <div className="mt-4 space-y-1.5 px-0.5">
        {/* Category — uppercase tracking */}
        <p className="text-xs uppercase tracking-[0.15em] font-semibold text-muted-foreground">
          {product.category.name}
        </p>

        {/* Product name */}
        <h3 className="text-base font-semibold tracking-tight line-clamp-1 group-hover:text-primary transition-colors duration-300">
          {product.name}
        </h3>

        {/* Price row */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-[17px] font-bold tabular-nums">
            {hasVariants && minPrice !== maxPrice
              ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
              : formatPrice(minPrice)}
          </span>
          {!hasVariants && hasDiscount && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              {formatPrice(product.compareAtPriceInCents!)}
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground/70">
            inkl. MwSt.
          </span>
        </div>
      </div>
    </Link>
  );
}
