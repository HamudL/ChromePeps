import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Shipping-Rate-Resolver. Kontrakte:
 *  - Lazy-Seed nur bei leerer Tabelle, einmal pro Prozess (Flag)
 *  - resolveShippingRate normalisiert den Country-Code und returnt
 *    null (statt Throw) für unbekannte/deaktivierte Länder
 *  - fallbackShippingCents spiegelt den DE-Standardtarif
 *
 * Das Modul hält ein prozessweites `seededInThisProcess`-Flag →
 * jeder Test importiert frisch via resetModules.
 */
const { countMock, createManyMock, findManyMock, findFirstMock } = vi.hoisted(
  () => ({
    countMock: vi.fn(),
    createManyMock: vi.fn(),
    findManyMock: vi.fn(),
    findFirstMock: vi.fn(),
  })
);

vi.mock("@/lib/db", () => ({
  db: {
    shippingRate: {
      count: countMock,
      createMany: createManyMock,
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  },
}));

async function importRates() {
  vi.resetModules();
  return import("@/lib/shipping/rates");
}

beforeEach(() => {
  vi.clearAllMocks();
  countMock.mockResolvedValue(3);
  createManyMock.mockResolvedValue({ count: 0 });
  findManyMock.mockResolvedValue([]);
  findFirstMock.mockResolvedValue(null);
});

describe("ensureShippingRatesSeeded", () => {
  it("Tabelle befüllt → kein Seed, Flag verhindert weitere count()-Roundtrips", async () => {
    const { ensureShippingRatesSeeded } = await importRates();

    await ensureShippingRatesSeeded();
    await ensureShippingRatesSeeded();

    expect(createManyMock).not.toHaveBeenCalled();
    expect(countMock).toHaveBeenCalledTimes(1);
  });

  it("leere Tabelle → seedet alle 27 EU-Länder mit skipDuplicates (Race-Schutz)", async () => {
    countMock.mockResolvedValue(0);
    const { ensureShippingRatesSeeded, DEFAULT_SHIPPING_RATES } =
      await importRates();

    await ensureShippingRatesSeeded();

    expect(DEFAULT_SHIPPING_RATES).toHaveLength(27);
    expect(createManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          countryCode: "DE",
          priceInCents: 599,
          isActive: true,
        }),
      ]),
      skipDuplicates: true,
    });
    expect(createManyMock.mock.calls[0][0].data).toHaveLength(27);
  });
});

describe("getActiveShippingRates", () => {
  it("liest nur aktive Tarife in stabiler Reihenfolge (sortOrder, Name)", async () => {
    const rows = [
      { countryCode: "DE", countryName: "Deutschland", priceInCents: 599 },
    ];
    findManyMock.mockResolvedValue(rows);
    const { getActiveShippingRates } = await importRates();

    await expect(getActiveShippingRates()).resolves.toEqual(rows);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { countryName: "asc" }],
      })
    );
  });
});

describe("resolveShippingRate", () => {
  it("normalisiert den Code (lowercase + Whitespace) vor dem Lookup", async () => {
    findFirstMock.mockResolvedValue({
      countryCode: "AT",
      countryName: "Österreich",
      priceInCents: 999,
    });
    const { resolveShippingRate } = await importRates();

    const rate = await resolveShippingRate(" at ");

    expect(rate).toEqual({
      countryCode: "AT",
      countryName: "Österreich",
      priceInCents: 999,
    });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { countryCode: "AT", isActive: true },
      })
    );
  });

  it("Nicht-Alpha-2-Codes → null ohne DB-Roundtrip", async () => {
    const { resolveShippingRate } = await importRates();
    await expect(resolveShippingRate("DEU")).resolves.toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("unbekanntes/deaktiviertes Land → null (Caller behandelt als Lieferverbot)", async () => {
    findFirstMock.mockResolvedValue(null);
    const { resolveShippingRate } = await importRates();
    await expect(resolveShippingRate("CH")).resolves.toBeNull();
  });
});

describe("fallbackShippingCents", () => {
  it("entspricht dem DE-Standardtarif aus calculate-totals", async () => {
    const { fallbackShippingCents } = await importRates();
    const { STANDARD_SHIPPING_CENTS } = await import(
      "@/lib/order/calculate-totals"
    );
    expect(fallbackShippingCents()).toBe(STANDARD_SHIPPING_CENTS);
  });
});
