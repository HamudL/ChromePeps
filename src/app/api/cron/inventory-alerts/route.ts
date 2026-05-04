import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendInventoryAlertEmail } from "@/lib/mail/send";
import type { LowStockItem } from "@/emails/inventory-alert";

/**
 * Cron-Endpoint: schickt eine Inventory-Alert-Mail an alle Admin-User,
 * wenn es Produkte oder Varianten gibt, deren stock auf oder unter
 * dem konfigurierten Threshold liegt.
 *
 * Schwelle: pro Produkt via `Product.lowStockThreshold` (Default 5).
 * Setze die Schwelle auf 0 um ein Produkt komplett aus dem Alert
 * auszuschließen (z.B. Bestseller wo Out-of-Stock häufig + akzeptabel).
 *
 * Authentifizierung via `Authorization: Bearer ${CRON_SECRET}`. Wenn
 * CRON_SECRET fehlt → 503.
 *
 * Anti-Spam: wenn keine Items unter threshold liegen, wird KEINE Mail
 * versendet — Admin bekommt nur dann Alerts wenn was zu tun ist.
 *
 * Trigger via VPS-Crontab täglich um 8 Uhr:
 *   0 8 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
 *     https://chromepeps.com/api/cron/inventory-alerts
 *
 * AUDIT_REPORT_v3 §4.8.
 */

export async function GET(req: NextRequest) {
  const authResult = checkCronAuth(req);
  if (authResult) return authResult;

  // Aktive Produkte holen — `where` mit `stock <= lowStockThreshold`
  // geht in Prisma nicht direkt (kein Cross-Column-Compare auf SQL-
  // Ebene über Prisma's Filter-API). Wir holen alle aktive Produkte
  // mit ihrem Threshold + Stock und filtern App-seitig. Bei 50+ Produkten
  // weiterhin trivial; falls auf 1000+ skaliert, raw query mit
  // `WHERE stock <= "lowStockThreshold"`.
  const products = await db.product.findMany({
    where: { isActive: true, lowStockThreshold: { gt: 0 } },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      lowStockThreshold: true,
      variants: {
        where: { isActive: true },
        select: { id: true, name: true, sku: true, stock: true },
      },
    },
  });

  const items: LowStockItem[] = [];

  for (const p of products) {
    if (p.variants.length > 0) {
      // Wenn das Produkt Varianten hat, gilt der Threshold auf
      // Varianten-Ebene. Das Produkt selbst hat dann meist stock=0
      // (alle Bestände leben in Varianten) und sollte nicht selbst
      // alerten.
      for (const v of p.variants) {
        if (v.stock <= p.lowStockThreshold) {
          items.push({
            name: `${p.name} — ${v.name}`,
            sku: v.sku,
            stock: v.stock,
            threshold: p.lowStockThreshold,
          });
        }
      }
    } else if (p.stock <= p.lowStockThreshold) {
      items.push({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        threshold: p.lowStockThreshold,
      });
    }
  }

  // Sortierung: out-of-stock zuerst, dann nach absolutem Stock aufsteigend.
  items.sort((a, b) => {
    if (a.stock === 0 && b.stock !== 0) return -1;
    if (a.stock !== 0 && b.stock === 0) return 1;
    return a.stock - b.stock;
  });

  if (items.length === 0) {
    return NextResponse.json({
      success: true,
      data: { count: 0, recipients: 0, sent: false },
    });
  }

  // Empfänger: alle Admin-User mit verifizierter Email.
  const admins = await db.user.findMany({
    where: { role: "ADMIN", emailVerified: { not: null } },
    select: { email: true },
  });
  const recipients = admins.map((a) => a.email).filter(Boolean);

  if (recipients.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        count: items.length,
        recipients: 0,
        sent: false,
        warning:
          "Keine ADMIN-User mit verifizierter Email gefunden — Alert wurde generiert aber nicht zugestellt.",
      },
    });
  }

  const result = await sendInventoryAlertEmail({
    to: recipients,
    items,
  });

  return NextResponse.json({
    success: result.success,
    data: {
      count: items.length,
      recipients: recipients.length,
      sent: result.success,
      ...(result.success ? {} : { error: result.error }),
    },
  });
}

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
