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
        <h1 className="text-2xl font-bold tracking-tight">Merkliste</h1>
        <p className="text-muted-foreground">
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
        <div className="text-center py-16 text-muted-foreground">
          <Heart className="mx-auto h-10 w-10 mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Ihre Merkliste ist leer</p>
          <p className="text-sm mt-1">
            Klicken Sie auf das Herz-Symbol bei einem Produkt, um es hier zu speichern.
          </p>
        </div>
      )}
    </div>
  );
}
