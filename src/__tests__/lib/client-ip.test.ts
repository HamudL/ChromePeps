import { describe, it, expect } from "vitest";
import { getClientIp } from "@/lib/client-ip";

/**
 * Tests für die spoofing-resistente Client-IP-Ermittlung.
 *
 * Sicherheitskontrakt (siehe Doc-Kommentar in client-ip.ts):
 *  - `x-real-ip` (von nginx auf $remote_addr gesetzt) gewinnt immer.
 *  - Aus `x-forwarded-for` zählt NUR der LETZTE Hop — die vorderen
 *    Einträge sind client-kontrolliert und damit fälschbar.
 *  - Ohne vertrauenswürdige Header → "unknown" (gemeinsamer Bucket).
 */
describe("getClientIp", () => {
  it("returnt 'unknown' für null/undefined headers", () => {
    expect(getClientIp(null)).toBe("unknown");
    expect(getClientIp(undefined)).toBe("unknown");
  });

  it("returnt 'unknown' wenn keine relevanten Header gesetzt sind", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("bevorzugt x-real-ip vor x-forwarded-for", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1, 192.0.2.50",
    });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("trimmt Whitespace aus x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "  203.0.113.7  " });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("ignoriert whitespace-only x-real-ip und fällt auf XFF zurück", () => {
    const headers = new Headers({
      "x-real-ip": "   ",
      "x-forwarded-for": "192.0.2.50",
    });
    expect(getClientIp(headers)).toBe("192.0.2.50");
  });

  it("nimmt den LETZTEN XFF-Hop, nicht den ersten (Spoofing-Schutz)", () => {
    const headers = new Headers({
      // Erster Eintrag ist attacker-chosen, letzter wurde von unserem
      // nginx via $proxy_add_x_forwarded_for angehängt.
      "x-forwarded-for": "6.6.6.6, 198.51.100.1, 192.0.2.50",
    });
    expect(getClientIp(headers)).toBe("192.0.2.50");
  });

  it("filtert leere XFF-Segmente vor der Hop-Wahl", () => {
    const headers = new Headers({
      "x-forwarded-for": "6.6.6.6, ,  ,192.0.2.50, ",
    });
    expect(getClientIp(headers)).toBe("192.0.2.50");
  });

  it("returnt 'unknown' wenn XFF nur aus Leer-Segmenten besteht", () => {
    const headers = new Headers({ "x-forwarded-for": " ,  , " });
    expect(getClientIp(headers)).toBe("unknown");
  });

  it("handhabt einen einzelnen XFF-Eintrag", () => {
    const headers = new Headers({ "x-forwarded-for": "192.0.2.50" });
    expect(getClientIp(headers)).toBe("192.0.2.50");
  });
});
