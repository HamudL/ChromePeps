import { describe, it, expect, vi } from "vitest";

/**
 * Tests für die gemeinsame Zugangsprüfung der öffentlichen Gast-Endpunkte.
 *
 * `guest-lookup` importiert `@/lib/rate-limit`, das seinerseits `@/lib/redis`
 * zieht — und Redis verbindet sich zur Import-Zeit. Deshalb wird Redis hier
 * gestubbt (gleiches Vorgehen wie in rate-limit.test.ts); getestet werden
 * ausschließlich die reinen Funktionen.
 */
vi.mock("@/lib/redis", () => ({ redis: { eval: vi.fn() } }));

import {
  guestLookupEmailMatches,
  parseGuestLookupInput,
} from "@/lib/order/guest-lookup";

describe("parseGuestLookupInput", () => {
  it("akzeptiert gültige Eingaben und normalisiert die E-Mail", () => {
    const result = parseGuestLookupInput({
      orderNumber: "  CP-ABC-123  ",
      email: "  Kunde@Example.COM ",
    });
    expect(result).toEqual({
      ok: true,
      orderNumber: "CP-ABC-123",
      email: "kunde@example.com",
    });
  });

  it("lehnt fehlende Bestellnummer ab", () => {
    const result = parseGuestLookupInput({ email: "kunde@example.com" });
    expect(result.ok).toBe(false);
  });

  it("lehnt fehlende E-Mail ab", () => {
    const result = parseGuestLookupInput({ orderNumber: "CP-ABC-123" });
    expect(result.ok).toBe(false);
  });

  it("lehnt reine Leerzeichen ab", () => {
    const result = parseGuestLookupInput({
      orderNumber: "   ",
      email: "   ",
    });
    expect(result.ok).toBe(false);
  });

  it("lehnt syntaktisch ungültige E-Mails ab", () => {
    for (const email of ["kunde", "kunde@", "@example.com", "a b@c.de"]) {
      expect(parseGuestLookupInput({ orderNumber: "CP-1", email }).ok).toBe(
        false
      );
    }
  });

  it("verträgt null und Nicht-Objekte, statt zu werfen", () => {
    expect(parseGuestLookupInput(null).ok).toBe(false);
    expect(parseGuestLookupInput(undefined).ok).toBe(false);
    expect(parseGuestLookupInput({ orderNumber: 42, email: [] }).ok).toBe(
      false
    );
  });
});

describe("guestLookupEmailMatches", () => {
  it("matcht die guestEmail einer Gast-Bestellung", () => {
    const order = { guestEmail: "gast@example.com", user: null };
    expect(guestLookupEmailMatches(order, "gast@example.com")).toBe(true);
  });

  it("matcht case-insensitiv (guestEmail in Großschreibung gespeichert)", () => {
    const order = { guestEmail: "Gast@Example.COM", user: null };
    expect(guestLookupEmailMatches(order, "gast@example.com")).toBe(true);
  });

  it("matcht die user.email einer Konto-Bestellung", () => {
    const order = { guestEmail: null, user: { email: "kunde@example.com" } };
    expect(guestLookupEmailMatches(order, "kunde@example.com")).toBe(true);
  });

  it("bevorzugt user.email, wenn beide gesetzt sind", () => {
    const order = {
      guestEmail: "alt@example.com",
      user: { email: "konto@example.com" },
    };
    expect(guestLookupEmailMatches(order, "konto@example.com")).toBe(true);
    expect(guestLookupEmailMatches(order, "alt@example.com")).toBe(false);
  });

  it("lehnt eine fremde E-Mail ab", () => {
    const order = { guestEmail: "gast@example.com", user: null };
    expect(guestLookupEmailMatches(order, "angreifer@example.com")).toBe(false);
  });

  it("matcht NIE, wenn die Bestellung gar keine E-Mail trägt", () => {
    const order = { guestEmail: null, user: null };
    expect(guestLookupEmailMatches(order, "")).toBe(false);
    expect(guestLookupEmailMatches(order, "irgendwas@example.com")).toBe(false);
  });

  it("matcht nicht bei leerer user.email", () => {
    const order = { guestEmail: null, user: { email: "" } };
    expect(guestLookupEmailMatches(order, "")).toBe(false);
  });
});
