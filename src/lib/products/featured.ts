import "server-only";
import { db } from "@/lib/db";
import { getBestsellerProductIds } from "./card";

/**
 * Shape, die die Featured-Product-Card für den Apotheke-Shop-Hero
 * benötigt. Bewusst separat von `ProductCardData`, weil hier deutlich
 * mehr COA-Felder (Method, Laboratory, TestDate) gezogen werden, die in
 * den kleinen Produktkarten überflüssig wären.
 */
export interface FeaturedProductData {
  id: string;
  slug: string;
  name: string;
  shortDesc: string | null;
  priceInCents: number;
  weight: string | null;
  form: string | null;
  categoryName: string;
  categorySlug: string;
  image: { url: string; alt: string | null } | null;
  coa: {
    batchNumber: string;
    purity: number | null;
    testMethod: string;
    laboratory: string;
    testDate: Date;
  } | null;
}

/**
 * Liefert das Produkt, das im Shop-Hero als "Featured" beworben wird.
 *
 * Strategie (fällt sauber durch, wenn ein Schritt keine Treffer hat):
 *  1. #1 aus `getBestsellerProductIds()` (datengetrieben, letzte
 *     90 Tage Sales-Signal)
 *  2. Wenn keine Bestseller: neuestes aktives Produkt mit mindestens
 *     einer veröffentlichten COA (erzählt die "aktuelle Charge"-Story)
 *  3. Wenn immer noch nichts: neuestes aktives Produkt überhaupt
 *  4. null — Hero rendert ohne Featured-Block
 */
export async function getFeaturedProduct(): Promise<FeaturedProductData | null> {
  const select = {
    id: true,
    slug: true,
    name: true,
    shortDesc: true,
    priceInCents: true,
    weight: true,
    form: true,
    category: { select: { name: true, slug: true } },
    images: {
      select: { url: true, alt: true },
      orderBy: { sortOrder: "asc" as const },
      take: 1,
    },
    certificates: {
      where: { isPublished: true },
      orderBy: { testDate: "desc" as const },
      take: 1,
      select: {
        batchNumber: true,
        purity: true,
        testMethod: true,
        laboratory: true,
        testDate: true,
      },
    },
  };

  const bestsellerIds = await getBestsellerProductIds({ limit: 1 });
  const firstBestsellerId = Array.from(bestsellerIds)[0];

  let product = firstBestsellerId
    ? await db.product.findFirst({
        where: { id: firstBestsellerId, isActive: true },
        select,
      })
    : null;

  if (!product) {
    product = await db.product.findFirst({
      where: {
        isActive: true,
        certificates: { some: { isPublished: true } },
      },
      orderBy: { createdAt: "desc" },
      select,
    });
  }

  if (!product) {
    product = await db.product.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select,
    });
  }

  if (!product) return null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortDesc: product.shortDesc,
    priceInCents: product.priceInCents,
    weight: product.weight,
    form: product.form,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    image: product.images[0] ?? null,
    coa: product.certificates[0] ?? null,
  };
}
