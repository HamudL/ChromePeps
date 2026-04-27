export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { ensureShippingRatesSeeded } from "@/lib/shipping/rates";
import { ShippingRatesClient, type ShippingRateRow } from "./shipping-client";

export default async function AdminShippingPage() {
  await requireAdmin();
  await ensureShippingRatesSeeded();

  const rates = await db.shippingRate.findMany({
    orderBy: [{ sortOrder: "asc" }, { countryName: "asc" }],
  });

  // Date-Felder serialisieren — Server-Components können keine Date-
  // Objekte über die Server/Client-Boundary reichen.
  const initial: ShippingRateRow[] = rates.map((r) => ({
    id: r.id,
    countryCode: r.countryCode,
    countryName: r.countryName,
    priceInCents: r.priceInCents,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }));

  return <ShippingRatesClient initial={initial} />;
}
