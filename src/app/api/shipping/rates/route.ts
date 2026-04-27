import { NextResponse } from "next/server";
import { getActiveShippingRates } from "@/lib/shipping/rates";

/**
 * GET /api/shipping/rates
 *
 * Public read-only endpoint: liefert alle aktiven Versandtarife für
 * den Checkout-Country-Select und die /versand-Seite. Kein Auth-
 * Check nötig — die Daten sind ohnehin auf der öffentlichen
 * Versand-Seite gelistet.
 */
export async function GET() {
  const rates = await getActiveShippingRates();
  return NextResponse.json({ success: true, data: rates });
}
