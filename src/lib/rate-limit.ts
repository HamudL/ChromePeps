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

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 }
): Promise<RateLimitResult> {
  const key = `rate_limit:${identifier}`;
  const windowSec = Math.ceil(config.windowMs / 1000);

  const multi = redis.multi();
  multi.incr(key);
  multi.pttl(key);
  const results = await multi.exec();

  const count = (results?.[0]?.[1] as number) ?? 1;
  const ttl = (results?.[1]?.[1] as number) ?? -1;

  if (ttl === -1 || ttl === -2) {
    await redis.expire(key, windowSec);
  }

  const remaining = Math.max(0, config.maxRequests - count);
  const reset = ttl > 0 ? ttl : config.windowMs;

  return {
    success: count <= config.maxRequests,
    remaining,
    reset,
  };
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
