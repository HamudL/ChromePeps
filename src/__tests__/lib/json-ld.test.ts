import { describe, it, expect, afterEach, vi } from "vitest";
import {
  safeJsonLd,
  organizationJsonLd,
  websiteJsonLd,
  productJsonLd,
  breadcrumbJsonLd,
} from "@/lib/json-ld";
import { APP_NAME } from "@/lib/constants";

/**
 * JSON-LD-Generatoren für SEO. articleJsonLd + faqPageJsonLd haben
 * eigene Tests (json-ld-wissen.test.ts) — hier kommen die restlichen
 * Schemas plus der XSS-kritische safeJsonLd-Serializer dran.
 *
 * BASE_URL fällt im Test-Env (NEXT_PUBLIC_APP_URL ungesetzt) auf
 * http://localhost:3000 zurück.
 */
const BASE = "http://localhost:3000";

describe("safeJsonLd", () => {
  it("escaped </script>-Ausbrüche als Unicode-Escapes (stored XSS)", () => {
    const out = safeJsonLd({ name: '</script><script>alert("x")</script>' });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
  });

  it("escaped Ampersands", () => {
    expect(safeJsonLd({ a: "R&D" })).toBe('{"a":"R\\u0026D"}');
  });

  it("bleibt valides JSON — Parser dekodiert zurück zum Original", () => {
    const input = { name: "<b>Peptid & Co</b>", n: 5 };
    expect(JSON.parse(safeJsonLd(input))).toEqual(input);
  });
});

describe("organizationJsonLd / websiteJsonLd", () => {
  it("Organization trägt Name, URL und Logo-Pfad", () => {
    const org = organizationJsonLd();
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe(APP_NAME);
    expect(org.url).toBe(BASE);
    expect(org.logo).toBe(`${BASE}/icon`);
  });

  it("WebSite enthält die SearchAction für die Sitelinks-Searchbox", () => {
    const site = websiteJsonLd();
    expect(site["@type"]).toBe("WebSite");
    expect(site.potentialAction.target.urlTemplate).toBe(
      `${BASE}/products?search={search_term_string}`
    );
    expect(site.inLanguage).toBe("de-DE");
  });
});

describe("productJsonLd", () => {
  const base = {
    name: "BPC-157",
    slug: "bpc-157",
    description: "Forschungspeptid",
    priceInCents: 4999,
    inStock: true,
  };

  it("formatiert den Preis als Dezimalstring und baut die Produkt-URL", () => {
    const data = productJsonLd(base);
    expect(data["@type"]).toBe("Product");
    expect(data.url).toBe(`${BASE}/products/bpc-157`);
    const offers = data.offers as Record<string, unknown>;
    expect(offers.price).toBe("49.99");
    expect(offers.priceCurrency).toBe("EUR");
    expect(offers.availability).toBe("https://schema.org/InStock");
  });

  it("mappt inStock=false auf OutOfStock", () => {
    const data = productJsonLd({ ...base, inStock: false });
    expect((data.offers as Record<string, unknown>).availability).toBe(
      "https://schema.org/OutOfStock"
    );
  });

  it("uppercased eine explizit gesetzte Currency", () => {
    const data = productJsonLd({ ...base, currency: "usd" });
    expect((data.offers as Record<string, unknown>).priceCurrency).toBe("USD");
  });

  it("nutzt APP_NAME als Brand-Fallback und übernimmt explizite Brands", () => {
    expect((productJsonLd(base).brand as Record<string, unknown>).name).toBe(
      APP_NAME
    );
    expect(
      (productJsonLd({ ...base, brand: "ACME" }).brand as Record<
        string,
        unknown
      >).name
    ).toBe("ACME");
  });

  it("lässt sku/image weg wenn nicht gesetzt", () => {
    const data = productJsonLd(base);
    expect(data).not.toHaveProperty("sku");
    expect(data).not.toHaveProperty("image");
  });

  it("übernimmt sku und prefixt relative Bild-Pfade mit der Base-URL", () => {
    const data = productJsonLd({
      ...base,
      sku: "CP-BPC-5",
      image: "/uploads/bpc.webp",
    });
    expect(data.sku).toBe("CP-BPC-5");
    expect(data.image).toBe(`${BASE}/uploads/bpc.webp`);
  });

  it("lässt absolute Bild-URLs unangetastet", () => {
    const data = productJsonLd({
      ...base,
      image: "https://cdn.example.com/bpc.webp",
    });
    expect(data.image).toBe("https://cdn.example.com/bpc.webp");
  });

  it("rendert AggregateRating nur bei ratingCount > 0", () => {
    const withRating = productJsonLd({
      ...base,
      ratingValue: 4.561,
      ratingCount: 12,
    });
    expect(withRating.aggregateRating).toMatchObject({
      "@type": "AggregateRating",
      ratingValue: "4.6",
      reviewCount: 12,
    });

    // 0 Reviews → kein Rating-Block (Google straft leere Ratings ab).
    expect(
      productJsonLd({ ...base, ratingValue: 5, ratingCount: 0 })
    ).not.toHaveProperty("aggregateRating");
    // Fehlende Werte → ebenfalls kein Block.
    expect(productJsonLd(base)).not.toHaveProperty("aggregateRating");
  });
});

describe("breadcrumbJsonLd", () => {
  it("nummeriert Positionen 1-basiert und baut absolute Item-URLs", () => {
    const data = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Produkte", path: "/products" },
      { name: "BPC-157", path: "/products/bpc-157" },
    ]);
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${BASE}/`,
    });
    expect(data.itemListElement[2].position).toBe(3);
    expect(data.itemListElement[2].item).toBe(`${BASE}/products/bpc-157`);
  });

  it("liefert eine leere Liste für leere Pfade", () => {
    expect(breadcrumbJsonLd([]).itemListElement).toEqual([]);
  });
});

describe("localBusinessJsonLd", () => {
  // SELLER_DETAILS wird beim Import von constants.ts aus der Env
  // eingefroren — für beide Branches (TODO-Platzhalter vs. gepflegt)
  // brauchen wir daher frische Modul-Instanzen.
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returnt null solange Pflichtfelder [TODO]-Platzhalter sind", async () => {
    vi.stubEnv("SELLER_STREET", undefined);
    vi.stubEnv("SELLER_POSTAL_CITY", undefined);
    vi.resetModules();
    const { localBusinessJsonLd } = await import("@/lib/json-ld");
    expect(localBusinessJsonLd()).toBeNull();
  });

  it("rendert das Schema mit gepflegten Pflichtfeldern, optionale TODO-Felder fehlen", async () => {
    vi.stubEnv("SELLER_COMPANY_NAME", "ChromePeps UG");
    vi.stubEnv("SELLER_STREET", "Peptidweg 1");
    vi.stubEnv("SELLER_POSTAL_CITY", "10115 Berlin Mitte");
    vi.stubEnv("SELLER_COUNTRY", "Deutschland");
    vi.stubEnv("SELLER_PHONE", undefined); // bleibt [TODO]
    vi.stubEnv("SELLER_VAT_ID", undefined); // bleibt [TODO]
    vi.resetModules();
    const { localBusinessJsonLd } = await import("@/lib/json-ld");

    const data = localBusinessJsonLd();
    expect(data).not.toBeNull();
    expect(data!.name).toBe("ChromePeps UG");
    // PLZ/Ort-Split: erstes Token = PLZ, Rest = Ort.
    expect(data!.address).toMatchObject({
      streetAddress: "Peptidweg 1",
      postalCode: "10115",
      addressLocality: "Berlin Mitte",
      addressCountry: "DE",
    });
    expect(data).not.toHaveProperty("telephone");
    expect(data).not.toHaveProperty("vatID");
  });

  it("hängt telephone/vatID an sobald sie gepflegt sind", async () => {
    vi.stubEnv("SELLER_STREET", "Peptidweg 1");
    vi.stubEnv("SELLER_POSTAL_CITY", "10115 Berlin");
    vi.stubEnv("SELLER_PHONE", "+49 30 1234567");
    vi.stubEnv("SELLER_VAT_ID", "DE123456789");
    vi.resetModules();
    const { localBusinessJsonLd } = await import("@/lib/json-ld");

    const data = localBusinessJsonLd();
    expect(data!.telephone).toBe("+49 30 1234567");
    expect(data!.vatID).toBe("DE123456789");
  });
});
