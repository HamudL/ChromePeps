import "server-only";
import { createHmac } from "crypto";
import { safeEqual } from "@/lib/safe-equal";

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
 * Timing-safe Verifikation eines Unsubscribe-Tokens — geteilter
 * safeEqual-Helper (siehe src/lib/safe-equal.ts), gleiches Muster wie
 * checkCronAuth.
 */
export function verifyNewsletterUnsubscribeToken(
  email: string,
  token: string
): boolean {
  const expected = newsletterUnsubscribeToken(email);
  if (!expected || !token) return false;
  return safeEqual(expected, token);
}
