import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyNewsletterUnsubscribeToken } from "@/lib/newsletter";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/newsletter/unsubscribe?email=...&token=...
 *
 * One-Click-Abmeldung aus Newsletter-Mails. GET (statt POST), weil der
 * Link direkt aus dem Mail-Client geklickt wird — gleiche Mechanik wie
 * die Double-Opt-in-Bestätigung unter /api/newsletter/confirm.
 *
 * Auth: token = HMAC-SHA256 über die E-Mail mit AUTH_SECRET als Key
 * (siehe src/lib/newsletter.ts). Die E-Mail muss als Query-Param mitkommen,
 * weil ein HMAC nicht umkehrbar ist — der Token beweist nur, dass der
 * Link von uns generiert wurde. Vergleich timing-safe.
 *
 * Antwort: Redirect auf die Startseite mit ?newsletter=...-Status —
 * gleiches Muster wie die Confirm-Route, kein eigenes UI nötig.
 */
export async function GET(req: NextRequest) {
  // Normalisierung (trim + lowercase) muss zur Subscribe-Route passen,
  // sonst verifiziert der Token für "Foo@Bar.de" nicht.
  const email = (req.nextUrl.searchParams.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!email || !verifyNewsletterUnsubscribeToken(email, token)) {
    return NextResponse.redirect(`${BASE_URL}/?newsletter=invalid`);
  }

  // updateMany statt update: wirft nicht, wenn der Subscriber inzwischen
  // gelöscht wurde (Admin-Delete) — der Klick aus einer alten Mail soll
  // trotzdem freundlich enden statt mit einem 500.
  await db.newsletterSubscriber.updateMany({
    where: { email },
    data: { unsubscribedAt: new Date() },
  });

  return NextResponse.redirect(`${BASE_URL}/?newsletter=unsubscribed`);
}
