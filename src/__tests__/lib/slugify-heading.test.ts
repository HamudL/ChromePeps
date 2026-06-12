import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { slugifyHeading } from "@/lib/wissen/slugify-heading";

/**
 * slugifyHeading bekommt von react-markdown beliebige Children-Formen
 * (Strings, Zahlen, Arrays, verschachtelte Elemente) und muss daraus
 * stabile Anchor-IDs machen — inkl. Umlaut-Transliteration und Cap.
 */
describe("slugifyHeading", () => {
  it("slugifiziert einen einfachen String", () => {
    expect(slugifyHeading("HPLC Reinheitsanalyse")).toBe(
      "hplc-reinheitsanalyse"
    );
  });

  it("transliteriert deutsche Umlaute und ß", () => {
    expect(slugifyHeading("Qualität prüfen: Größe & Maße")).toBe(
      "qualitaet-pruefen-groesse-masse"
    );
  });

  it("kollabiert Sonderzeichen-Folgen zu einem Bindestrich", () => {
    expect(slugifyHeading("Was ist... BPC-157?!")).toBe("was-ist-bpc-157");
  });

  it("trimmt führende/trailing Bindestriche", () => {
    expect(slugifyHeading("§ Wichtig §")).toBe("wichtig");
  });

  it("verkettet Array-Children", () => {
    expect(slugifyHeading(["Teil 1", " und ", "Teil 2"])).toBe(
      "teil-1-und-teil-2"
    );
  });

  it("nimmt Zahlen-Children als Text", () => {
    expect(slugifyHeading([3, ". Schritt"])).toBe("3-schritt");
  });

  it("extrahiert Text rekursiv aus React-Elementen (Inline-Code etc.)", () => {
    const heading = [
      "Dosierung mit ",
      createElement("code", null, "5mg"),
      " Ampullen",
    ];
    expect(slugifyHeading(heading)).toBe("dosierung-mit-5mg-ampullen");
  });

  it("extrahiert aus tief verschachtelten Elementen", () => {
    const nested = createElement(
      "strong",
      null,
      createElement("em", null, "Tief verschachtelt")
    );
    expect(slugifyHeading(nested)).toBe("tief-verschachtelt");
  });

  it("returnt leeren String für null/undefined/boolean Children", () => {
    expect(slugifyHeading(null)).toBe("");
    expect(slugifyHeading(undefined)).toBe("");
    expect(slugifyHeading(true)).toBe("");
  });

  it("kappt das Ergebnis bei 80 Zeichen", () => {
    const long = "wort ".repeat(40);
    expect(slugifyHeading(long).length).toBeLessThanOrEqual(80);
  });
});
