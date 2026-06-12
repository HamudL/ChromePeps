import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Lazy-Stripe-Client: fail-fast ohne STRIPE_SECRET_KEY, Singleton
 * danach, und der Proxy-Export delegiert auf den lazy Client.
 * Modul-State (Cache) → frischer Import pro Test.
 */
async function importStripe() {
  vi.resetModules();
  return import("@/lib/stripe");
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getStripe", () => {
  it("wirft sofort, wenn STRIPE_SECRET_KEY fehlt (fail-fast statt späterem 401)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { getStripe } = await importStripe();
    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is not set");
  });

  it("cached die Instanz (Singleton über mehrere Aufrufe)", async () => {
    const { getStripe } = await importStripe();
    const first = getStripe();
    expect(getStripe()).toBe(first);
  });
});

describe("stripe (Proxy-Export)", () => {
  it("delegiert Property-Zugriffe lazy auf den echten Client", async () => {
    const mod = await importStripe();
    // Erst der Property-Zugriff instanziiert den Client.
    expect(mod.stripe.coupons).toBe(mod.getStripe().coupons);
  });
});
