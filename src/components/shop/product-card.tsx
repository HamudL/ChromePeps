"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";
import type { ProductCardData } from "@/types";

export function ProductCard({ product }: { product: ProductCardData }) {
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const isOutOfStock = product.stock <= 0;
  const hasDiscount = product.compareAtPriceInCents && product.compareAtPriceInCents > product.priceInCents;
  const image = product.images[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
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
  };

  return (
    <div className="animate-fade-in">

      <Link href={`/products/${product.slug}`}>
        <Card className="group overflow-hidden h-full hover:shadow-lg transition-shadow duration-300">
          {/* Image */}
          <div className="relative aspect-square bg-muted overflow-hidden">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt ?? product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                No Image
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {hasDiscount && <Badge variant="destructive">Sale</Badge>}
              {isOutOfStock && <Badge variant="secondary">Out of Stock</Badge>}
              {product.purity && (
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  {product.purity}
                </Badge>
              )}
            </div>

            {/* Quick add */}
            {!isOutOfStock && (
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <CardContent className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground">{product.category.name}</p>
            <h3 className="font-semibold line-clamp-1">{product.name}</h3>
            {product.shortDesc && (
              <p className="text-xs text-muted-foreground line-clamp-2">{product.shortDesc}</p>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatPrice(product.priceInCents)}</span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compareAtPriceInCents!)}
                </span>
              )}
            </div>
            {product.weight && (
              <p className="text-xs text-muted-foreground">{product.weight}</p>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
