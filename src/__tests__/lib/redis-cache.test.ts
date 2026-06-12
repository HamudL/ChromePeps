import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Cache-Helper aus @/lib/redis. Der ioredis-Client wird durch eine
 * Fake-Klasse ersetzt — getestet wird der Vertrag der Helper:
 * graceful fallback (nie werfen), JSON-(De)Serialisierung, EX-TTL und
 * der SCAN-Cursor-Loop von cacheDelPattern.
 */
const { instances, ctorArgs } = vi.hoisted(() => ({
  instances: [] as Array<{
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    scan: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    handlers: Map<string, (arg?: unknown) => void>;
  }>,
  ctorArgs: [] as Array<{ url: string; options: Record<string, unknown> }>,
}));

vi.mock("ioredis", () => {
  class FakeRedis {
    get = vi.fn();
    set = vi.fn();
    del = vi.fn();
    scan = vi.fn();
    handlers = new Map<string, (arg?: unknown) => void>();
    on = vi.fn((event: string, handler: (arg?: unknown) => void) => {
      this.handlers.set(event, handler);
      return this;
    });
    constructor(url: string, options: Record<string, unknown>) {
      ctorArgs.push({ url, options });
      instances.push(this as unknown as (typeof instances)[number]);
    }
  }
  return { default: FakeRedis };
});

type RedisModule = typeof import("@/lib/redis");

let mod: RedisModule;
let client: (typeof instances)[number];

beforeEach(async () => {
  vi.clearAllMocks();
  instances.length = 0;
  ctorArgs.length = 0;
  vi.resetModules();
  // redis.ts cached den Client an globalThis (dev/test) — für frische
  // Konstruktion pro Testlauf entfernen.
  (globalThis as { redis?: unknown }).redis = undefined;
  mod = await import("@/lib/redis");
  client = instances[0];
});

describe("Client-Konstruktion", () => {
  it("verbindet gegen REDIS_URL-Fallback localhost und registriert Handler", () => {
    expect(ctorArgs).toHaveLength(1);
    expect(ctorArgs[0].url).toMatch(/^redis:\/\//);
    expect(client.handlers.has("error")).toBe(true);
    expect(client.handlers.has("connect")).toBe(true);
  });

  it("retryStrategy: Exponential-Backoff mit 5s-Cap, gibt NIE auf (kein null)", () => {
    const retryStrategy = ctorArgs[0].options.retryStrategy as (
      times: number
    ) => number;
    expect(retryStrategy(1)).toBe(200);
    expect(retryStrategy(10)).toBe(2000);
    // Cap: auch nach hunderten Versuchen reconnecten wir weiter.
    expect(retryStrategy(1_000)).toBe(5000);
  });

  it("error-Handler loggt statt zu crashen; connect-Handler ist außerhalb von dev still", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    client.handlers.get("error")!(new Error("boom"));
    expect(errorSpy).toHaveBeenCalled();
    client.handlers.get("connect")!();
    expect(logSpy).not.toHaveBeenCalled(); // NODE_ENV=test ≠ development
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe("cacheGet", () => {
  it("deserialisiert JSON-Werte", async () => {
    client.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    await expect(mod.cacheGet<{ a: number }>("key")).resolves.toEqual({
      a: 1,
    });
  });

  it("returnt null bei Cache-Miss", async () => {
    client.get.mockResolvedValue(null);
    await expect(mod.cacheGet("key")).resolves.toBeNull();
  });

  it("graceful: Redis-Fehler → null statt Throw", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client.get.mockRejectedValue(new Error("down"));
    await expect(mod.cacheGet("key")).resolves.toBeNull();
    errorSpy.mockRestore();
  });

  it("graceful: kaputtes JSON im Cache → null statt Throw", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client.get.mockResolvedValue("{not-json");
    await expect(mod.cacheGet("key")).resolves.toBeNull();
    errorSpy.mockRestore();
  });
});

describe("cacheSet", () => {
  it("serialisiert und setzt die EX-TTL", async () => {
    client.set.mockResolvedValue("OK");
    await mod.cacheSet("key", { b: 2 }, 120);
    expect(client.set).toHaveBeenCalledWith(
      "key",
      JSON.stringify({ b: 2 }),
      "EX",
      120
    );
  });

  it("nutzt die Default-TTL von 60s", async () => {
    client.set.mockResolvedValue("OK");
    await mod.cacheSet("key", []);
    expect(client.set).toHaveBeenCalledWith("key", "[]", "EX", 60);
  });

  it("graceful bei Redis-Fehler", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client.set.mockRejectedValue(new Error("down"));
    await expect(mod.cacheSet("key", 1)).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});

describe("cacheDel", () => {
  it("löscht den Key", async () => {
    client.del.mockResolvedValue(1);
    await mod.cacheDel("key");
    expect(client.del).toHaveBeenCalledWith("key");
  });

  it("graceful bei Redis-Fehler", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client.del.mockRejectedValue(new Error("down"));
    await expect(mod.cacheDel("key")).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});

describe("cacheDelPattern", () => {
  it("folgt dem SCAN-Cursor über mehrere Seiten und löscht gefundene Keys", async () => {
    client.scan
      .mockResolvedValueOnce(["7", ["products:detail:a", "products:detail:b"]])
      .mockResolvedValueOnce(["0", ["products:detail:c"]]);
    client.del.mockResolvedValue(1);

    await mod.cacheDelPattern("products:detail:*");

    expect(client.scan).toHaveBeenNthCalledWith(
      1,
      "0",
      "MATCH",
      "products:detail:*",
      "COUNT",
      100
    );
    expect(client.scan).toHaveBeenNthCalledWith(
      2,
      "7",
      "MATCH",
      "products:detail:*",
      "COUNT",
      100
    );
    expect(client.del).toHaveBeenCalledWith(
      "products:detail:a",
      "products:detail:b"
    );
    expect(client.del).toHaveBeenCalledWith("products:detail:c");
  });

  it("ruft del NICHT auf wenn keine Keys matchen", async () => {
    client.scan.mockResolvedValue(["0", []]);
    await mod.cacheDelPattern("nix:*");
    expect(client.del).not.toHaveBeenCalled();
  });

  it("graceful bei Redis-Fehler mitten im Scan", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    client.scan.mockRejectedValue(new Error("down"));
    await expect(mod.cacheDelPattern("x:*")).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});
