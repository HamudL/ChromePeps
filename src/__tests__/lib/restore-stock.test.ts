import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import {
  restoreOrderStock,
  type RestorableOrder,
} from "@/lib/order/restore-stock";

/**
 * Policy-Matrix des statusbewussten Stock-Restores (eine Quelle für
 * Admin-Cancel UND Stripe-Voll-Refund):
 *  - Test-Orders restaurieren NIE (haben nie dekrementiert)
 *  - stockRestoredAt gesetzt → Doppel-Restore-Schutz
 *  - DELIVERED → nie automatisch (Ware liegt beim Kunden)
 *  - trigger "cancel" nur aus PENDING/PROCESSING/SHIPPED
 *  - trigger "refund" restauriert auch aus anderen Quellstatus
 *  - Items: variantId vor productId; weder/noch → No-op;
 *    hard-deleted Produkt (Update-Reject) bricht die anderen nicht ab
 *  - Marker stockRestoredAt wird im selben tx gesetzt
 */
const variantUpdate = vi.fn();
const productUpdate = vi.fn();
const orderUpdate = vi.fn();

function makeTx(): Prisma.TransactionClient {
  return {
    productVariant: { update: variantUpdate },
    product: { update: productUpdate },
    order: { update: orderUpdate },
  } as unknown as Prisma.TransactionClient;
}

function makeOrder(overrides: Partial<RestorableOrder> = {}): RestorableOrder {
  return {
    id: "order_1",
    status: "PROCESSING",
    isTestOrder: false,
    stockRestoredAt: null,
    items: [{ productId: "prod_1", variantId: null, quantity: 2 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  variantUpdate.mockResolvedValue({});
  productUpdate.mockResolvedValue({});
  orderUpdate.mockResolvedValue({});
});

describe("restoreOrderStock — Skip-Policy", () => {
  it("Test-Order → false, keinerlei DB-Writes (kein Phantom-Inventar)", async () => {
    const result = await restoreOrderStock(
      makeTx(),
      makeOrder({ isTestOrder: true }),
      { trigger: "cancel" }
    );

    expect(result).toBeNull();
    expect(productUpdate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("stockRestoredAt gesetzt → false (Schutz gegen Status-Flapping/Refund-nach-Cancel)", async () => {
    const result = await restoreOrderStock(
      makeTx(),
      makeOrder({ stockRestoredAt: new Date("2026-01-01") }),
      { trigger: "refund" }
    );

    expect(result).toBeNull();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("DELIVERED → false für BEIDE Trigger (Ware ist beim Kunden)", async () => {
    for (const trigger of ["cancel", "refund"] as const) {
      const result = await restoreOrderStock(
        makeTx(),
        makeOrder({ status: "DELIVERED" }),
        { trigger }
      );
      expect(result).toBeNull();
    }
    expect(productUpdate).not.toHaveBeenCalled();
  });

  it("cancel aus terminalem Status (CANCELLED) → false, Bestand wurde schon zurückgebucht", async () => {
    const result = await restoreOrderStock(
      makeTx(),
      makeOrder({ status: "CANCELLED" }),
      { trigger: "cancel" }
    );

    expect(result).toBeNull();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("refund ignoriert die Cancel-Quellstatus-Liste (z.B. aus REFUNDED-fremdem Status)", async () => {
    // Status, der für "cancel" gesperrt wäre — refund darf trotzdem.
    const result = await restoreOrderStock(
      makeTx(),
      makeOrder({ status: "ARCHIVED" }),
      { trigger: "refund" }
    );

    expect(result).toBeInstanceOf(Date);
    expect(productUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("restoreOrderStock — Restore-Pfad", () => {
  it.each(["PENDING", "PROCESSING", "SHIPPED"])(
    "cancel aus %s → Inkremente + stockRestoredAt-Marker im selben tx",
    async (status) => {
      const result = await restoreOrderStock(makeTx(), makeOrder({ status }), {
        trigger: "cancel",
      });

      expect(result).toBeInstanceOf(Date);
      expect(productUpdate).toHaveBeenCalledWith({
        where: { id: "prod_1" },
        data: { stock: { increment: 2 } },
      });
      expect(orderUpdate).toHaveBeenCalledWith({
        where: { id: "order_1" },
        data: { stockRestoredAt: expect.any(Date) },
      });
    }
  );

  it("variantId gewinnt vor productId; Item ohne beides ist ein No-op", async () => {
    const order = makeOrder({
      items: [
        { productId: "prod_1", variantId: "var_1", quantity: 3 },
        { productId: "prod_2", variantId: null, quantity: 1 },
        // Hard-deleted Referenzen: beide IDs null → kein Update.
        { productId: null, variantId: null, quantity: 5 },
      ],
    });

    const result = await restoreOrderStock(makeTx(), order, {
      trigger: "refund",
    });

    expect(result).toBeInstanceOf(Date);
    expect(variantUpdate).toHaveBeenCalledTimes(1);
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: { stock: { increment: 3 } },
    });
    expect(productUpdate).toHaveBeenCalledTimes(1);
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: "prod_2" },
      data: { stock: { increment: 1 } },
    });
  });

  it("hard-deleted Variante (Update rejected) bricht weder andere Items noch den Marker ab", async () => {
    variantUpdate.mockRejectedValue(new Error("P2025: record not found"));
    const order = makeOrder({
      items: [
        { productId: null, variantId: "var_deleted", quantity: 1 },
        { productId: "prod_1", variantId: null, quantity: 2 },
      ],
    });

    const result = await restoreOrderStock(makeTx(), order, {
      trigger: "cancel",
    });

    expect(result).toBeInstanceOf(Date);
    expect(productUpdate).toHaveBeenCalledTimes(1);
    expect(orderUpdate).toHaveBeenCalledTimes(1);
  });
});
