import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { generateOrderNumber } from "@/lib/order/generate-order-number";
import { calculateOrderTotals } from "@/lib/order/calculate-totals";
import { redeemPromo } from "@/lib/order/redeem-promo";
import { resolveShippingRate } from "@/lib/shipping/rates";

/**
 * Shared order-creation logic used by the Stripe webhook handler,
 * the /api/stripe/verify-session fallback, AND — since guest
 * checkout was added — both of those paths when the buyer has no
 * account. Extracted to avoid drift between the entry points: the
 * same transaction was previously inlined twice and had already
 * diverged (e.g. the webhook validated stock decrement underflow,
 * verify-session did not).
 *
 * Caller responsibilities:
 *   - authenticating the user OR validating the guestEmail/guestName
 *   - verifying the Stripe session (signature in webhook,
 *     payment_status check in verify-session)
 *   - collecting cart items:
 *       * for authenticated users: fetch the server-side cart
 *         (with product + variant relations) and pass it via `cart`
 *         WITH `cart.id` so this helper can clear cartItems after
 *         order creation
 *       * for guests: pass `cart.items` with the resolved product/
 *         variant info and omit `cart.id` — guests have no
 *         server-side cart so nothing to clear
 *   - checking whether an order already exists for this Stripe
 *     session id
 *   - opening a Prisma transaction
 *   - sending the order confirmation email after this helper
 *     returns (to guestEmail when present, otherwise to the user's
 *     account email)
 *
 * This function throws if any product or variant has insufficient
 * stock. Callers should be prepared to catch that: the webhook lets
 * the error bubble so Stripe retries; verify-session reports it to
 * the user and relies on out-of-band refund handling.
 */

type CartItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  product: {
    name: string;
    sku: string;
    priceInCents: number;
  };
  variant:
    | {
        name: string;
        sku: string;
        priceInCents: number;
      }
    | null;
};

export type CartForOrder = {
  /**
   * Present only for authenticated users — it's the Cart row id in
   * the DB. When set, the helper clears all cartItems at the end
   * of the transaction so the user's cart is empty after a
   * successful order. Omit for guest checkout.
   */
  id?: string;
  items: Array<CartItem>;
};

export type CreateOrderFromStripeArgs = {
  tx: Prisma.TransactionClient;
  /**
   * User id for an authenticated order, null for a guest. Exactly
   * one of `userId` or `guestEmail` must be set; callers enforce
   * this before calling us.
   */
  userId: string | null;
  /**
   * Guest-order email — present only when userId is null. Doubles
   * as the redemption key for "one use per email" promo checks
   * (see promo-applicability.ts).
   */
  guestEmail?: string | null;
  guestName?: string | null;
  stripeSession: Stripe.Checkout.Session;
  cart: CartForOrder;
  shippingAddressId: string | null;
};

export async function createOrderFromStripeSession(
  args: CreateOrderFromStripeArgs
) {
  const {
    tx,
    stripeSession,
    cart,
    shippingAddressId,
  } = args;

  // Auth-Recovery: wenn der Caller eine userId mitgibt, der User aber
  // nicht mehr existiert (Account zwischen Stripe-Bezahlung und
  // diesem Aufruf gelöscht — Phase 8 Edge-Case), kippen wir den Order
  // auf einen Gast-Recovery-Modus statt mit FK-Constraint zu crashen.
  // Stripe-customer_details kommen direkt vom Stripe-Server nach der
  // Bezahlung und enthalten Email + Name — exakt was wir für den
  // Gast-Pfad brauchen.
  let userId = args.userId;
  let guestEmail = args.guestEmail ?? null;
  let guestName = args.guestName ?? null;
  let recoveryNote: string | null = null;

  if (userId) {
    const userStillExists = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userStillExists) {
      const stripeEmail =
        stripeSession.customer_details?.email ??
        stripeSession.customer_email ??
        null;
      const stripeName = stripeSession.customer_details?.name ?? null;

      console.warn(
        `[order] Auth-Recovery: userId=${userId} existiert nicht mehr, fallback auf guest-flow (stripeSession=${stripeSession.id})`,
      );

      userId = null;
      guestEmail =
        stripeEmail ?? `recovery-${stripeSession.id}@deleted.local`;
      guestName = stripeName ?? "Konto-Recovery";
      recoveryNote =
        "[Auto-Recovery] Käufer-Konto wurde während der Bezahlung gelöscht — Bestellung wurde als Gast-Order angelegt.";
    }
  }

  if (!userId && !guestEmail) {
    throw new Error(
      "createOrderFromStripeSession: either userId or guestEmail must be set"
    );
  }

  // Build order items + subtotal from the cart.
  let subtotalInCents = 0;
  const orderItems = cart.items.map((item) => {
    const price = item.variant?.priceInCents ?? item.product.priceInCents;
    const sku = item.variant?.sku ?? item.product.sku;
    subtotalInCents += price * item.quantity;
    return {
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      variantName: item.variant?.name ?? null,
      sku,
      quantity: item.quantity,
      priceInCents: price,
    };
  });

  // Promo data flows in through the Stripe session metadata set during
  // checkout creation.
  const promoId = stripeSession.metadata?.promoId ?? null;
  const promoCodeStr = stripeSession.metadata?.promoCode ?? null;
  const rawDiscount =
    parseInt(stripeSession.metadata?.discountAmount ?? "0") || 0;

  // Lieferland-Versandtarif resolven, damit der Order-Eintrag exakt dem
  // entspricht, was Stripe als Shipping-Line-Item abgebucht hat. Ohne
  // diesen Lookup würde calculateOrderTotals den DE-Default (5,99 €)
  // einsetzen — der Customer hätte 5,99 € auf seiner Rechnung stehen,
  // obwohl Stripe z.B. 12,99 € abgebucht hat (kostspieliger Bug bei
  // Liefer-Ländern außerhalb DE).
  let baseShippingInCents: number | undefined;
  if (shippingAddressId) {
    const address = await tx.address.findUnique({
      where: { id: shippingAddressId },
      select: { country: true },
    });
    if (address?.country) {
      const rate = await resolveShippingRate(address.country);
      if (rate) baseShippingInCents = rate.priceInCents;
    }
  }

  // Delegate the math to the shared pure helper so Stripe, bank-transfer,
  // and the verify-session fallback all produce byte-identical totals.
  let totals = calculateOrderTotals({
    subtotalInCents,
    discountInCents: rawDiscount,
    baseShippingInCents,
  });

  // Reconcile gegen Stripe: amount_total ist, was der Kunde WIRKLICH
  // bezahlt hat. Unsere Neuberechnung kann davon abweichen, wenn sich
  // zwischen Session-Erstellung und Webhook Preise/Versandtarife
  // geändert haben. Rechnung und USt-Ausweis müssen dem kassierten
  // Betrag folgen, nicht dem aktuellen Katalogpreis — sonst weist die
  // §14-UStG-Rechnung einen anderen Betrag aus als die Kreditkarte.
  let reconcileNote: string | null = null;
  const paidTotal = stripeSession.amount_total;
  if (typeof paidTotal === "number" && paidTotal !== totals.totalInCents) {
    const paidDiscount =
      stripeSession.total_details?.amount_discount ?? totals.discountInCents;
    // Versand steckt je nach Session-Alter im Line-Item (legacy, vor dem
    // shipping_options-Umbau) oder in shipping_options. Unterscheidung
    // über session.shipping_cost: das Objekt existiert NUR bei Sessions
    // mit shipping_options — dann ist amount_total autoritativ, AUCH
    // wenn er 0 ist (legitimer Gratis-Versand; ein `> 0`-Check fiele
    // hier fälschlich auf den neu berechneten Tarif zurück und wiese
    // nie bezahlte Versandkosten auf der Rechnung aus). Legacy-Sessions
    // ohne shipping_cost behalten den berechneten Wert.
    const paidShipping = stripeSession.shipping_cost
      ? stripeSession.shipping_cost.amount_total
      : totals.shippingInCents;
    const taxInCents = Math.round(paidTotal - paidTotal / 1.19);
    reconcileNote =
      `[Reconcile] Stripe-Charge (${(paidTotal / 100).toFixed(2)} €) wich von der ` +
      `Neuberechnung (${(totals.totalInCents / 100).toFixed(2)} €) ab — ` +
      `Order übernimmt die tatsächlich kassierten Stripe-Beträge.`;
    console.warn(
      `[order] total mismatch for session ${stripeSession.id}: ` +
        `computed=${totals.totalInCents} paid=${paidTotal} — using Stripe amounts`
    );
    totals = {
      subtotalInCents: totals.subtotalInCents,
      discountInCents: paidDiscount,
      shippingInCents: paidShipping,
      totalInCents: paidTotal,
      taxInCents,
    };
  }

  const order = await tx.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      guestEmail: userId ? null : guestEmail ?? null,
      guestName: userId ? null : guestName ?? null,
      status: "PROCESSING",
      paymentStatus: "SUCCEEDED",
      stripeSessionId: stripeSession.id,
      stripePaymentIntentId:
        typeof stripeSession.payment_intent === "string"
          ? stripeSession.payment_intent
          : stripeSession.payment_intent?.id ?? null,
      subtotalInCents: totals.subtotalInCents,
      discountInCents: totals.discountInCents,
      promoCode: promoCodeStr,
      taxInCents: totals.taxInCents,
      shippingInCents: totals.shippingInCents,
      totalInCents: totals.totalInCents,
      shippingAddressId: shippingAddressId ?? null,
      billingAddressId: shippingAddressId ?? null,
      items: { createMany: { data: orderItems } },
      events: {
        create: {
          status: "PROCESSING",
          note: [
            promoCodeStr
              ? `Payment confirmed via Stripe (Promo: ${promoCodeStr})`
              : "Payment confirmed via Stripe",
            recoveryNote,
            reconcileNote,
          ]
            .filter(Boolean)
            .join(" — "),
        },
      },
    },
  });

  // Best-Effort-Einlösung (post-payment): das Geld ist bereits MIT
  // Rabatt kassiert — eine vorhandene Einlösung darf die Order nicht
  // scheitern lassen. Pre-Check/Race-Verhalten: siehe redeemPromo. Das
  // OrderEvent für den "bereits eingelöst"-Fall schreibt weiterhin
  // dieser Caller anhand des Rückgabewerts.
  if (promoId) {
    const { redeemed } = await redeemPromo(tx, {
      promoId,
      userId,
      guestEmail,
      orderId: order.id,
      discountInCents: totals.discountInCents,
      maxUses: null,
      mode: "bestEffort",
    });
    if (!redeemed) {
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: "PROCESSING",
          note: `Promo "${promoCodeStr}" war bereits durch einen parallelen Checkout eingelöst — Rabatt blieb bestehen (bereits kassiert), aber keine zweite Einlösung gezählt.`,
        },
      });
    }
  }

  // Decrement stock atomically via CAS (`stock >= qty` in the WHERE).
  // WICHTIG: Bei CAS-Fehlschlag wird NICHT mehr geworfen. Das Geld ist
  // zu diesem Zeitpunkt bereits kassiert — ein Throw ließ den Webhook
  // mit 500 antworten, Stripe retried endlos und es entstand NIE eine
  // Order (Geld ohne Bestellung). Stattdessen: Order entsteht immer;
  // im Übersell-Fall wird UNKONDITIONAL um die volle Menge dekrementiert
  // (Bestand darf negativ werden). Warum nicht auf 0 klemmen? Refund/
  // Cancel buchen später die VOLLE item.quantity zurück — eine Klemmung
  // hätte weniger entnommen als restauriert wird und damit pro Übersell
  // Phantom-Inventar erzeugt. Negativ verhält sich für alle Kauf-Pfade
  // wie 0 (überall `stock >= qty`-Guards) und ist für den Admin ein
  // sichtbares Übersell-Signal; zusätzlich OrderEvent + Error-Log.
  const oversold: string[] = [];
  for (const item of cart.items) {
    if (item.variantId) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        oversold.push(
          `${item.product.name}${item.variant ? ` (${item.variant.name})` : ""} ×${item.quantity}`
        );
        await tx.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    } else {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        oversold.push(`${item.product.name} ×${item.quantity}`);
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
  }
  if (oversold.length > 0) {
    console.error(
      `[order] OVERSOLD on paid order ${order.orderNumber}: ${oversold.join(", ")} — manual fulfillment check required`
    );
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: "PROCESSING",
        note: `⚠ Übersell: Für ${oversold.join(", ")} reichte der Lagerbestand beim Zahlungseingang nicht mehr aus. Zahlung ist kassiert — bitte Bestand/Erfüllbarkeit prüfen (ggf. nachbestellen oder erstatten).`,
      },
    });
  }

  // Clear the user's cart inside the transaction so a crash between order
  // creation and cart clear doesn't leave stale items behind. Skip for
  // guests — they have no server-side cart row (their cart only exists
  // in the client-side Zustand store which we can't touch from here).
  //
  // WICHTIG: Nur die BESTELLTEN Positionen löschen, nicht den ganzen
  // Cart. Seit die Order aus dem Metadata-Snapshot gebaut wird, kann
  // der Live-Cart neuere Items enthalten (zweiter Tab während der
  // Stripe-Bezahlung) — ein pauschales deleteMany würde diese Items
  // verschlucken, obwohl sie weder bestellt noch bezahlt wurden.
  if (cart.id) {
    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        OR: cart.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
        })),
      },
    });
  }

  return order;
}
