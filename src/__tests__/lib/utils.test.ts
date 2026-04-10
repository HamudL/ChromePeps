import { describe, it, expect, vi, beforeEach } from "vitest";
import { cn, formatPrice, slugify, truncate, absoluteUrl } from "@/lib/utils";

// ------------------------------------------------------------------
// cn() — class merging with Tailwind conflict resolution
// ------------------------------------------------------------------
describe("cn()", () => {
  it("merges multiple class strings", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined / null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

// ------------------------------------------------------------------
// formatPrice() — cents → EUR string (German locale)
// ------------------------------------------------------------------
describe("formatPrice()", () => {
  it("formats whole euros", () => {
    const result = formatPrice(1000);
    // German locale uses comma as decimal separator
    expect(result).toContain("10");
    expect(result).toContain("€");
  });

  it("formats cents correctly", () => {
    const result = formatPrice(1999);
    expect(result).toContain("19");
    expect(result).toContain("99");
  });

  it("formats zero", () => {
    const result = formatPrice(0);
    expect(result).toContain("0");
    expect(result).toContain("€");
  });

  it("handles negative values (refunds)", () => {
    const result = formatPrice(-500);
    expect(result).toContain("5");
  });

  it("defaults to EUR currency", () => {
    const result = formatPrice(100);
    expect(result).toContain("€");
  });
});

// ------------------------------------------------------------------
// slugify() — URL-safe slug from text
// ------------------------------------------------------------------
describe("slugify()", () => {
  it("lowercases text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("foo bar baz")).toBe("foo-bar-baz");
  });

  it("removes special characters", () => {
    expect(slugify("Preis: 10€!")).toBe("preis-10");
  });

  it("collapses multiple spaces into single hyphen", () => {
    expect(slugify("a   b   c")).toBe("a-b-c");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});

// ------------------------------------------------------------------
// truncate() — shorten strings with ellipsis
// ------------------------------------------------------------------
describe("truncate()", () => {
  it("returns string unchanged when shorter than limit", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });

  it("returns string unchanged when exactly at limit", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });

  it("truncates and appends '...' when over limit", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("handles very short limit", () => {
    expect(truncate("Hello", 4)).toBe("H...");
  });
});

// ------------------------------------------------------------------
// absoluteUrl() — builds full URL from path
// ------------------------------------------------------------------
describe("absoluteUrl()", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://chromepeps.com");
  });

  it("prepends the base URL", () => {
    expect(absoluteUrl("/products")).toBe(
      "https://chromepeps.com/products"
    );
  });

  it("works with root path", () => {
    expect(absoluteUrl("/")).toBe("https://chromepeps.com/");
  });

  it("throws when NEXT_PUBLIC_APP_URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(() => absoluteUrl("/test")).toThrow("NEXT_PUBLIC_APP_URL");
  });
});
