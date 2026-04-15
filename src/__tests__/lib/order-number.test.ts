import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "@/lib/order/generate-order-number";

describe("generateOrderNumber()", () => {
  it("returns a CP-prefixed string", () => {
    expect(generateOrderNumber()).toMatch(/^CP-/);
  });

  it("matches the CP-<timestamp36>-<random8hex> format", () => {
    const num = generateOrderNumber();
    // timestamp base36 (date now) + random 4 bytes → 8 hex chars
    expect(num).toMatch(/^CP-[0-9A-Z]+-[0-9A-F]{8}$/);
  });

  it("returns uppercase-only after the CP prefix", () => {
    const num = generateOrderNumber();
    const tail = num.slice(3); // strip "CP-"
    expect(tail).toBe(tail.toUpperCase());
  });

  it("produces unique values on rapid successive calls", () => {
    // The timestamp-plus-random combo should be collision-free even
    // within the same millisecond because of the 4 random bytes.
    const seen = new Set<string>();
    for (let i = 0; i < 1_000; i++) {
      seen.add(generateOrderNumber());
    }
    expect(seen.size).toBe(1_000);
  });

  it("fits in a typical database varchar column (< 64 chars)", () => {
    // If this ever grows past the Prisma String field's default length
    // (or a migration adds a VARCHAR constraint), we want to know early.
    expect(generateOrderNumber().length).toBeLessThan(64);
  });
});
