import "server-only";
import { db } from "@/lib/db";

/**
 * Aggregate shop-wide "Vertrauens-Kennzahlen" für Hero-/Category-Panels
 * und die LiveMetrics-Komponente. Kuratiert auf die zwei Zahlen, die der
 * User im Apotheke-Hero sehen will:
 *
 *  - getestete Chargen  (Anzahl aller veröffentlichten CoAs)
 *  - Ø Reinheit 12 Monate (AVG der purity aus CoAs mit Testdatum in den
 *    letzten 12 Monaten — spiegelt aktuelle Chargen-Qualität statt
 *    Allzeit-Mittel, das sich nie mehr bewegt)
 *
 * Frühere Entscheidung (Homepage): Bestellungs-Zahl wird NICHT gezeigt,
 * hier ebenso.
 */
export interface ShopStats {
  batchCount: number;
  avgPurity12m: number | null;
}

export async function getShopStats(): Promise<ShopStats> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const [batchCount, avgPurity] = await Promise.all([
    db.certificateOfAnalysis.count({ where: { isPublished: true } }),
    db.certificateOfAnalysis.aggregate({
      where: {
        isPublished: true,
        purity: { not: null },
        testDate: { gte: twelveMonthsAgo },
      },
      _avg: { purity: true },
    }),
  ]);

  return {
    batchCount,
    avgPurity12m: avgPurity._avg.purity ?? null,
  };
}

/**
 * Per-Kategorie-Kennzahlen für die Kategorie-Landingpage (Key-Stats-Box).
 * Liefert Anzahl aktiver Produkte, durchschnittliche Reinheit der neuesten
 * COAs in der Kategorie, niedrigsten Einstiegspreis, und die neueste
 * Chargennummer. null wenn die Kategorie keine aktiven Produkte hat.
 */
export interface CategoryStats {
  productCount: number;
  avgPurity: number | null;
  minPriceInCents: number | null;
  latestBatchNumber: string | null;
}

export async function getCategoryStats(
  categoryId: string
): Promise<CategoryStats> {
  const [productAggregate, coaAggregate, latestCoa] = await Promise.all([
    db.product.aggregate({
      where: { categoryId, isActive: true },
      _count: { _all: true },
      _min: { priceInCents: true },
    }),
    db.certificateOfAnalysis.aggregate({
      where: {
        isPublished: true,
        purity: { not: null },
        product: { categoryId, isActive: true },
      },
      _avg: { purity: true },
    }),
    db.certificateOfAnalysis.findFirst({
      where: {
        isPublished: true,
        product: { categoryId, isActive: true },
      },
      orderBy: { testDate: "desc" },
      select: { batchNumber: true },
    }),
  ]);

  return {
    productCount: productAggregate._count._all,
    avgPurity: coaAggregate._avg.purity ?? null,
    minPriceInCents: productAggregate._min.priceInCents ?? null,
    latestBatchNumber: latestCoa?.batchNumber ?? null,
  };
}
