import "server-only";
import { cacheDel, cacheDelPattern } from "@/lib/redis";
import { CACHE_KEYS, HOMEPAGE_CACHE } from "@/lib/constants";

/**
 * Invalidiert alle Produkt-Caches, deren Inhalt am Lagerbestand hängt.
 *
 * Aufzurufen nach jeder Order-Operation, die Stock verändert:
 *  - Checkout (Vorkasse + Stripe-Webhook) → Stock dekrementiert
 *  - Voll-Refund (Stripe-Webhook)         → Stock restauriert
 *  - Admin-Cancel                          → Stock restauriert
 *
 * Ohne diese Invalidierung zeigten Listing-/Detail-/Homepage-Caches bis
 * zum TTL-Ablauf (60–120 s) eine veraltete Verfügbarkeit — ein soeben
 * ausverkauftes Produkt wirkte noch "Verfügbar" und produzierte
 * INSUFFICIENT_STOCK-409er erst im Checkout.
 *
 * Detail-Keys werden per Pattern gelöscht statt per Slug: an keiner der
 * Order-Stellen sind die Produkt-Slugs geladen (OrderItems tragen nur
 * productId/variantId), und ein Extra-Query nur für die Invalidierung
 * wäre teurer als der SCAN. Gleiches Pattern nutzt bereits
 * /api/admin/products/reorder.
 *
 * Fail-safe by design: cacheDel/cacheDelPattern fangen Redis-Fehler
 * intern ab (loggen + no-op) — ein Redis-Ausfall bricht also NIE den
 * Checkout/Webhook; schlimmstenfalls bleibt der Cache bis TTL stale,
 * was dem vorherigen Verhalten entspricht.
 */
export async function invalidateStockCaches(): Promise<void> {
  await Promise.all([
    // Alle Listen-Snapshots (Hauptkatalog, Kategorie-Listings, API) —
    // exakt dieselbe Pattern-Syntax wie die Admin-Product-Writes.
    cacheDelPattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`),
    // Produkt-Detail-Snapshots (Key trägt den Slug im Suffix).
    cacheDelPattern("products:detail:*"),
    // Bestseller-IDs hängen am Order-Volumen — eine neue Order kann die
    // Top-N verschieben.
    cacheDel(CACHE_KEYS.BESTSELLER_IDS),
    // Homepage-Bestseller-Cards tragen stock im Card-Payload.
    cacheDel(HOMEPAGE_CACHE.BESTSELLERS),
  ]);
}
