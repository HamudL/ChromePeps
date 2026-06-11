import "server-only";
import { redis } from "@/lib/redis";

/**
 * Gemeinsamer Login-Failure-Counter für die Auth-Härtung.
 *
 * EINE Quelle für Konstanten, Key-Format und Redis-Zugriffe — vorher
 * lebten zwei unabhängige Kopien in auth-actions.ts (UX-Schicht) und
 * auth.ts (Enforcement im authorize()). Wer den Threshold nur an einer
 * Stelle geändert hätte, hätte UI und Server desynchronisiert: authorize
 * verlangt ein Captcha, das die Login-Seite nie einblendet.
 *
 * Konsumenten:
 *  - authorize() in src/lib/auth.ts: liest den Zähler (Captcha-Gate),
 *    inkrementiert bei Fehlversuchen.
 *  - checkLoginRateLimit (Server-Action): liest den Zähler, um der UI
 *    zu signalisieren, dass das hCaptcha-Widget gerendert werden muss.
 *  - events.signIn in auth.ts: löscht den Zähler nach Erfolg.
 *
 * Alle Funktionen sind fail-silent gegenüber Redis-Ausfällen — die
 * Rate-Limits (mit In-Memory-Fallback) bleiben die harte Verteidigung.
 */

export const LOGIN_FAIL_TTL_SECONDS = 600; // 10 Minuten, dann Reset
export const CAPTCHA_THRESHOLD = 2;

export function loginFailKey(email: string): string {
  return `login-fail:${email.toLowerCase()}`;
}

export async function getLoginFailureCount(email: string): Promise<number> {
  try {
    const raw = await redis.get(loginFailKey(email));
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function recordLoginFailure(email: string): Promise<void> {
  try {
    const key = loginFailKey(email);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, LOGIN_FAIL_TTL_SECONDS);
    }
  } catch {
    /* fail-silent */
  }
}

export async function clearLoginFailures(email: string): Promise<void> {
  try {
    await redis.del(loginFailKey(email));
  } catch {
    /* fail-silent */
  }
}
