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

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 }
): Promise<RateLimitResult> {
  try {
    const key = `rate_limit:${identifier}`;

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
    console.error("[RateLimit] Redis error, allowing request:", (err as Error).message);
    // Graceful fallback: allow the request if Redis is unavailable
    return { success: true, remaining: config.maxRequests, reset: config.windowMs };
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
