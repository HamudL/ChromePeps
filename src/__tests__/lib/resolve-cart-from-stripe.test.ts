import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

/**
 * resolveCartFromStripeSession — TOCTOU-sichere Cart-Rekonstruktion:
 *  - PRIMÄR der guestItems-Metadata-Snapshot (exakt das Bezahlte)
 *  - Auth-Orders hängen nur noch die Cart-id fürs Leeren an
 *  - Legacy-Fallback (Sessions ohne Snapshot) liest den Live-Cart
 *  - Sicherheits-Checks: kaputtes JSON, gelöschte Produkte, fremde
 *    Varianten (variant.productId !== p) werden verworfen
 */
const { productFindManyMock, variantFindManyMock, cartFindUniqueMock } =
  vi.hoisted(() => ({
    productFindManyMock: vi.fn(),
    variantFindManyMock: vi.fn(),
    cartFindUniqueMock: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: productFindManyMock },
    productVariant: { findMany: variantFindManyMock },
    cart: { findUnique: cartFindUniqueMock },
  },
}));

import { resolveCartFromStripeSession } from "@/lib/order/resolve-cart-from-stripe";

function makeSession(
  metadata: Record<string, string> | null
): Stripe.Checkout.Session {
  return { metadata } as unknown as Stripe.Checkout.Session;
}

function snapshotSession(
  items: unknown,
  extra: Record<string, string> = {}
): Stripe.Checkout.Session {
  return makeSession({ guestItems: JSON.stringify(items), ...extra });
}

const dbProductA = { id: "p1", name: "BPC-157", sku: "BPC-5", priceInCents: 4999 };
const dbVariantA = {
  id: "v1",
  productId: "p1",
  name: "10mg",
  sku: "BPC-10",
  priceInCents: 8999,
};

beforeEach(() => {
  vi.clearAllMocks();
  productFindManyMock.mockResolvedValue([dbProductA]);
  variantFindManyMock.mockResolvedValue([dbVariantA]);
  cartFindUniqueMock.mockResolvedValue(null);
});

describe("Snapshot-Pfad (primär)", () => {
  it("Gast-Snapshot ohne Variante → Items gemappt, keine Cart-id", async () => {
    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p1", v: null, q: 2 }])
    );

    expect(result).toEqual({
      items: [
        {
          productId: "p1",
          variantId: null,
          quantity: 2,
          product: { name: "BPC-157", sku: "BPC-5", priceInCents: 4999 },
          variant: null,
        },
      ],
    });
    expect(cartFindUniqueMock).not.toHaveBeenCalled();
    // Ohne Varianten-Referenzen wird kein Varianten-Query gefeuert.
    expect(variantFindManyMock).not.toHaveBeenCalled();
  });

  it("Variante wird mit Preis/SKU gemappt, wenn sie zum Produkt gehört", async () => {
    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p1", v: "v1", q: 1 }])
    );

    expect(result?.items[0]).toMatchObject({
      variantId: "v1",
      variant: { name: "10mg", sku: "BPC-10", priceInCents: 8999 },
    });
  });

  it("Auth-Order: Cart-id fürs spätere Leeren wird angehängt", async () => {
    cartFindUniqueMock.mockResolvedValue({ id: "cart_77" });

    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p1", v: null, q: 1 }], { userId: "user_1" })
    );

    expect(result?.id).toBe("cart_77");
    expect(cartFindUniqueMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      select: { id: true },
    });
  });

  it("Auth-Order ohne Cart-Row → Snapshot ohne id (Order trotzdem möglich)", async () => {
    cartFindUniqueMock.mockResolvedValue(null);

    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p1", v: null, q: 1 }], { userId: "user_1" })
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBeUndefined();
  });

  it("filtert kaputte Einträge: q<=0, falsche Typen; q wird gefloort, v:'' wird null", async () => {
    const result = await resolveCartFromStripeSession(
      snapshotSession([
        { p: "p1", v: "", q: 2.9 }, // ok → v null, q 2
        { p: "p1", v: null, q: 0 }, // q<=0 → raus
        { p: 123, v: null, q: 1 }, // p kein String → raus
        { p: "p1", v: 42, q: 1 }, // v weder null noch String → raus
        { p: "p1" }, // q fehlt → raus
      ])
    );

    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({
      productId: "p1",
      variantId: null,
      quantity: 2,
    });
  });

  it("Varianten-Mixing-Abwehr: Variante eines ANDEREN Produkts wird verworfen", async () => {
    productFindManyMock.mockResolvedValue([
      dbProductA,
      { id: "p2", name: "Teuer", sku: "T-1", priceInCents: 99999 },
    ]);
    // v1 gehört zu p1 — der Snapshot referenziert sie für p2.
    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p2", v: "v1", q: 1 }])
    );

    expect(result).toBeNull();
  });

  it("referenzierte, aber gelöschte Variante → Item verworfen", async () => {
    variantFindManyMock.mockResolvedValue([]);
    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p1", v: "v_deleted", q: 1 }])
    );
    expect(result).toBeNull();
  });

  it("Snapshot zeigt nur auf gelöschte Produkte → null", async () => {
    productFindManyMock.mockResolvedValue([]);
    const result = await resolveCartFromStripeSession(
      snapshotSession([{ p: "p_deleted", v: null, q: 1 }])
    );
    expect(result).toBeNull();
  });

  it.each([
    ["kaputtes JSON", "{nicht json"],
    ["JSON, aber kein Array", JSON.stringify({ p: "p1" })],
    ["leeres Array", "[]"],
    ["leerer String", ""],
  ])("unbrauchbarer Snapshot (%s) → null für Gäste", async (_label, raw) => {
    const result = await resolveCartFromStripeSession(
      makeSession({ guestItems: raw })
    );
    expect(result).toBeNull();
  });
});

describe("Legacy-Fallback (Live-Cart, nur Auth)", () => {
  it("Session ohne Snapshot + Auth-User mit Cart → Live-Cart-Items gemappt", async () => {
    cartFindUniqueMock.mockResolvedValue({
      id: "cart_legacy",
      items: [
        {
          productId: "p1",
          variantId: "v1",
          quantity: 1,
          product: { name: "BPC-157", sku: "BPC-5", priceInCents: 4999 },
          variant: { name: "10mg", sku: "BPC-10", priceInCents: 8999 },
        },
        {
          productId: "p1",
          variantId: null,
          quantity: 3,
          product: { name: "BPC-157", sku: "BPC-5", priceInCents: 4999 },
          variant: null,
        },
      ],
    });

    const result = await resolveCartFromStripeSession(
      makeSession({ userId: "user_1" })
    );

    expect(result?.id).toBe("cart_legacy");
    expect(result?.items).toHaveLength(2);
    expect(result?.items[0].variant).toEqual({
      name: "10mg",
      sku: "BPC-10",
      priceInCents: 8999,
    });
    expect(result?.items[1].variant).toBeNull();
  });

  it("Auth-User mit leerem Live-Cart → null", async () => {
    cartFindUniqueMock.mockResolvedValue({ id: "cart_empty", items: [] });
    const result = await resolveCartFromStripeSession(
      makeSession({ userId: "user_1" })
    );
    expect(result).toBeNull();
  });

  it("Auth-User ohne Cart-Row → null", async () => {
    cartFindUniqueMock.mockResolvedValue(null);
    const result = await resolveCartFromStripeSession(
      makeSession({ userId: "user_1" })
    );
    expect(result).toBeNull();
  });

  it("Gast ohne Snapshot (metadata leer/null) → null ohne DB-Zugriff", async () => {
    await expect(
      resolveCartFromStripeSession(makeSession(null))
    ).resolves.toBeNull();
    await expect(
      resolveCartFromStripeSession(makeSession({}))
    ).resolves.toBeNull();
    expect(cartFindUniqueMock).not.toHaveBeenCalled();
    expect(productFindManyMock).not.toHaveBeenCalled();
  });
});
