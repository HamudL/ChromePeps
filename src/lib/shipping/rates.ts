import "server-only";
import { db } from "@/lib/db";
import { STANDARD_SHIPPING_CENTS } from "@/lib/order/calculate-totals";

/**
 * Shipping-Rate-Resolver für den Checkout. Ein zentraler Helper, damit
 * Stripe-Checkout, Bank-Transfer und Admin-UI exakt die gleichen Daten
 * sehen — sonst könnte die Stripe-Session 9,99 € berechnen während der
 * spätere Order-Insert 5,99 € speichert.
 *
 * Lazy-Seed beim ersten Lookup: wenn die Tabelle leer ist (frische DB,
 * gerade frisch deployed), füllen wir die 27 EU-Länder mit sinnvollen
 * Default-Preisen. Der Admin kann sie danach im /admin/shipping UI
 * anpassen oder deaktivieren — nichts hier ist hartkodiert "für immer".
 *
 * Free-Shipping ab 200 € gilt EU-weit (siehe
 * `FREE_SHIPPING_THRESHOLD_CENTS` in lib/order/calculate-totals).
 */

export interface ResolvedShippingRate {
  countryCode: string;
  countryName: string;
  priceInCents: number;
}

/**
 * Default-Tarife. Werden nur beim allerersten Lookup in die DB geschrieben
 * (lazy seed). Spätere Edits im Admin-UI überschreiben sie permanent.
 *
 * Staffelung:
 *   - DE              : Heim-Markt, gleicher Preis wie vor Phase 7.
 *   - DACH-EU (AT)    : Geringfügig teurer, kein CH (nicht EU).
 *   - EU-Festland     : Standard EU-Versand.
 *   - EU-Inseln       : Teurer wegen Luft- bzw. Fährweg.
 */
export const DEFAULT_SHIPPING_RATES: Array<{
  countryCode: string;
  countryName: string;
  priceInCents: number;
  sortOrder: number;
}> = [
  { countryCode: "DE", countryName: "Deutschland", priceInCents: 599, sortOrder: 1 },
  { countryCode: "AT", countryName: "Österreich", priceInCents: 999, sortOrder: 2 },
  // EU-Festland — alphabetisch
  { countryCode: "BE", countryName: "Belgien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "BG", countryName: "Bulgarien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "HR", countryName: "Kroatien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "CZ", countryName: "Tschechien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "DK", countryName: "Dänemark", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "EE", countryName: "Estland", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "FI", countryName: "Finnland", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "FR", countryName: "Frankreich", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "GR", countryName: "Griechenland", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "HU", countryName: "Ungarn", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "IT", countryName: "Italien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "LV", countryName: "Lettland", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "LT", countryName: "Litauen", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "LU", countryName: "Luxemburg", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "NL", countryName: "Niederlande", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "PL", countryName: "Polen", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "PT", countryName: "Portugal", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "RO", countryName: "Rumänien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "SK", countryName: "Slowakei", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "SI", countryName: "Slowenien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "ES", countryName: "Spanien", priceInCents: 1499, sortOrder: 10 },
  { countryCode: "SE", countryName: "Schweden", priceInCents: 1499, sortOrder: 10 },
  // EU-Inseln — Aufpreis wegen Logistik
  { countryCode: "CY", countryName: "Zypern", priceInCents: 2499, sortOrder: 20 },
  { countryCode: "IE", countryName: "Irland", priceInCents: 2499, sortOrder: 20 },
  { countryCode: "MT", countryName: "Malta", priceInCents: 2499, sortOrder: 20 },
];

let seededInThisProcess = false;

/**
 * Stellt sicher, dass die `shipping_rates`-Tabelle befüllt ist. Idempotent —
 * läuft nur einmal pro Container-Lifecycle und nur wenn die Tabelle leer
 * ist. createMany mit `skipDuplicates` für die Sicherheit gegen Race-
 * Conditions zwischen parallelen Requests beim ersten Boot.
 */
export async function ensureShippingRatesSeeded(): Promise<void> {
  if (seededInThisProcess) return;
  const count = await db.shippingRate.count();
  if (count > 0) {
    seededInThisProcess = true;
    return;
  }
  await db.shippingRate.createMany({
    data: DEFAULT_SHIPPING_RATES.map((r) => ({
      countryCode: r.countryCode,
      countryName: r.countryName,
      priceInCents: r.priceInCents,
      sortOrder: r.sortOrder,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  seededInThisProcess = true;
}

/**
 * Liest alle aktiven Versandtarife. Stable order: sortOrder asc, dann
 * Land-Name asc — so dass DE zuerst, AT zweitens, dann alphabetisch.
 */
export async function getActiveShippingRates(): Promise<ResolvedShippingRate[]> {
  await ensureShippingRatesSeeded();
  const rows = await db.shippingRate.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { countryName: "asc" }],
    select: { countryCode: true, countryName: true, priceInCents: true },
  });
  return rows;
}

/**
 * Resolved den Versandpreis für einen ISO-3166-Alpha-2 Code. Wirft NICHT —
 * gibt stattdessen `null` zurück, wenn das Land nicht in der Tabelle
 * steht oder deaktiviert ist. Caller müssen das als Lieferverbot
 * behandeln (HTTP 400 "Wir liefern aktuell nicht in dieses Land").
 *
 * Fallback nur als Defense-in-Depth: wenn die DB unerreichbar ist und
 * der Caller einen DE-Default braucht, kann er das selbst orchestrieren.
 */
export async function resolveShippingRate(
  countryCode: string,
): Promise<ResolvedShippingRate | null> {
  await ensureShippingRatesSeeded();
  const code = countryCode.toUpperCase().trim();
  if (code.length !== 2) return null;
  const row = await db.shippingRate.findFirst({
    where: { countryCode: code, isActive: true },
    select: { countryCode: true, countryName: true, priceInCents: true },
  });
  return row ?? null;
}

/**
 * Resolver für Routen, die einen sicheren Default brauchen: gibt den
 * STANDARD_SHIPPING_CENTS-Wert (DE-Tarif) zurück, wenn das Land nicht
 * in der Tabelle steht. Soll nur als Defense-in-Depth verwendet werden,
 * NICHT als regulärer Fallback — sonst zahlen Auslandskunden DE-Preise.
 */
export function fallbackShippingCents(): number {
  return STANDARD_SHIPPING_CENTS;
}
