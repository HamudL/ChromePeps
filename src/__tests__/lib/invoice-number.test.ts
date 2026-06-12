import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Invoice-Number-Allocator (UStG §14: fortlaufend, lückenlos).
 * Der Prisma-Client kommt als Parameter rein — gemockt wird nur
 * @/lib/db wegen des isPrismaUniqueError-Imports (das echte db.ts
 * würde einen PrismaClient instanziieren).
 */
vi.mock("@/lib/db", () => ({
  isPrismaUniqueError: (err: unknown) =>
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002",
}));

import { getOrCreateInvoice } from "@/lib/invoice/number";

const findUnique = vi.fn();
const findFirst = vi.fn();
const create = vi.fn();

// Minimaler Client — getOrCreateInvoice nutzt nur db.invoice.*.
const dbLike = {
  invoice: { findUnique, findFirst, create },
} as unknown as Parameters<typeof getOrCreateInvoice>[0];

const NOW = new Date("2026-06-12T10:00:00Z");

function invoiceRow(seq: number, year = 2026) {
  return {
    id: `inv_${seq}`,
    invoiceNumber: `CP-RE-${year}-${String(seq).padStart(4, "0")}`,
    orderId: "ord_1",
    year,
    seq,
    issuedAt: NOW,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrCreateInvoice", () => {
  it("ist idempotent: existierende Invoice wird returned, kein Insert", async () => {
    findUnique.mockResolvedValue(invoiceRow(7));
    const result = await getOrCreateInvoice(dbLike, "ord_1", NOW);
    expect(result.invoiceNumber).toBe("CP-RE-2026-0007");
    expect(create).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("allokiert Seq 1 im leeren Jahr — Format CP-RE-YYYY-0001", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(null);
    create.mockImplementation(async ({ data }: { data: { seq: number } }) => ({
      id: "inv_new",
      ...data,
    }));

    const result = await getOrCreateInvoice(dbLike, "ord_1", NOW);
    expect(create).toHaveBeenCalledWith({
      data: {
        orderId: "ord_1",
        year: 2026,
        seq: 1,
        invoiceNumber: "CP-RE-2026-0001",
        issuedAt: NOW,
      },
    });
    expect(result.invoiceNumber).toBe("CP-RE-2026-0001");
  });

  it("zählt vom höchsten Seq des Jahres weiter und padded auf 4 Stellen", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue({ seq: 41 });
    create.mockImplementation(async ({ data }: { data: { seq: number } }) => ({
      id: "inv_new",
      ...data,
    }));

    const result = await getOrCreateInvoice(dbLike, "ord_1", NOW);
    expect(result.seq).toBe(42);
    expect(result.invoiceNumber).toBe("CP-RE-2026-0042");
    // Jahr aus dem now-Parameter (UTC), nicht der Systemzeit.
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { year: 2026 } })
    );
  });

  it("P2002 wegen Sibling-Request: returnt dessen Invoice statt Duplikat", async () => {
    findUnique
      .mockResolvedValueOnce(null) // Fast-Path leer
      .mockResolvedValueOnce(invoiceRow(9)); // Re-Check nach P2002
    findFirst.mockResolvedValue({ seq: 8 });
    create.mockRejectedValueOnce(
      Object.assign(new Error("unique"), { code: "P2002" })
    );

    const result = await getOrCreateInvoice(dbLike, "ord_1", NOW);
    expect(result.seq).toBe(9);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("P2002 wegen (year,seq)-Race: retried mit neu gelesenem Seq", async () => {
    findUnique.mockResolvedValue(null); // orderId nie belegt
    findFirst
      .mockResolvedValueOnce({ seq: 10 }) // Versuch 1 → seq 11 (kollidiert)
      .mockResolvedValueOnce({ seq: 11 }); // Versuch 2 → seq 12
    create
      .mockRejectedValueOnce(
        Object.assign(new Error("unique"), { code: "P2002" })
      )
      .mockImplementationOnce(async ({ data }: { data: { seq: number } }) => ({
        id: "inv_new",
        ...data,
      }));

    const result = await getOrCreateInvoice(dbLike, "ord_1", NOW);
    expect(result.seq).toBe(12);
    expect(result.invoiceNumber).toBe("CP-RE-2026-0012");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("propagiert Nicht-Unique-Fehler sofort (kein Retry-Loop um DB-Ausfälle)", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue(null);
    create.mockRejectedValue(new Error("connection lost"));

    await expect(getOrCreateInvoice(dbLike, "ord_1", NOW)).rejects.toThrow(
      "connection lost"
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("gibt nach MAX_RETRIES dauerhafter P2002-Races auf", async () => {
    findUnique.mockResolvedValue(null);
    findFirst.mockResolvedValue({ seq: 1 });
    create.mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" })
    );

    await expect(getOrCreateInvoice(dbLike, "ord_1", NOW)).rejects.toThrow(
      /after 5 retries/
    );
    expect(create).toHaveBeenCalledTimes(5);
  });
});
