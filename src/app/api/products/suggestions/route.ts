import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/products/card";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import type { ProductCardData } from "@/types";

/**
 * GET /api/products/suggestions?ids=id1,id2
 *
 * Liefert bis zu 4 Cross-Sell-Vorschläge für den (client-seitigen)
 * Warenkorb: aktive Produkte aus denselben Kategorien wie die übergebenen
 * Produkt-IDs, die IDs selbst ausgeschlossen, gerankt nach Admin-sortOrder
 * dann neueste. Reicht das nicht für 4 Slots, wird mit neuesten aktiven
 * Produkten außerhalb der Kategorien aufgefüllt.
 *
 * Bewusst additiv & read-only — fasst weder Cart-Store noch Checkout an.
 */
const LIMIT = 4;
const MAX_IDS = 50;

export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(`suggestions:${ip}`, {
    maxRequests: 60,
    windowMs: 60_000,
  });
  if (!limit.success) return rateLimitExceeded(limit);

  const idsParam = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const inCart = await db.product.findMany({
      where: { id: { in: ids } },
      select: { categoryId: true },
    });
    const categoryIds = Array.from(new Set(inCart.map((p) => p.categoryId)));

    let suggestions: ProductCardData[] = categoryIds.length
      ? await db.product.findMany({
          where: {
            isActive: true,
            id: { notIn: ids },
            categoryId: { in: categoryIds },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          take: LIMIT,
          select: productCardSelect,
        })
      : [];

    // Auffüllen, falls die Kategorien nicht genug Geschwister liefern.
    if (suggestions.length < LIMIT) {
      const have = new Set<string>([...ids, ...suggestions.map((p) => p.id)]);
      const padding = await db.product.findMany({
        where: { isActive: true, id: { notIn: Array.from(have) } },
        orderBy: { createdAt: "desc" },
        take: LIMIT - suggestions.length,
        select: productCardSelect,
      });
      suggestions = [...suggestions, ...padding];
    }

    return NextResponse.json({ success: true, data: suggestions });
  } catch (err) {
    // Cross-Sell darf den Warenkorb niemals brechen — bei DB-Problemen
    // einfach keine Vorschläge liefern.
    console.error("[suggestions] lookup failed", err);
    return NextResponse.json({ success: true, data: [] });
  }
}
