import { describe, expect, it } from "vitest";
import { bucketLetter } from "@/lib/wissen/bucket-letter";

describe("bucketLetter", () => {
  it("mappt Kleinbuchstaben auf Großbuchstaben-Bucket", () => {
    expect(bucketLetter("acetat")).toBe("A");
    expect(bucketLetter("hplc")).toBe("H");
  });

  it("mappt deutsche Umlaute auf den ungezeichneten Bucket", () => {
    expect(bucketLetter("Äther")).toBe("A");
    expect(bucketLetter("Östrogen")).toBe("O");
    expect(bucketLetter("Übergang")).toBe("U");
    // Kleinbuchstaben-Variante (toUpperCase normalisiert ä → Ä)
    expect(bucketLetter("ärger")).toBe("A");
  });

  it("mappt ß auf S", () => {
    expect(bucketLetter("ßonderfall")).toBe("S");
  });

  it("legt Zahlen und Sonderzeichen in den #-Bucket", () => {
    expect(bucketLetter("3-Methylhistidin")).toBe("#");
    expect(bucketLetter("(R)-Form")).toBe("#");
    expect(bucketLetter("α-Helix")).toBe("#");
  });

  it("returnt # bei leerem oder weisspace-only String", () => {
    expect(bucketLetter("")).toBe("#");
    expect(bucketLetter("   ")).toBe("#");
  });

  it("trimt führendes Whitespace", () => {
    expect(bucketLetter("  Reinheit")).toBe("R");
  });
});
