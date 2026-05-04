import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Stripe-Webhook-Route-Tests.
 *
 * AUDIT_REPORT_v3 §6 PR 3.
 *
 * Wir mocken:
 *  - `next/headers` → für den `headers()`-Call der die stripe-signature liest
 *  - `@/lib/stripe` → constructEvent kontrollieren wir, kein echtes Crypto
 *  - `@/lib/db` → Prisma-DB durch in-Memory-Stubs ersetzen
 *  - `@/lib/redis` → cacheDel als no-op
 *  - `@/lib/rate-limit` → immer success damit der Test-Pfad nicht blockiert
 *  - `@/lib/order/*` und `@/lib/mail/send` → Helper sind eigene Tests
 *
 * Die Tests konzentrieren sich auf die ROUTING- und IDEMPOTENZ-Logik
 * (was passiert wenn signature fehlt, was bei Duplicate-Event, welcher
 * Handler wird je Event-Type gerufen). Die Handler-Internals (Stock-
 * Restore, Mail-Send etc.) haben eigene Tests in den jeweiligen Helper-
 * Files bzw. werden hier nur per spy verifiziert.
 */

// ============================================================
// Setup mocks BEFORE importing the route under test.
// ============================================================

const headersMock = {
  get: vi.fn((name: string): string | null =>
    name === "stripe-signature" ? "valid-test-sig" : null,
  ),
};

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(headersMock),
}));

const constructEventMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => constructEventMock(...args) },
  },
}));

// In-Memory-DB-Stubs. Tests reseten/reinitialisieren in beforeEach.
const stripeEventCreate = vi.fn();
const stripeEventDelete = vi.fn();
const orderFindUnique = vi.fn();
const orderUpdate = vi.fn();
const orderEventCreate = vi.fn();
const productVariantUpdate = vi.fn();
const productUpdate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    stripeEvent: {
      create: (args: unknown) => stripeEventCreate(args),
      delete: (args: unknown) => stripeEventDelete(args),
    },
    order: {
      findUnique: (args: unknown) => orderFindUnique(args),
      update: (args: unknown) => orderUpdate(args),
    },
    orderEvent: {
      create: (args: unknown) => orderEventCreate(args),
    },
    productVariant: {
      update: (args: unknown) => productVariantUpdate(args),
    },
    product: {
      update: (args: unknown) => productUpdate(args),
    },
    $transaction: (cb: unknown) => transaction(cb),
  },
}));

vi.mock("@/lib/redis", () => ({
  cacheDel: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  rateLimitExceeded: vi.fn(),
}));

vi.mock("@/lib/order/create-from-stripe", () => ({
  createOrderFromStripeSession: vi.fn(async () => ({ id: "ord_new_123" })),
}));

vi.mock("@/lib/order/resolve-cart-from-stripe", () => ({
  resolveCartFromStripeSession: vi.fn(async () => ({ items: [] })),
}));

vi.mock("@/lib/mail/send", () => ({
  sendOrderConfirmationEmail: vi.fn(async () => ({ success: true })),
}));

// Webhook secret braucht's für den Configure-Check, aber constructEvent
// ist ja gemockt — der Wert ist egal, hauptsache nicht null.
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";

// Now import the route — alle Mocks sind aktiv.
const { POST } = await import("@/app/api/stripe/webhook/route");

function makeRequest(body: string, opts: { signature?: string | null } = {}) {
  if (opts.signature === undefined) {
    headersMock.get.mockImplementation((n: string) =>
      n === "stripe-signature" ? "sig" : null,
    );
  } else if (opts.signature === null) {
    headersMock.get.mockImplementation(() => null);
  } else {
    headersMock.get.mockImplementation((n: string) =>
      n === "stripe-signature" ? opts.signature! : null,
    );
  }
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "x-forwarded-for": "127.0.0.1" },
  }) as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  // sinnvolle Defaults
  stripeEventCreate.mockResolvedValue({});
  stripeEventDelete.mockResolvedValue({});
  orderFindUnique.mockResolvedValue(null);
  orderUpdate.mockResolvedValue({});
  orderEventCreate.mockResolvedValue({});
  productVariantUpdate.mockResolvedValue({});
  productUpdate.mockResolvedValue({});
  transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({
      order: { update: orderUpdate },
      orderEvent: { create: orderEventCreate },
      productVariant: { update: productVariantUpdate },
      product: { update: productUpdate },
    }),
  );
});

describe("Stripe Webhook · Auth + Idempotenz", () => {
  it("returnt 400 wenn die stripe-signature header fehlt", async () => {
    const req = makeRequest("{}", { signature: null });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing stripe-signature/i);
  });

  it("returnt 400 wenn constructEvent fehlschlägt (Signature ungültig)", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("Invalid signature: ...");
    });
    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid signature/i);
  });

  it("returnt 'Already processed' bei Duplicate-Event (Prisma P2002)", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_dup",
      type: "checkout.session.completed",
      data: { object: {} },
    });
    stripeEventCreate.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/Already processed/i);
  });
});

describe("Stripe Webhook · Handler-Dispatch", () => {
  it("ruft handlePaymentFailed bei payment_intent.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_pay_fail",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_failed_123",
          last_payment_error: { message: "Card declined" },
        },
      },
    });
    orderFindUnique.mockResolvedValue({
      id: "ord_42",
      status: "PENDING",
    });

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(orderFindUnique).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: "pi_failed_123" },
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord_42" },
      data: { paymentStatus: "FAILED" },
    });
    expect(orderEventCreate).toHaveBeenCalled();
    const noteArg = orderEventCreate.mock.calls[0][0].data.note;
    expect(noteArg).toMatch(/Card declined/);
  });

  it("ruft handleRefund bei charge.refunded und restored Stock", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_refund_99",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_test_123",
          payment_intent: "pi_refunded_999",
        },
      },
    });
    orderFindUnique.mockResolvedValue({
      id: "ord_99",
      items: [
        { productId: "prod_1", variantId: null, quantity: 2 },
        { productId: "prod_2", variantId: "var_x", quantity: 1 },
      ],
    });

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(transaction).toHaveBeenCalledTimes(1);
    // Order auf REFUNDED setzen
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "ord_99" },
      data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
    });
    // OrderEvent „REFUNDED"
    expect(orderEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REFUNDED" }),
      }),
    );
    // Stock-Restore: prod_1 als product, prod_2/var_x als variant
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { stock: { increment: 2 } },
    });
    expect(productVariantUpdate).toHaveBeenCalledWith({
      where: { id: "var_x" },
      data: { stock: { increment: 1 } },
    });
  });

  it("ignoriert charge.refunded ohne payment_intent (no-op)", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_refund_orphan",
      type: "charge.refunded",
      data: { object: { id: "ch_test_orphan", payment_intent: null } },
    });

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(orderFindUnique).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("ignoriert payment_intent.payment_failed wenn keine Order matched", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_pay_fail_orphan",
      type: "payment_intent.payment_failed",
      data: {
        object: { id: "pi_orphan", last_payment_error: null },
      },
    });
    orderFindUnique.mockResolvedValue(null);

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("löscht den StripeEvent-Eintrag bei Handler-Crash damit Stripe retried", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_crash_123",
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_crash" } },
    });
    orderFindUnique.mockRejectedValue(new Error("DB connection lost"));

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(stripeEventDelete).toHaveBeenCalledWith({
      where: { id: "evt_crash_123" },
    });
  });

  it("ignoriert unbekannte Event-Types ohne Crash (200, kein Handler-Call)", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_unknown",
      type: "customer.created",
      data: { object: {} },
    });

    const req = makeRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(orderFindUnique).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
