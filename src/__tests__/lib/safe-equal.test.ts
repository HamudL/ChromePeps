import { describe, it, expect } from "vitest";
import { safeEqual } from "@/lib/safe-equal";

/**
 * Tests für den konstant-zeitigen String-Vergleich.
 *
 * Der Helper hasht beide Seiten auf SHA-256, damit timingSafeEqual
 * weder über die Länge leakt noch bei Längenungleichheit wirft —
 * genau diese zwei Eigenschaften decken die Tests ab.
 */
describe("safeEqual", () => {
  it("erkennt identische Strings", () => {
    expect(safeEqual("secret-token", "secret-token")).toBe(true);
  });

  it("lehnt unterschiedliche Strings gleicher Länge ab", () => {
    expect(safeEqual("aaaaaaaa", "aaaaaaab")).toBe(false);
  });

  it("wirft NICHT bei unterschiedlicher Länge (Hash normalisiert)", () => {
    expect(() => safeEqual("kurz", "sehr-viel-laengerer-string")).not.toThrow();
    expect(safeEqual("kurz", "sehr-viel-laengerer-string")).toBe(false);
  });

  it("behandelt Leerstrings deterministisch", () => {
    expect(safeEqual("", "")).toBe(true);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("ist case-sensitiv (Token-Vergleich darf nicht normalisieren)", () => {
    expect(safeEqual("Bearer ABC", "bearer abc")).toBe(false);
  });

  it("unterscheidet Unicode-Varianten byteweise", () => {
    // "ä" als ein Codepoint vs. "a" + combining diaeresis — verschiedene
    // Byte-Folgen müssen verschieden bleiben (kein NFC-Normalisieren).
    expect(safeEqual("ä", "ä")).toBe(false);
  });
});
