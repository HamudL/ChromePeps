import "server-only";
import type { Prisma } from "@prisma/client";
import { isPrismaUniqueError } from "@/lib/db";

/**
 * Invoice number allocator — UStG §14 compliant (fortlaufend, lueckenlos).
 *
 * Format: `CP-RE-YYYY-NNNN` where NNNN is a zero-padded counter that
 * restarts at 1 every calendar year.
 *
 * Allocation strategy:
 *   1. Ensure an `Invoice` row exists for the given order. If one already
 *      exists, return it (idempotent — callers can call this any number of
 *      times without creating duplicates).
 *   2. Otherwise find the highest `seq` for the current year and INSERT the
 *      next number. The composite unique index `(year, seq)` guarantees
 *      that concurrent writers cannot pick the same number — the loser
 *      retries.
 *
 * This function is safe to call inside or outside a transaction. Callers
 * should still pass the same Prisma client handle to keep allocation and
 * downstream work atomic when possible.
 */

const MAX_RETRIES = 5;

// Rechnungsdatum und Nummernkreis-Jahr MÜSSEN aus derselben Zeitzone
// abgeleitet werden (UStG §14, lückenlose Nummerierung). Das PDF rendert das
// Datum in Europe/Berlin — also muss auch das Jahr des Nummernkreises aus der
// Berliner Ortszeit stammen, sonst kann eine am 01.01. kurz nach Mitternacht
// (Berlin, = 31.12. UTC) erzeugte Rechnung eine Nummer aus dem Vorjahr tragen,
// während das PDF bereits das neue Jahr anzeigt.
export const INVOICE_TIME_ZONE = "Europe/Berlin";

function berlinYear(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: INVOICE_TIME_ZONE,
      year: "numeric",
    }).format(date)
  );
}

function formatInvoiceNumber(year: number, seq: number): string {
  const padded = seq.toString().padStart(4, "0");
  return `CP-RE-${year}-${padded}`;
}

type PrismaClientLike = Prisma.TransactionClient | {
  invoice: Prisma.TransactionClient["invoice"];
  $transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>;
};

export interface AllocatedInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  year: number;
  seq: number;
  issuedAt: Date;
}

/**
 * Returns the existing invoice for the order, or allocates a new one.
 * Uses a small retry loop to survive the (rare) race where two writers
 * land on the same seq.
 */
export async function getOrCreateInvoice(
  db: PrismaClientLike,
  orderId: string,
  now: Date = new Date()
): Promise<AllocatedInvoice> {
  // Fast path: return the existing invoice if there is one.
  const existing = await db.invoice.findUnique({ where: { orderId } });
  if (existing) return existing;

  const year = berlinYear(now);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const last = await db.invoice.findFirst({
      where: { year },
      orderBy: { seq: "desc" },
      select: { seq: true },
    });
    const nextSeq = (last?.seq ?? 0) + 1;
    const invoiceNumber = formatInvoiceNumber(year, nextSeq);

    try {
      const created = await db.invoice.create({
        data: {
          orderId,
          year,
          seq: nextSeq,
          invoiceNumber,
          issuedAt: now,
        },
      });
      return created;
    } catch (err: unknown) {
      if (!isPrismaUniqueError(err)) throw err;

      // Another writer may have grabbed this (year, seq) OR the orderId
      // unique constraint fired because a sibling request already inserted
      // an invoice for this order. Re-check the orderId path and retry.
      const maybeExisting = await db.invoice.findUnique({ where: { orderId } });
      if (maybeExisting) return maybeExisting;
      // Otherwise fall through and retry with a new seq.
    }
  }

  throw new Error(
    `Failed to allocate invoice number for order ${orderId} after ${MAX_RETRIES} retries`
  );
}
