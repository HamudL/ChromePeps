import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    // No explicit apiVersion: the SDK pins its own bundled default
    // (currently "2026-03-25.dahlia" for stripe@22) and the TypeScript
    // types are narrowed to match exactly that version. Passing an
    // older string would immediately break the compile on every
    // SDK upgrade. If a specific API version needs to be overridden
    // for a rollout, add it back with `as Stripe.LatestApiVersion`.
    _stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return _stripe;
}

// Keep named export for backward compatibility — lazy getter via Proxy
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
