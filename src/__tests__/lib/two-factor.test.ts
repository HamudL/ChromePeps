import { describe, it, expect } from "vitest";
import { authenticator } from "otplib";
// Deterministischer Schlüssel für die Verschlüsselungs-Tests. MUSS gesetzt
// sein, bevor encrypt/decrypt zum ersten Mal laufen (der abgeleitete Key
// wird in two-factor.ts modulweit gecached).
process.env.TOTP_ENC_KEY = "test-totp-enc-key-0123456789abcdef";

import {
  generateTotpSecret,
  buildOtpauthUrl,
  verifyTotpCode,
  generateRecoveryCodes,
  consumeRecoveryCode,
  encryptTotpSecret,
  decryptTotpSecret,
  isEncryptedSecret,
} from "@/lib/two-factor";

/**
 * Tests für den 2FA-Helper (`@/lib/two-factor`).
 *
 * AUDIT_REPORT_v3 §4.2.
 *
 * Wir testen die zwei nicht-trivialen Pfade:
 *   1. TOTP-Round-Trip (generate → check) — verifiziert dass unsere
 *      Wrapper-Konfiguration (window=1) korrekt durchschlägt.
 *   2. Recovery-Code-One-Time-Use — kritischer Sicherheits-Pfad.
 *      Bei Bug würde ein Code mehrfach funktionieren.
 *
 * QR-Generation testen wir NICHT (qrcode-Lib ist battle-tested und
 * Output ist deterministisch).
 */

describe("generateTotpSecret", () => {
  it("erzeugt unterschiedliche Base32-Secrets bei jedem Call", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
    // otplib generiert Base32 (A–Z, 2–7), Default-Length 32.
    expect(a).toMatch(/^[A-Z2-7]+$/);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});

describe("buildOtpauthUrl", () => {
  it("schreibt Issuer + Account-Email in die URL", () => {
    const url = buildOtpauthUrl("JBSWY3DPEHPK3PXP", "user@example.com");
    expect(url).toContain("otpauth://totp/");
    // otplib URL-encoded den Account-Label, also `@` → `%40`.
    expect(url).toContain("user%40example.com");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    // Issuer sollte sowohl im Pfad als auch im issuer-Param landen
    expect(url).toMatch(/issuer=/);
  });
});

describe("verifyTotpCode", () => {
  it("akzeptiert den aktuellen Code des Secrets", () => {
    const secret = generateTotpSecret();
    const currentCode = authenticator.generate(secret);
    expect(verifyTotpCode(currentCode, secret)).toBe(true);
  });

  it("lehnt einen falschen 6-stelligen Code ab", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("000000", secret)).toBe(false);
  });

  it("crasht nicht bei kaputtem Input (Buchstaben)", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("abcdef", secret)).toBe(false);
    expect(verifyTotpCode("", secret)).toBe(false);
  });

  it("trimmt Whitespace aus dem Code", () => {
    const secret = generateTotpSecret();
    const currentCode = authenticator.generate(secret);
    expect(verifyTotpCode(`  ${currentCode}  `, secret)).toBe(true);
  });

  it("verifiziert einen Code gegen ein VERSCHLÜSSELTES Secret", () => {
    const secret = generateTotpSecret();
    const stored = encryptTotpSecret(secret);
    const currentCode = authenticator.generate(secret);
    expect(verifyTotpCode(currentCode, stored)).toBe(true);
  });

  it("lehnt falschen Code gegen verschlüsseltes Secret ab", () => {
    const stored = encryptTotpSecret(generateTotpSecret());
    expect(verifyTotpCode("000000", stored)).toBe(false);
  });
});

describe("TOTP-Secret-Verschlüsselung (at rest)", () => {
  it("Round-Trip: decrypt(encrypt(x)) === x, mit Marker", () => {
    const secret = generateTotpSecret();
    const enc = encryptTotpSecret(secret);
    expect(enc).not.toBe(secret);
    expect(enc.startsWith("enc:1:")).toBe(true);
    expect(decryptTotpSecret(enc)).toBe(secret);
  });

  it("erzeugt pro Call unterschiedliche Ciphertexts (zufälliger IV)", () => {
    const secret = generateTotpSecret();
    expect(encryptTotpSecret(secret)).not.toBe(encryptTotpSecret(secret));
  });

  it("isEncryptedSecret erkennt verschlüsselt vs. Klartext", () => {
    expect(isEncryptedSecret(encryptTotpSecret("JBSWY3DPEHPK3PXP"))).toBe(true);
    expect(isEncryptedSecret("JBSWY3DPEHPK3PXP")).toBe(false);
    expect(isEncryptedSecret("")).toBe(false);
  });

  it("dual-read: Klartext-Altbestand wird unverändert durchgereicht", () => {
    const legacy = "JBSWY3DPEHPK3PXP";
    expect(decryptTotpSecret(legacy)).toBe(legacy);
  });

  it('gibt "" zurück, wenn ein markierter Wert manipuliert wurde (GCM-Auth)', () => {
    const enc = encryptTotpSecret(generateTotpSecret());
    // ein Zeichen im base64-Payload kippen → Auth-Tag passt nicht mehr
    const chars = enc.split("");
    const idx = 10; // innerhalb des Payloads (nach dem 6-Zeichen-Marker)
    chars[idx] = chars[idx] === "A" ? "B" : "A";
    const tampered = chars.join("");
    expect(tampered).not.toBe(enc);
    expect(decryptTotpSecret(tampered)).toBe("");
  });
});

describe("generateRecoveryCodes", () => {
  it("erzeugt 10 Plain-Codes plus 10 bcrypt-Hashes", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    expect(plain).toHaveLength(10);
    expect(hashed).toHaveLength(10);
    // Plain-Codes haben das Format XXXX-XXXX (8 Chars + Bindestrich)
    for (const code of plain) {
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
    // Hashes sehen nach bcrypt aus
    for (const hash of hashed) {
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    }
  });

  it("erzeugt 10 unterschiedliche Plain-Codes", async () => {
    const { plain } = await generateRecoveryCodes();
    const unique = new Set(plain);
    expect(unique.size).toBe(10);
  });
});

describe("consumeRecoveryCode", () => {
  it("matcht einen gültigen Code und entfernt seinen Hash aus der Liste", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    const remaining = await consumeRecoveryCode(plain[3], hashed);
    expect(remaining).not.toBeNull();
    expect(remaining).toHaveLength(9);
    // Der gerade verbrauchte Hash darf nicht mehr drin sein
    expect(remaining!.includes(hashed[3])).toBe(false);
  });

  it("returnt null wenn der Code nicht in der Liste ist", async () => {
    const { hashed } = await generateRecoveryCodes();
    const remaining = await consumeRecoveryCode("XXXX-YYYY", hashed);
    expect(remaining).toBeNull();
  });

  it("akzeptiert auch Input ohne Bindestrich", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    const noDash = plain[0].replace("-", "");
    const remaining = await consumeRecoveryCode(noDash, hashed);
    expect(remaining).toHaveLength(9);
  });

  it("akzeptiert auch Input in Kleinbuchstaben", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    const lower = plain[0].toLowerCase();
    const remaining = await consumeRecoveryCode(lower, hashed);
    expect(remaining).toHaveLength(9);
  });

  it("erlaubt jeden Code nur einmal (one-time use)", async () => {
    const { plain, hashed } = await generateRecoveryCodes();
    const code = plain[5];
    const after1st = await consumeRecoveryCode(code, hashed);
    expect(after1st).toHaveLength(9);

    // Zweites Verwenden gegen die GEKÜRZTE Liste muss fehlschlagen
    const after2nd = await consumeRecoveryCode(code, after1st!);
    expect(after2nd).toBeNull();
  });
});
