import { describe, it, expect } from "vitest";
import {
  TAX_RATE,
  APP_NAME,
  CURRENCY,
  ITEMS_PER_PAGE,
  ADMIN_ITEMS_PER_PAGE,
  ORDER_STATUS_LABELS,
  CACHE_TTL,
  PASSWORD_RESET_TOKEN_TTL_MS,
  EMAIL_VERIFY_TOKEN_TTL_MS,
} from "@/lib/constants";

describe("TAX_RATE", () => {
  it("is 19% (German MwSt)", () => {
    expect(TAX_RATE).toBe(0.19);
  });

  it("calculates correct tax for 100€", () => {
    const net = 10000; // 100.00€ in cents
    const tax = Math.round(net * TAX_RATE);
    expect(tax).toBe(1900); // 19.00€
  });

  it("calculates correct gross from net", () => {
    const net = 8403; // 84.03€ net
    const gross = Math.round(net * (1 + TAX_RATE));
    expect(gross).toBe(10000); // ≈100.00€ gross
  });
});

describe("APP_NAME", () => {
  it("is 'ChromePeps'", () => {
    expect(APP_NAME).toBe("ChromePeps");
  });
});

describe("CURRENCY", () => {
  it("is 'eur'", () => {
    expect(CURRENCY).toBe("eur");
  });
});

describe("Pagination constants", () => {
  it("shop page shows 12 items", () => {
    expect(ITEMS_PER_PAGE).toBe(12);
  });

  it("admin page shows 20 items", () => {
    expect(ADMIN_ITEMS_PER_PAGE).toBe(20);
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("includes all expected statuses", () => {
    const expected = [
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ];
    for (const status of expected) {
      expect(ORDER_STATUS_LABELS).toHaveProperty(status);
    }
  });

  it("labels are non-empty strings", () => {
    for (const label of Object.values(ORDER_STATUS_LABELS)) {
      expect(typeof label).toBe("string");
      expect((label as string).length).toBeGreaterThan(0);
    }
  });
});

describe("CACHE_TTL", () => {
  it("all TTL values are positive numbers (seconds)", () => {
    for (const [key, ttl] of Object.entries(CACHE_TTL)) {
      expect(ttl, `CACHE_TTL.${key}`).toBeGreaterThan(0);
    }
  });
});

describe("Token TTLs", () => {
  it("password reset token expires in 1 hour", () => {
    expect(PASSWORD_RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });

  it("email verify token expires in 24 hours", () => {
    expect(EMAIL_VERIFY_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
