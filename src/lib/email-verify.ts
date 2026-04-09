import "server-only";
import { createHash, randomBytes } from "crypto";

/**
 * Email verification tokens.
 *
 * Uses the existing Auth.js `VerificationToken` table (identifier + token +
 * expires). We store the SHA-256 hash of the raw token as the "token" field,
 * so a leaked DB row cannot be used to verify an account. The identifier is
 * the user's email (as NextAuth expects).
 */

export function generateEmailVerifyToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = randomBytes(32).toString("hex"); // 64 hex chars
  const tokenHash = hashEmailVerifyToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashEmailVerifyToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
