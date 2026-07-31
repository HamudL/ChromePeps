import "server-only";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Gemeinsame Zugangsprüfung für die öffentlichen Gast-Endpunkte:
 *
 *   - POST /api/order-status          (Status ansehen)
 *   - POST /api/order-status/invoice  (Rechnung herunterladen)
 *
 * Beide autorisieren über DIESELBE Zwei-Faktor-Kombination: Bestellnummer
 * UND passende E-Mail-Adresse. Das liegt hier zentral, weil ein Auseinander-
 * driften der beiden Prüfungen direkt ein Datenleck wäre — die Rechnung
 * enthält mehr personenbezogene Daten als die Statusseite (vollständige
 * Rechnungsadresse, Rechnungsnummer), darf also unter keinen Umständen die
 * schwächere Hürde bekommen.
 */

/**
 * Rate-Limit-Budget pro IP. Bewusst als EIN gemeinsamer Bucket für beide
 * Endpunkte: Wer die Statusabfrage ausgereizt hat, bekommt über den
 * Rechnungs-Download keine zweiten 10 Versuche geschenkt. 10 Versuche pro
 * 5 Minuten reichen für jemanden, der sich bei der E-Mail vertippt, und
 * machen das Durchprobieren von Bestellnummern unattraktiv.
 */
export const GUEST_LOOKUP_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 300_000,
} as const;

export function guestLookupRateLimit(ip: string) {
  return rateLimit(`order-status:ip:${ip}`, GUEST_LOOKUP_RATE_LIMIT);
}

/**
 * Einheitliche Fehlermeldung für "Bestellnummer unbekannt" UND "E-Mail passt
 * nicht". Die beiden Fälle dürfen nicht unterscheidbar sein, sonst wird der
 * Endpunkt zum Orakel dafür, welche Bestellnummern existieren.
 */
export const GUEST_LOOKUP_NOT_FOUND =
  "Keine Bestellung gefunden, die zu dieser Bestellnummer und E-Mail-Adresse passt.";

export type GuestLookupInput =
  | { ok: true; orderNumber: string; email: string }
  | { ok: false; error: string };

/**
 * Liest und validiert Bestellnummer + E-Mail aus einem bereits geparsten
 * Request-Body. Gibt die E-Mail normalisiert (getrimmt, lowercase) zurück,
 * damit der Vergleich unten case-insensitiv funktioniert.
 */
export function parseGuestLookupInput(body: unknown): GuestLookupInput {
  const raw = (body ?? {}) as { orderNumber?: unknown; email?: unknown };
  const orderNumber =
    typeof raw.orderNumber === "string" ? raw.orderNumber.trim() : "";
  const email =
    typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";

  if (!orderNumber || !email) {
    return {
      ok: false,
      error: "Bitte Bestellnummer und E-Mail-Adresse angeben.",
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  return { ok: true, orderNumber, email };
}

/**
 * Prüft, ob die angegebene (bereits normalisierte) E-Mail zur Bestellung
 * gehört. Akzeptiert sowohl Gast-Bestellungen (guestEmail) als auch
 * Konto-Bestellungen (user.email) — jemand, der mit Konto bestellt hat,
 * soll seine Bestellung auch ohne Login nachschlagen können.
 */
export function guestLookupEmailMatches(
  order: { guestEmail: string | null; user: { email: string | null } | null },
  normalizedEmail: string
): boolean {
  const orderEmail = (order.user?.email ?? order.guestEmail ?? "").toLowerCase();
  return !!orderEmail && orderEmail === normalizedEmail;
}
