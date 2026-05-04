import "server-only";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { stripe } from "@/lib/stripe";

/**
 * Holt (oder erzeugt + cached) den Stripe-Coupon für einen PromoCode,
 * race-safe über Redis-Lock.
 *
 * Problem ohne Lock (AUDIT_REPORT_v3 §3.5):
 * Zwei parallele Checkouts mit derselben fresh-erstellten PromoCode-ID
 * (`stripeCouponId === null`) ginge beide gleichzeitig durch den
 * "if not cached → stripe.coupons.create"-Pfad. Resultat: zwei Stripe-
 * Coupons mit gleicher Beschreibung, einer überlebt im DB-Cache, der
 * andere ist Orphan-Müll im Stripe-Dashboard.
 *
 * Lösung — atomic SETNX mit 30s Expiry + DB-Recheck-Loop:
 *  1. Lock-Versuch via `SET key NX EX 30`. Atomisch.
 *  2. Wer den Lock kriegt: stripe.coupons.create + DB.update + lock-release.
 *  3. Wer den Lock NICHT kriegt: kurz warten (poll DB), wenn andere
 *     Worker fertig ist (stripeCouponId in DB gesetzt), nutze deren
 *     Resultat. Spinning für max 6×500ms = 3s.
 *
 * Fail-open: wenn Redis nicht erreichbar (Lock-SET schlägt fehl), fällt
 * die Funktion auf das nicht-locked Verhalten zurück. Race-Risiko bleibt,
 * aber Site läuft. Besser als hard-fail bei Redis-Outage.
 */

interface PromoForCoupon {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  stripeCouponId: string | null;
}

const LOCK_TTL_SECONDS = 30;
const POLL_INTERVAL_MS = 500;
const POLL_MAX_ATTEMPTS = 6; // 3s gesamt

export async function getOrCreateStripeCoupon(
  promo: PromoForCoupon,
): Promise<string> {
  // Fast-Path: Coupon ist schon in DB gecached
  if (promo.stripeCouponId) return promo.stripeCouponId;

  const lockKey = `stripe:coupon:lock:${promo.code.toLowerCase()}`;

  // Lock-Versuch
  let lockAcquired = false;
  try {
    const result = await redis.set(lockKey, "1", "EX", LOCK_TTL_SECONDS, "NX");
    lockAcquired = result === "OK";
  } catch (err) {
    // Redis nicht erreichbar — fail-open auf altes Verhalten
    console.warn(
      "[stripe-coupon] Redis-Lock SETNX failed, falling back to non-locked create:",
      err instanceof Error ? err.message : err,
    );
  }

  if (!lockAcquired) {
    // Anderer Worker hat den Lock — poll DB für sein Ergebnis
    for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
      await sleep(POLL_INTERVAL_MS);
      const fresh = await db.promoCode.findUnique({
        where: { id: promo.id },
        select: { stripeCouponId: true },
      });
      if (fresh?.stripeCouponId) return fresh.stripeCouponId;
    }
    // Timeout — der andere Worker hat's nicht geschafft. Fall-through
    // zum eigenen Create-Versuch (Race verbleibt, aber besser als Fail).
    console.warn(
      `[stripe-coupon] Lock-Wait timed out für promo "${promo.code}", creating own coupon.`,
    );
  }

  try {
    const coupon = await createStripeCoupon(promo);
    await db.promoCode.update({
      where: { id: promo.id },
      data: { stripeCouponId: coupon.id },
    });
    return coupon.id;
  } finally {
    if (lockAcquired) {
      try {
        await redis.del(lockKey);
      } catch {
        // ignore — TTL räumt's eh weg
      }
    }
  }
}

function createStripeCoupon(promo: PromoForCoupon): Promise<Stripe.Coupon> {
  const name = `Promo: ${promo.code.toUpperCase()}`;
  if (promo.discountType === "PERCENTAGE") {
    return stripe.coupons.create({
      percent_off: promo.discountValue,
      duration: "once",
      name,
    });
  }
  return stripe.coupons.create({
    amount_off: promo.discountValue,
    currency: "eur",
    duration: "once",
    name,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
