export const dynamic = "force-dynamic";

import { Heart } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { productCardSelect, getBestsellerProductIds } from "@/lib/products/card";
import type { ProductCardData } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Merkliste" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await db.wishlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: productCardSelect,
      },
    },
  });

  const bestsellerIds = await getBestsellerProductIds();
  const products: ProductCardData[] = items
    .filter((i) => i.product.isActive)
    .map((i) => ({
      ...i.product,
      isBestseller: bestsellerIds.has(i.product.id),
    }));

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Gemerkt</span>
        <h2 className="display-title mt-2 text-2xl">Merkliste</h2>
        <p className="mt-1 text-muted-foreground">
          {products.length} {products.length === 1 ? "Produkt" : "Produkte"} gespeichert
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
            <Heart className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <span className="eyebrow justify-center">Gemerkt</span>
          <p className="display-title mt-2 text-lg">Ihre Merkliste ist leer</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Klicken Sie auf das Herz-Symbol bei einem Produkt, um es hier zu speichern.
          </p>
        </div>
      )}
    </div>
  );
}
