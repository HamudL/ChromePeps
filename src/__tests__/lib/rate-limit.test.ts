import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Rate-Limiter-Tests: Redis-Pfad (Lua INCR+PEXPIRE) und vor allem der
 * In-Memory-Fallback, der bei Redis-Ausfall die Brute-Force-Schutz-
 * Schicht am Leben hält. Der Fallback hält Modul-State (Map) — daher
 * lädt jeder Test das Modul frisch via vi.resetModules().
 */
const { redisEvalMock } = vi.hoisted(() => ({ redisEvalMock: vi.fn() }));

vi.mock("@/lib/redis", () => ({ redis: { eval: redisEvalMock } }));

type RateLimitModule = typeof import("@/lib/rate-limit");

let mod: RateLimitModule;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  mod = await import("@/lib/rate-limit");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit · Redis-Pfad", () => {
  it("erlaubt Requests unterhalb des Limits und rechnet remaining/reset", async () => {
    redisEvalMock.mockResolvedValue([3, 42_000]);
    const result = await mod.rateLimit("login:1.2.3.4", {
      maxRequests: 5,
      windowMs: 60_000,
    });
    expect(result).toEqual({ success: true, remaining: 2, reset: 42_000 });
    // Key-Präfix + Window als ARGV.
    expect(redisEvalMock).toHaveBeenCalledWith(
      expect.stringContaining("INCR"),
      1,
      "rate_limit:login:1.2.3.4",
      "60000"
    );
  });

  it("Limit greift exakt AB maxRequests+1 (Grenzwert inklusive)", async () => {
    redisEvalMock.mockResolvedValue([5, 10_000]);
    const atLimit = await mod.rateLimit("id", {
      maxRequests: 5,
      windowMs: 60_000,
    });
    expect(atLimit.success).toBe(true);
    expect(atLimit.remaining).toBe(0);

    redisEvalMock.mockResolvedValue([6, 10_000]);
    const overLimit = await mod.rateLimit("id", {
      maxRequests: 5,
      windowMs: 60_000,
    });
    expect(overLimit.success).toBe(false);
    expect(overLimit.remaining).toBe(0); // nie negativ
  });

  it("fällt auf windowMs zurück wenn PTTL keinen Wert liefert (-1/-2)", async () => {
    redisEvalMock.mockResolvedValue([1, -1]);
    const result = await mod.rateLimit("id", {
      maxRequests: 5,
      windowMs: 30_000,
    });
    expect(result.reset).toBe(30_000);
  });

  it("nutzt die Default-Config (60 req / 60s) ohne explizite Config", async () => {
    redisEvalMock.mockResolvedValue([1, 60_000]);
    const result = await mod.rateLimit("id");
    expect(result.remaining).toBe(59);
  });
});

describe("rateLimit · In-Memory-Fallback bei Redis-Ausfall", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    redisEvalMock.mockRejectedValue(new Error("ECONNREFUSED"));
    errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("greift bei Redis-Fehler und zählt pro Key weiter (Limit hält)", async () => {
    const config = { maxRequests: 3, windowMs: 60_000 };
    expect((await mod.rateLimit("k", config)).success).toBe(true);
    expect((await mod.rateLimit("k", config)).success).toBe(true);
    const third = await mod.rateLimit("k", config);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = await mod.rateLimit("k", config);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(errorSpy).toHaveBeenCalled(); // Outage wird geloggt
  });

  it("isoliert Keys voneinander", async () => {
    const config = { maxRequests: 1, windowMs: 60_000 };
    expect((await mod.rateLimit("a", config)).success).toBe(true);
    expect((await mod.rateLimit("a", config)).success).toBe(false);
    // anderer Key → frisches Budget
    expect((await mod.rateLimit("b", config)).success).toBe(true);
  });

  it("Fenster läuft ab: nach windowMs beginnt ein frisches Budget", async () => {
    vi.useFakeTimers();
    const config = { maxRequests: 1, windowMs: 10_000 };

    expect((await mod.rateLimit("k", config)).success).toBe(true);
    expect((await mod.rateLimit("k", config)).success).toBe(false);

    // Kurz vor Ablauf: immer noch geblockt.
    vi.advanceTimersByTime(9_999);
    expect((await mod.rateLimit("k", config)).success).toBe(false);

    // Nach Ablauf: Bucket resettet, voller Erfolg inkl. remaining.
    vi.advanceTimersByTime(2);
    const fresh = await mod.rateLimit("k", config);
    expect(fresh.success).toBe(true);
    expect(fresh.remaining).toBe(0);
    expect(fresh.reset).toBe(10_000);
  });

  it("meldet die Rest-Zeit des Fensters als reset", async () => {
    vi.useFakeTimers();
    const config = { maxRequests: 5, windowMs: 10_000 };
    await mod.rateLimit("k", config);
    vi.advanceTimersByTime(4_000);
    const result = await mod.rateLimit("k", config);
    expect(result.reset).toBe(6_000);
  });

  it("Kapazitätsdeckel: bei 50k Buckets wird der älteste verdrängt", async () => {
    vi.useFakeTimers();
    const config = { maxRequests: 1, windowMs: 600_000 };

    // Ältester Eintrag, den die Verdrängung treffen muss.
    expect((await mod.rateLimit("victim", config)).success).toBe(true);

    // Map bis exakt zur Kappe füllen (50_000 Einträge inkl. "victim").
    for (let i = 0; i < 49_999; i++) {
      await mod.rateLimit(`filler-${i}`, config);
    }

    // Der 50_001te Key verdrängt "victim" (insertion-ordered eviction)...
    expect((await mod.rateLimit("overflow", config)).success).toBe(true);

    // ...sodass "victim" wieder ein frisches Budget hat. Ohne Eviction
    // wäre das hier der 2. Hit im Fenster → success false.
    const victimAgain = await mod.rateLimit("victim", config);
    expect(victimAgain.success).toBe(true);
  }, 30_000);

  it("Sweep räumt abgelaufene Buckets beim nächsten Zugriff weg", async () => {
    vi.useFakeTimers();
    const config = { maxRequests: 1, windowMs: 5_000 };
    await mod.rateLimit("stale", config);

    // > windowMs UND > Sweep-Intervall (10s) vorspulen, dann triggert
    // ein beliebiger Zugriff den Sweep ohne zu crashen.
    vi.advanceTimersByTime(15_000);
    expect((await mod.rateLimit("other", config)).success).toBe(true);
    expect((await mod.rateLimit("stale", config)).success).toBe(true);
  });
});

describe("rateLimitHeaders / rateLimitExceeded", () => {
  it("serialisiert remaining/reset als Header-Strings", () => {
    const headers = mod.rateLimitHeaders({
      success: false,
      remaining: 0,
      reset: 12_345,
    });
    expect(headers).toEqual({
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "12345",
    });
  });

  it("baut eine 429-Response mit aufgerundetem Retry-After in Sekunden", async () => {
    const res = mod.rateLimitExceeded({
      success: false,
      remaining: 0,
      reset: 1_500,
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("2"); // ceil(1.5s)
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
