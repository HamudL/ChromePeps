import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

// Atomic INCR + conditional PEXPIRE in einem einzigen Server-Roundtrip.
// Beim ersten Hit (count == 1) wird die TTL gesetzt; bei späteren Hits
// im selben Window bleibt die existierende TTL erhalten. Returnt
// [count, pttl] — beide nach dem INCR konsistent gelesen.
//
// Vorher: INCR + PTTL als MULTI, dann separater EXPIRE wenn TTL=-1.
// Race: zwischen INCR und EXPIRE konnten konkurrierende Requests den
// TTL versehentlich neu setzen, wodurch das Sliding-Window stottern
// konnte. Mit Lua läuft alles als ein Postgres-Statement-Äquivalent
// auf dem Redis-Server — kein Interleaving möglich.
const RATE_LIMIT_LUA = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {n, ttl}
`;

// In-Memory-Fallback für Redis-Ausfälle. Vorher war der Limiter komplett
// fail-open — ein Redis-Outage schaltete ALLE Brute-Force-/Enumeration-
// Schutzmechanismen (Login, 2FA, forgot-password, order-status, checkout)
// gleichzeitig ab, also genau im Stress-/Angriffsszenario. Der Map-basierte
// Fallback gilt nur pro Prozess (kein Cross-Container-Sharing) und ist
// damit schwächer als Redis, aber unendlich viel besser als "kein Limit".
// Memory-Bound: Einträge verfallen per windowMs; ein Sweep bei jedem
// Zugriff hält die Map klein (max. ein paar tausend aktive Keys).
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

function memoryRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();

  // Opportunistischer Sweep (max. 1×/10s): abgelaufene Buckets räumen.
  if (now - lastSweep > 10_000) {
    lastSweep = now;
    for (const [k, v] of memoryBuckets) {
      if (v.resetAt <= now) memoryBuckets.delete(k);
    }
  }

  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      reset: config.windowMs,
    };
  }

  existing.count += 1;
  return {
    success: existing.count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - existing.count),
    reset: Math.max(0, existing.resetAt - now),
  };
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 }
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`;
  try {
    const result = (await redis.eval(
      RATE_LIMIT_LUA,
      1, // KEYS count
      key,
      config.windowMs.toString(),
    )) as [number, number];

    const count = result[0];
    const ttl = result[1];

    const remaining = Math.max(0, config.maxRequests - count);
    const reset = ttl > 0 ? ttl : config.windowMs;

    return {
      success: count <= config.maxRequests,
      remaining,
      reset,
    };
  } catch (err) {
    console.error(
      "[RateLimit] Redis error, falling back to in-memory limiter:",
      (err as Error).message
    );
    return memoryRateLimit(key, config);
  }
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
}

export function rateLimitExceeded(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { success: false, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        ...rateLimitHeaders(result),
        "Retry-After": Math.ceil(result.reset / 1000).toString(),
      },
    }
  );
}
