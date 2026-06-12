import type { Prisma } from "@prisma/client";

/**
 * Promo-Einlösung innerhalb einer Order-Transaktion — zwei bewusst
 * unterschiedliche Semantiken, weil der Zeitpunkt relativ zur Zahlung
 * das Fehlerverhalten diktiert:
 *
 * "strict" (Vorkasse, PRE-payment): Es ist noch kein Geld geflossen —
 * Abbruch ist die korrekte Antwort auf jede Anomalie. Die DB-Uniques
 * @@unique([promoId, userId]) / @@unique([promoId, guestEmail]) fangen
 * Doppel-Einlösungen unter Nebenläufigkeit (P2002 propagiert zum
 * Caller → 400); das usedCount-CAS gegen maxUses erzwingt das globale
 * Limit, das sonst nur check-then-increment wäre — bei Erschöpfung
 * wirft der Helper Error("PROMO_EXHAUSTED").
 *
 * "bestEffort" (Stripe, POST-payment): Das Geld ist bereits MIT Rabatt
 * kassiert — eine vorhandene Einlösung darf die Order nicht scheitern
 * lassen. Pre-Check in der Transaktion → bei vorhandener Row keine
 * zweite Einlösung, return { redeemed: false }; der Caller schreibt
 * dann nur Paper-Trail. (Kein try/catch um den create: ein P2002 ist
 * ein Postgres-Fehler und würde die gesamte Transaktion poisonen. Der
 * verbleibende echte Gleichzeitigkeits-Rest heilt über den Stripe-
 * Webhook-Retry: die abgebrochene Transaktion wird wiederholt und
 * sieht dann die Row.) Increment hier plain, ohne maxUses-CAS — das
 * Limit wurde beim Session-Create geprüft, nachträglich ablehnen geht
 * nicht mehr.
 */
export async function redeemPromo(
  tx: Prisma.TransactionClient,
  args: {
    promoId: string;
    userId: string | null;
    guestEmail: string | null;
    orderId: string;
    discountInCents: number;
    maxUses: number | null;
    mode: "strict" | "bestEffort";
  }
): Promise<{ redeemed: boolean }> {
  const { promoId, userId, guestEmail, orderId, discountInCents, maxUses } =
    args;

  if (args.mode === "bestEffort") {
    const existingUsage = await tx.promoUsage.findFirst({
      where: userId
        ? { promoId, userId }
        : { promoId, guestEmail: guestEmail ?? "" },
      select: { id: true },
    });
    if (existingUsage) return { redeemed: false };

    await tx.promoUsage.create({
      data: {
        promoId,
        userId,
        guestEmail: userId ? null : guestEmail,
        orderId,
        discountAmount: discountInCents,
      },
    });
    await tx.promoCode.update({
      where: { id: promoId },
      data: { usedCount: { increment: 1 } },
    });
    return { redeemed: true };
  }

  // strict
  await tx.promoUsage.create({
    data: {
      promoId,
      userId,
      guestEmail: userId ? null : guestEmail,
      orderId,
      discountAmount: discountInCents,
    },
  });
  const bumped = await tx.promoCode.updateMany({
    where: {
      id: promoId,
      ...(maxUses !== null ? { usedCount: { lt: maxUses } } : {}),
    },
    data: { usedCount: { increment: 1 } },
  });
  if (bumped.count === 0) {
    throw new Error("PROMO_EXHAUSTED");
  }
  return { redeemed: true };
}
