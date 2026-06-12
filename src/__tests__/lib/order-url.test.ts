import { describe, it, expect, afterEach, vi } from "vitest";
import { buildOrderUrl } from "@/lib/order/order-url";

/**
 * buildOrderUrl liest NEXT_PUBLIC_APP_URL zur CALL-Zeit — daher reicht
 * vi.stubEnv ohne Modul-Reset.
 */
describe("buildOrderUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const args = {
    orderId: "ord_123",
    orderNumber: "CP-2026-0001",
    email: "kunde+test@example.com",
    isGuest: false,
  };

  it("returnt undefined ohne konfigurierte Base-URL (Mail lässt Button weg)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(buildOrderUrl(args)).toBeUndefined();
  });

  it("returnt undefined wenn die Variable komplett fehlt", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", undefined);
    expect(buildOrderUrl(args)).toBeUndefined();
  });

  it("baut den Dashboard-Deeplink für Account-Kunden", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://chromepeps.com");
    expect(buildOrderUrl(args)).toBe(
      "https://chromepeps.com/dashboard/orders/ord_123"
    );
  });

  it("baut den öffentlichen Order-Status-Link für Gäste mit URL-Encoding", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://chromepeps.com");
    const url = buildOrderUrl({ ...args, isGuest: true });
    expect(url).toBe(
      "https://chromepeps.com/order-status?orderNumber=CP-2026-0001&email=kunde%2Btest%40example.com"
    );
  });

  it("encodet Sonderzeichen in der Bestellnummer", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://chromepeps.com");
    const url = buildOrderUrl({
      ...args,
      isGuest: true,
      orderNumber: "CP 2026&0001",
    });
    expect(url).toContain("orderNumber=CP%202026%260001");
  });
});
