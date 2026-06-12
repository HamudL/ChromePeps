import { describe, it, expect } from "vitest";
import { createHash } from "crypto";
import {
  generatePasswordResetToken,
  hashResetToken,
} from "@/lib/password-reset";
import {
  generateEmailVerifyToken,
  hashEmailVerifyToken,
} from "@/lib/email-verify";

/**
 * Token-Hash-Roundtrips für Password-Reset und E-Mail-Verifikation.
 *
 * Sicherheitskontrakt: In der DB liegt NUR der SHA-256-Hash — der
 * Raw-Token existiert ausschließlich im Mail-Link. Die Tests stellen
 * sicher, dass generate→hash konsistent ist (sonst wäre jeder
 * verschickte Link sofort ungültig) und dass Tokens nicht kollidieren.
 */
describe("password-reset tokens", () => {
  it("liefert 64-Hex-Zeichen-Raw-Token und passenden Hash", () => {
    const { rawToken, tokenHash } = generatePasswordResetToken();
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashResetToken(rawToken)).toBe(tokenHash);
  });

  it("Hash entspricht SHA-256 (DB-Lookup-Kompatibilität)", () => {
    const { rawToken, tokenHash } = generatePasswordResetToken();
    const expected = createHash("sha256").update(rawToken).digest("hex");
    expect(tokenHash).toBe(expected);
  });

  it("Hash ist deterministisch, Token sind einmalig", () => {
    const a = generatePasswordResetToken();
    const b = generatePasswordResetToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.tokenHash).not.toBe(b.tokenHash);
    expect(hashResetToken(a.rawToken)).toBe(a.tokenHash);
  });

  it("Hash unterscheidet sich vom Raw-Token (kein Klartext in DB)", () => {
    const { rawToken, tokenHash } = generatePasswordResetToken();
    expect(tokenHash).not.toBe(rawToken);
  });
});

describe("email-verify tokens", () => {
  it("liefert 64-Hex-Zeichen-Raw-Token und passenden Hash", () => {
    const { rawToken, tokenHash } = generateEmailVerifyToken();
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(hashEmailVerifyToken(rawToken)).toBe(tokenHash);
  });

  it("Hash entspricht SHA-256", () => {
    const { rawToken, tokenHash } = generateEmailVerifyToken();
    const expected = createHash("sha256").update(rawToken).digest("hex");
    expect(tokenHash).toBe(expected);
  });

  it("zwei Generierungen kollidieren nicht", () => {
    const a = generateEmailVerifyToken();
    const b = generateEmailVerifyToken();
    expect(a.rawToken).not.toBe(b.rawToken);
  });

  it("falscher Raw-Token matcht den gespeicherten Hash nicht", () => {
    const { tokenHash } = generateEmailVerifyToken();
    expect(hashEmailVerifyToken("a".repeat(64))).not.toBe(tokenHash);
  });
});
