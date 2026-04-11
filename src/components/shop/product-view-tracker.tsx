"use client";

import { useEffect } from "react";
import { useRecentlyViewedStore } from "@/store/recently-viewed-store";

interface ProductViewTrackerProps {
  product: {
    id: string;
    name: string;
    slug: string;
    priceInCents: number;
    compareAtPriceInCents: number | null;
    purity: string | null;
    weight: string | null;
    images: { url: string; alt: string | null }[];
    category: { name: string; slug: string };
  };
}

/**
 * Invisible client component that records the current product
 * into the "recently viewed" localStorage store on mount.
 * Drop it anywhere inside the product detail page.
 */
export function ProductViewTracker({ product }: ProductViewTrackerProps) {
  const trackView = useRecentlyViewedStore((s) => s.trackView);

  useEffect(() => {
    trackView({
      id: product.id,
      name: product.name,
      slug: product.slug,
      priceInCents: product.priceInCents,
      compareAtPriceInCents: product.compareAtPriceInCents,
      purity: product.purity,
      weight: product.weight,
      image: product.images[0]?.url ?? null,
      imageAlt: product.images[0]?.alt ?? null,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return null;
}
