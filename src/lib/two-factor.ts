import "server-only";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
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

// ── TOTP-Secret-Verschlüsselung at rest (AES-256-GCM) ───────────────────
//
// Das TOTP-Secret ist der "Generalschlüssel" der 2FA: wer es liest, kann
// beliebig gültige Codes erzeugen. Bisher lag es als Klartext-Base32 in der
// DB. Es wird jetzt at-rest mit AES-256-GCM verschlüsselt.
//
// Key: per scrypt aus AUTH_SECRET abgeleitet — KEIN neues Env-Var nötig.
// Mit TOTP_ENC_KEY lässt sich optional ein separater, stabiler Schlüssel
// setzen. WICHTIG: AUTH_SECRET (bzw. TOTP_ENC_KEY) darf nicht rotiert
// werden, sonst werden bestehende verschlüsselte Secrets unlesbar und
// betroffene User müssten 2FA neu einrichten. (AUTH_SECRET zu ändern
// invalidiert ohnehin alle Sessions — es ist bereits ein "do not rotate".)
//
// Rückwärtskompatibel (dual-read): Werte OHNE `enc:1:`-Marker gelten als
// Klartext-Altbestand und werden unverändert zurückgegeben — KEIN
// bestehender 2FA-User wird ausgesperrt. Migration: encrypt-on-write beim
// Setup + lazy re-encrypt nach erfolgreichem Login (src/lib/auth.ts).
const ENC_PREFIX = "enc:1:";
let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const material = process.env.TOTP_ENC_KEY || process.env.AUTH_SECRET;
  if (!material) {
    throw new Error(
      "TOTP-Verschlüsselung: weder TOTP_ENC_KEY noch AUTH_SECRET gesetzt.",
    );
  }
  // Fester, app-spezifischer Salt zur Domain-Trennung. Das Schlüssel-
  // Material (AUTH_SECRET) ist bereits hochentropisch, daher reicht ein
  // konstanter Salt — er muss nur stabil bleiben.
  cachedKey = scryptSync(material, "chromepeps:totp:enc:v1", 32);
  return cachedKey;
}

/** True, wenn `value` ein von uns verschlüsseltes Secret ist (Marker-Check). */
export function isEncryptedSecret(value: string): boolean {
  return typeof value === "string" && value.startsWith(ENC_PREFIX);
}

/**
 * Verschlüsselt ein Klartext-TOTP-Secret für die Ablage in der DB.
 * Format: `enc:1:` + base64( iv(12) || authTag(16) || ciphertext ).
 */
export function encryptTotpSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return (
    ENC_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64")
  );
}

/**
 * Entschlüsselt einen aus der DB gelesenen Secret-Wert.
 *
 * Dual-read: Werte ohne `enc:1:`-Marker (Klartext-Altbestand) werden
 * unverändert zurückgegeben. Schlägt die Entschlüsselung eines markierten
 * Werts fehl (Key rotiert / Daten korrupt), wird "" zurückgegeben, damit
 * die nachfolgende Code-Prüfung sauber als "ungültig" fehlschlägt, statt
 * die Route mit einem Throw zu crashen.
 */
export function decryptTotpSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) return stored;
  try {
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (err) {
    console.error("[2fa] TOTP-Secret konnte nicht entschlüsselt werden", err);
    return "";
  }
}

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
 * Validiert den TOTP-Code gegen das gespeicherte User-Secret. Nutzt das
 * oben konfigurierte ±1-Step-Window.
 *
 * `storedSecret` ist der DB-Wert und darf verschlüsselt (`enc:1:…`) ODER
 * Klartext-Altbestand sein — `decryptTotpSecret` handhabt beides. Caller
 * übergeben unverändert `user.totpSecret`.
 */
export function verifyTotpCode(token: string, storedSecret: string): boolean {
  // otplib wirft bei kaputten Tokens (z.B. Buchstaben drin) — lieber
  // try/catch als crash. Failure ist immer "code invalid".
  try {
    const secret = decryptTotpSecret(storedSecret);
    if (!secret) return false;
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
