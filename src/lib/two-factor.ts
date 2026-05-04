import "server-only";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { APP_NAME } from "@/lib/constants";

/**
 * 2FA / TOTP Helper. Wrapper um `otplib` plus Recovery-Code-
 * Generierung + Bcrypt-Hashing.
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 *
 * Algorithm: TOTP nach RFC 6238 mit SHA-1 (defacto Standard für
 * Google Authenticator / Authy / 1Password / Bitwarden etc.). 30s
 * Step, 6 Digits, Window von 1 Step (also ±30s Toleranz).
 */

// otplib defaults sind bereits Standard-TOTP (SHA-1, 30s, 6 digits).
// Window=1 erlaubt User die letzte ODER nächste Step zu nutzen — das
// federt Clock-Skew zwischen Server und User-Device ab. Mehr als 1
// macht Brute-Force leichter.
authenticator.options = { window: 1 };

const RECOVERY_CODE_COUNT = 10;
// 4-4-Format mit Bindestrich, z.B. "ABCD-1234". 8 Char Crockford-
// Base32-ähnlich (kein 0/O/1/I). 32^8 ≈ 1e12 Möglichkeiten — reichlich.
const RECOVERY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Build the otpauth:// URL der QR-Code-Apps wie Google Authenticator
 * oder Bitwarden direkt parsen können. Issuer + Account-Label landen
 * in der App als "ChromePeps (user@example.com)".
 */
export function buildOtpauthUrl(secret: string, accountEmail: string): string {
  return authenticator.keyuri(accountEmail, APP_NAME, secret);
}

/**
 * Validiert den TOTP-Code gegen das User-Secret. Nutzt das oben
 * konfigurierte ±1-Step-Window.
 */
export function verifyTotpCode(token: string, secret: string): boolean {
  // otplib wirft bei kaputten Tokens (z.B. Buchstaben drin) — lieber
  // try/catch als crash. Failure ist immer "code invalid".
  try {
    return authenticator.check(token.trim(), secret);
  } catch {
    return false;
  }
}

/**
 * Generiert N Recovery-Codes. Returnt sie als Plain-Text PLUS als
 * bcrypt-Hashes — der Caller zeigt die Plain-Codes EINMAL dem User
 * und persistiert die Hashes in `User.totpRecoveryCodes`.
 */
export async function generateRecoveryCodes(): Promise<{
  plain: string[];
  hashed: string[];
}> {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    generateRecoveryCode(),
  );
  const hashed = await Promise.all(
    plain.map((code) => bcrypt.hash(code, 10)),
  );
  return { plain, hashed };
}

function generateRecoveryCode(): string {
  // 8 Zufalls-Chars aus dem Alphabet, in 4-4 mit Bindestrich.
  // randomBytes(8) → 8 Bytes → wir mappen jedes Byte auf einen Char.
  // Kein modulo-bias-Drama weil 256 % 32 == 0.
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => RECOVERY_CODE_CHARS[b % 32]).join(
    "",
  );
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/**
 * Versucht den eingegebenen Code als Recovery-Code gegen die Liste
 * der bcrypt-Hashes zu matchen. Bei Treffer wird der Hash entfernt
 * (one-time use) und die neue Liste returnt — Caller muss persisten.
 *
 * Returnt `null` wenn kein Match.
 */
export async function consumeRecoveryCode(
  inputCode: string,
  hashes: string[],
): Promise<string[] | null> {
  const normalized = inputCode.trim().toUpperCase().replace(/\s+/g, "");
  // Akzeptiere User-Input mit oder ohne Bindestrich — viele tippen
  // den Code ohne separator ab.
  const withDash =
    normalized.length === 8
      ? `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`
      : normalized;

  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    if (await bcrypt.compare(withDash, hash)) {
      // Entferne diesen Hash. One-time use ist die Grundregel.
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}
