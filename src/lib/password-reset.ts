import "server-only";
import { createHash, randomBytes } from "crypto";

/**
 * Generates a raw password-reset token (sent in the email link) and its
 * SHA-256 hash (stored in the DB).
 *
 * Storing only the hash ensures that leaked DB contents cannot be used to
 * take over accounts — the raw token lives only in the email and the URL the
 * user clicks.
 */
export function generatePasswordResetToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("hex"); // 64 hex chars
  const tokenHash = hashResetToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
