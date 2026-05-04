import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReviewRequestEmail } from "@/lib/mail/send";

/**
 * Cron-Endpoint: schickt Review-Request-Mails an Kunden, deren
 * Bestellung 7+ Tage zugestellt ist und für die noch keine
 * Review-Request-Mail rausging (`reviewRequestedAt IS NULL`).
 *
 * Authentifizierung via `Authorization: Bearer ${CRON_SECRET}`-Header.
 * Wenn CRON_SECRET nicht gesetzt ist, returnt 503 — verhindert dass
 * der Endpoint bei fehlerhafter Konfiguration aus Versehen offen ist.
 *
 * Idempotenz: pro erfolgreich versendeter Mail wird `reviewRequestedAt`
 * gesetzt — der nächste Cron-Run skipped diese Order. Bei Mail-Fehler
 * wird die Order NICHT geflaggt → nächster Run versucht's nochmal.
 *
 * Trigger via VPS-Crontab täglich um 9 Uhr:
 *   0 9 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *     https://chromepeps.com/api/cron/review-requests
 *
 * Backup-Pfad: bei DELIVERED-Status-Wechsel im Admin-UI wird die Mail
 * bereits sofort verschickt (siehe /api/admin/orders/[id] PATCH-Handler).
 * Der Cron fängt nur Edge-Cases ab — Status-Wechsel ohne Mail-Send,
 * Status-Wechsel direkt in der DB, oder zukünftige Status-Quellen.
 *
 * AUDIT_REPORT_v3 §3.2.
 */

// Wieviele Tage NACH deliveredAt wir die Mail spätestens versenden.
// 7 Tage gibt dem Kunden Zeit das Produkt zu prüfen — kürzer wirkt
// drängend, länger riskiert dass die Erinnerung an die Bestellung
// schon weg ist.
const DELAY_DAYS = 7;

// Wieviele Mails maximal pro Cron-Run, damit ein einzelner Run nicht
// den Mail-Provider rate-limited oder die Funktion timed out.
const BATCH_LIMIT = 50;

export async function GET(req: NextRequest) {
  const authResult = checkCronAuth(req);
  if (authResult) return authResult;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DELAY_DAYS);

  // Kandidaten: DELIVERED, deliveredAt vor Cutoff, noch keine
  // Review-Request-Mail, kein Test-Order, hat einen User mit Email.
  const candidates = await db.order.findMany({
    where: {
      status: "DELIVERED",
      deliveredAt: { not: null, lte: cutoff },
      reviewRequestedAt: null,
      isTestOrder: false,
      userId: { not: null },
    },
    take: BATCH_LIMIT,
    orderBy: { deliveredAt: "asc" },
    include: {
      user: { select: { email: true, name: true } },
      items: {
        select: {
          productId: true,
          productName: true,
          variantName: true,
          product: { select: { slug: true } },
        },
      },
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://chromepeps.com";
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const order of candidates) {
    if (!order.user?.email) {
      skipped++;
      continue;
    }
    // De-dupe by product id — gleiche Logik wie im Admin-UI-Trigger,
    // damit der Customer nicht 3 Review-Buttons für 3 Varianten desselben
    // Peptides bekommt.
    const seen = new Set<string>();
    const products = order.items
      .filter((item) => {
        if (!item.productId) return false;
        if (seen.has(item.productId)) return false;
        seen.add(item.productId);
        return true;
      })
      .map((item) => {
        const slug = item.product?.slug;
        const reviewUrl = slug
          ? `${baseUrl}/products/${slug}#reviews`
          : baseUrl;
        return {
          name: item.productName,
          variant: item.variantName,
          reviewUrl,
        };
      });

    if (products.length === 0) {
      skipped++;
      continue;
    }

    try {
      const result = await sendReviewRequestEmail({
        to: order.user.email,
        customerName: order.user.name,
        orderNumber: order.orderNumber,
        products,
      });
      if (!result.success) {
        errors.push(
          `Order ${order.orderNumber}: ${result.error ?? "send failed"}`,
        );
        continue;
      }
      // Idempotenz-Marker setzen NACH erfolgreichem Send.
      await db.order.update({
        where: { id: order.id },
        data: { reviewRequestedAt: new Date() },
      });
      sent++;
    } catch (err) {
      errors.push(
        `Order ${order.orderNumber}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      candidatesFound: candidates.length,
      sent,
      skipped,
      errors: errors.slice(0, 10),
    },
  });
}

/**
 * Bearer-Auth-Check. Returnt eine NextResponse wenn nicht autorisiert,
 * `null` bei Erfolg. Spät-bindender CRON_SECRET-Lookup damit Build-Zeit
 * nicht gegen leere ENV failed.
 */
function checkCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        error:
          "CRON_SECRET nicht konfiguriert — Endpoint deaktiviert für Sicherheit.",
      },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }
  return null;
}
