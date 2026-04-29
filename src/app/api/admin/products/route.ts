import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/products
 *
 * Flache Liste ALLER Produkte für Admin-UIs (Komponenten-Picker im
 * Blend-Editor, Test-Order-Dialog etc.). Im Gegensatz zum public
 * `/api/products`:
 *  - Liefert auch inaktive Produkte (`isActive: false`) — das ist die
 *    primäre Begründung für diesen Endpoint: Blend-Komponenten wie
 *    "RG3", die nur als hidden Produkt existieren, müssen im Picker
 *    auswählbar sein.
 *  - Kein Pagination-Cap (Public-Endpoint hat max. pageSize=100, was
 *    den Picker blockiert hat).
 *  - Kein Rate-Limit, kein Cache — Admin-Inventory ändert sich selten,
 *    aber wenn der Admin gerade was umkonfiguriert, soll er die neuen
 *    Werte sofort sehen.
 *  - Kompakte Felder, optimiert für Listen-/Picker-UIs.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }

  const products = await db.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      isActive: true,
      priceInCents: true,
      stock: true,
    },
  });

  return NextResponse.json({ success: true, data: products });
}
