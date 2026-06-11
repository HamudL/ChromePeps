import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Unsubscribe-Token für Newsletter-Mails.
 *
 * Statt eines zusätzlichen DB-Felds leiten wir den Token deterministisch
 * ab: HMAC-SHA256 über die (normalisierte) E-Mail-Adresse mit AUTH_SECRET
 * als Key. Niemand kann ohne das Secret einen gültigen Token für fremde
 * Adressen erzeugen, und der Link aus alten Mails bleibt gültig, solange
 * AUTH_SECRET nicht rotiert wird.
 *
 * Lebt bewusst NICHT in der route.ts — Next.js erlaubt in Route-Files nur
 * die HTTP-Handler-Exports, und ein zukünftiger Newsletter-Versand braucht
 * denselben Generator für den Unsubscribe-Link pro Empfänger.
 */

/** Normalisierung muss zur Subscribe-Route passen (trim + lowercase). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Erzeugt den Unsubscribe-Token für eine E-Mail-Adresse.
 * Returnt null, wenn AUTH_SECRET fehlt (Misskonfiguration) — Caller
 * sollen dann keinen Link rendern bzw. den Request ablehnen.
 */
export function newsletterUnsubscribeToken(email: string): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(normalizeEmail(email))
    .digest("hex");
}

/**
 * Timing-safe Verifikation eines Unsubscribe-Tokens.
 *
 * Beide Seiten werden auf feste Länge gehasht (gleiches Muster wie
 * checkCronAuth in src/lib/cron-auth.ts), damit timingSafeEqual weder
 * über die Länge leakt noch bei Längenungleichheit wirft.
 */
export function verifyNewsletterUnsubscribeToken(
  email: string,
  token: string
): boolean {
  const expected = newsletterUnsubscribeToken(email);
  if (!expected || !token) return false;
  const ha = createHash("sha256").update(expected).digest();
  const hb = createHash("sha256").update(token).digest();
  return timingSafeEqual(ha, hb);
}
