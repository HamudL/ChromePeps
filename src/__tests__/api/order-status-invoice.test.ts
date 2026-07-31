import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Autorisierungs-Tests für POST /api/order-status/invoice.
 *
 * Die Route liefert ein PDF mit vollständiger Rechnungsadresse und
 * Rechnungsnummer an einen NICHT eingeloggten Aufrufer aus — sie ist damit
 * der sensibelste öffentliche Endpunkt des Shops. Getestet wird deshalb vor
 * allem, dass `deliverInvoicePdf` in keinem nicht-autorisierten Fall auch
 * nur aufgerufen wird.
 *
 * Gemockt: `@/lib/db`, `@/lib/rate-limit` (kein Redis) und
 * `@/lib/invoice/deliver` (kein echtes PDF-Rendering).
 */
const { dbMock, deliverMock, rateLimitMock } = vi.hoisted(() => ({
  dbMock: { order: { findUnique: vi.fn() } },
  deliverMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: dbMock, isPrismaUniqueError: () => false }));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: rateLimitMock,
  rateLimitExceeded: vi.fn(() => new Response("", { status: 429 })),
}));

vi.mock("@/lib/invoice/deliver", () => ({
  INVOICE_ORDER_INCLUDE: {},
  deliverInvoicePdf: deliverMock,
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/order-status/invoice/route";

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/order-status/invoice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const guestOrder = {
  id: "ord_1",
  orderNumber: "CP-ABC-123",
  guestEmail: "gast@example.com",
  user: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue({ success: true, remaining: 9, reset: 1000 });
  deliverMock.mockResolvedValue(new Response("%PDF", { status: 200 }));
});

describe("POST /api/order-status/invoice", () => {
  it("bei ausgeschöpftem Rate-Limit → 429, ohne DB-Zugriff", async () => {
    rateLimitMock.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: 1000,
    });
    const res = await POST(
      req({ orderNumber: "CP-ABC-123", email: "gast@example.com" })
    );
    expect(res.status).toBe(429);
    expect(dbMock.order.findUnique).not.toHaveBeenCalled();
    expect(deliverMock).not.toHaveBeenCalled();
  });

  it("ohne Bestellnummer/E-Mail → 400", async () => {
    const res = await POST(req({ orderNumber: "CP-ABC-123" }));
    expect(res.status).toBe(400);
    expect(dbMock.order.findUnique).not.toHaveBeenCalled();
    expect(deliverMock).not.toHaveBeenCalled();
  });

  it("bei unbekannter Bestellnummer → 404, keine Rechnung", async () => {
    dbMock.order.findUnique.mockResolvedValue(null);
    const res = await POST(
      req({ orderNumber: "CP-GIBTS-NICHT", email: "gast@example.com" })
    );
    expect(res.status).toBe(404);
    expect(deliverMock).not.toHaveBeenCalled();
  });

  it("bei existierender Bestellung mit FREMDER E-Mail → 404, keine Rechnung", async () => {
    dbMock.order.findUnique.mockResolvedValue(guestOrder);
    const res = await POST(
      req({ orderNumber: "CP-ABC-123", email: "angreifer@example.com" })
    );
    expect(res.status).toBe(404);
    expect(deliverMock).not.toHaveBeenCalled();
  });

  it("liefert für unbekannte Bestellung und falsche E-Mail dieselbe Meldung", async () => {
    dbMock.order.findUnique.mockResolvedValue(null);
    const unknown = await POST(
      req({ orderNumber: "CP-GIBTS-NICHT", email: "gast@example.com" })
    );
    dbMock.order.findUnique.mockResolvedValue(guestOrder);
    const wrongMail = await POST(
      req({ orderNumber: "CP-ABC-123", email: "angreifer@example.com" })
    );
    expect(await unknown.json()).toEqual(await wrongMail.json());
  });

  it("mit passender guestEmail → Rechnung wird ausgeliefert", async () => {
    dbMock.order.findUnique.mockResolvedValue(guestOrder);
    const res = await POST(
      req({ orderNumber: "CP-ABC-123", email: "gast@example.com" })
    );
    expect(res.status).toBe(200);
    expect(deliverMock).toHaveBeenCalledWith(guestOrder);
  });

  it("mit abweichender Schreibweise der E-Mail → Rechnung wird ausgeliefert", async () => {
    dbMock.order.findUnique.mockResolvedValue(guestOrder);
    const res = await POST(
      req({ orderNumber: "CP-ABC-123", email: "  Gast@Example.COM  " })
    );
    expect(res.status).toBe(200);
    expect(deliverMock).toHaveBeenCalledWith(guestOrder);
  });

  it("auch Konto-Bestellungen sind per E-Mail abrufbar", async () => {
    const accountOrder = {
      id: "ord_2",
      orderNumber: "CP-DEF-456",
      guestEmail: null,
      user: { name: "Kundin", email: "kundin@example.com" },
    };
    dbMock.order.findUnique.mockResolvedValue(accountOrder);
    const res = await POST(
      req({ orderNumber: "CP-DEF-456", email: "kundin@example.com" })
    );
    expect(res.status).toBe(200);
    expect(deliverMock).toHaveBeenCalledWith(accountOrder);
  });

  it("sucht die Bestellung über die getrimmte Bestellnummer", async () => {
    dbMock.order.findUnique.mockResolvedValue(guestOrder);
    await POST(
      req({ orderNumber: "  CP-ABC-123  ", email: "gast@example.com" })
    );
    expect(dbMock.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orderNumber: "CP-ABC-123" } })
    );
  });
});
