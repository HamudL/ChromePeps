import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    // Unbegrenzte Reconnects mit Exponential-Backoff (Cap 5 s). Vorher:
    // `times > 3 → null` — null heißt bei ioredis "gib endgültig auf",
    // der Client verbindet danach NIE wieder. Ein Redis-Neustart oder
    // kurzer Netz-Blip (> ~1,2 s) ließ Cache UND Rate-Limiter bis zum
    // Container-Neustart tot zurück. Die Request-Ebene bleibt durch
    // maxRetriesPerRequest=3 + die graceful cacheGet/Set/Del-Helper
    // geschützt — einzelne Aufrufe hängen also nicht am Backoff.
    retryStrategy(times) {
      return Math.min(times * 200, 5000);
    },
    // NOTE: removed lazyConnect — Redis must auto-connect on startup
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Redis] Connected");
    }
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ---- Cache Helpers (with graceful fallback) ----

const DEFAULT_TTL = 60; // seconds

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error("[Redis] cacheGet failed:", (err as Error).message);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    console.error("[Redis] cacheSet failed:", (err as Error).message);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("[Redis] cacheDel failed:", (err as Error).message);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error("[Redis] cacheDelPattern failed:", (err as Error).message);
  }
}
