import type { Prisma } from "@prisma/client";

/**
 * Statusbewusster Stock-Restore für Cancel (Admin) und Voll-Refund
 * (Stripe-Webhook) — EINE Policy-Quelle statt zweier driftender Kopien.
 *
 * Policy (beide Trigger):
 *  - Test-Orders haben nie Bestand dekrementiert (siehe
 *    /api/admin/orders/test) → dürfen auch nichts re-incrementen,
 *    sonst entsteht Phantom-Inventar pro gecancelter Test-Order.
 *  - stockRestoredAt schützt gegen Doppel-Restore bei Status-Flapping
 *    (CANCELLED → PROCESSING → CANCELLED) und gegen Refund-nach-Cancel
 *    bzw. Cancel-nach-Refund — beide Pfade prüfen dasselbe Feld.
 *  - DELIVERED restauriert NIE automatisch: die Ware liegt beim Kunden —
 *    ein Kulanz-Refund/Cancel ohne Warenrücksendung würde sonst Bestand
 *    erzeugen, der physisch nie zurückkommt. Bei echter Retoure bucht
 *    der Admin manuell nach.
 *
 * Zusätzlich bei trigger "cancel": Restore nur aus PENDING/PROCESSING/
 * SHIPPED — Stock wird bei JEDER echten Order schon bei der Erstellung
 * dekrementiert (Stripe → PROCESSING, Vorkasse → PENDING als
 * Reservierung), terminale Status (CANCELLED/REFUNDED/ARCHIVED) haben
 * den Bestand bereits zurückgebucht.
 *
 * `order.status` muss der PRE-Update-Status sein (vor dem Kipp auf
 * CANCELLED/REFUNDED). Setzt stockRestoredAt im selben tx — Caller
 * dürfen das Feld NICHT mehr selbst schreiben. Returnt den gesetzten
 * Marker-Timestamp (oder null wenn nicht restauriert): steuert
 * OrderEvent-Note und Cache-Invalidierung beim Caller, und Routen
 * können den Wert in ihr Response-Objekt mergen, damit der API-
 * Consumer nach einem Cancel nicht fälschlich stockRestoredAt=null
 * liest, obwohl der Restore committed wurde.
 */
export interface RestorableOrder {
  id: string;
  status: string;
  isTestOrder: boolean;
  stockRestoredAt: Date | null;
  items: Array<{
    productId: string | null;
    variantId: string | null;
    quantity: number;
  }>;
}

const CANCEL_RESTORABLE_STATUSES = ["PENDING", "PROCESSING", "SHIPPED"];

export async function restoreOrderStock(
  tx: Prisma.TransactionClient,
  order: RestorableOrder,
  opts: { trigger: "cancel" | "refund" }
): Promise<Date | null> {
  if (order.isTestOrder) return null;
  if (order.stockRestoredAt) return null;
  if (order.status === "DELIVERED") return null;
  if (
    opts.trigger === "cancel" &&
    !CANCEL_RESTORABLE_STATUSES.includes(order.status)
  ) {
    return null;
  }

  // Restore pro Item (skip wenn product/variant hard-deleted wurde —
  // daher `.catch(() => {})` einzeln pro Update). Promise.all bündelt
  // den Client-Side-Encode-Overhead; Postgres führt die Statements in
  // der interactive transaction trotzdem seriell aus, die catch-
  // Isolation pro Update bleibt erhalten.
  await Promise.all(
    order.items.map((item) => {
      if (item.variantId) {
        return tx.productVariant
          .update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })
          .catch(() => {});
      }
      if (item.productId) {
        return tx.product
          .update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
          .catch(() => {});
      }
      return Promise.resolve();
    })
  );

  // Doppel-Restore-Marker im selben tx — atomar mit den Inkrementen.
  const restoredAt = new Date();
  await tx.order.update({
    where: { id: order.id },
    data: { stockRestoredAt: restoredAt },
  });

  return restoredAt;
}
