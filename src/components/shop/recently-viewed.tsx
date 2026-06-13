"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FlaskConical } from "lucide-react";
import { useRecentlyViewedStore } from "@/store/recently-viewed-store";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Displays the user's recently viewed products.
 * Renders nothing when the list is empty or during SSR (hydration-safe).
 */
export function RecentlyViewed({ currentProductId }: { currentProductId?: string }) {
  const items = useRecentlyViewedStore((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Filter out the product the user is currently viewing
  const visible = currentProductId
    ? items.filter((i) => i.id !== currentProductId)
    : items;

  if (visible.length === 0) return null;

  return (
    <section className="container py-12 md:py-16" aria-label="Zuletzt angesehen">
      {/* Sektionskopf im Protokoll-Stil: Mono-Kicker, Fraunces-Titel,
          Mess-Lineal als Haarlinie darunter. */}
      <div className="mb-8">
        <span className="eyebrow">Verlauf</span>
        <h2 className="display-title mt-3 text-2xl md:text-3xl">
          Zuletzt angesehen.
        </h2>
        <div className="tick-rule mt-6" aria-hidden />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {visible.map((item) => (
          <Link key={item.id} href={`/products/${item.slug}`}>
            <Card className="group overflow-hidden h-full hover:shadow-lg transition-all duration-300">
              <div className="relative aspect-square bg-muted overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.imageAlt || item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <FlaskConical className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                {item.compareAtPriceInCents && (
                  <Badge
                    variant="destructive"
                    className="absolute top-2 left-2 text-xs"
                  >
                    Sale
                  </Badge>
                )}
              </div>
              <CardContent className="p-3 md:p-4 space-y-1">
                <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                <h3 className="font-semibold text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
                  {item.name}
                </h3>
                <div className="flex items-center gap-2">
                  {item.purity && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {item.purity}
                    </Badge>
                  )}
                  {item.weight && (
                    <span className="text-xs text-muted-foreground">{item.weight}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-bold text-sm md:text-base">
                    {formatPrice(item.priceInCents)}
                  </span>
                  {item.compareAtPriceInCents && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(item.compareAtPriceInCents)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
