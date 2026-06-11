import { createHash, timingSafeEqual } from "crypto";

/**
 * Konstant-zeitiger String-Vergleich. Beide Seiten werden auf eine feste
 * Länge gehasht (SHA-256), damit timingSafeEqual nicht über die Länge
 * leakt und nicht bei Längenungleichheit wirft.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
