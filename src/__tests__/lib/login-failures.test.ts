import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Login-Failure-Counter (Captcha-Gate). Redis wird gemockt — Kontrakt:
 * Key-Format `login-fail:<email lowercase>`, TTL nur beim ERSTEN
 * Fehlversuch, und alle Funktionen fail-silent bei Redis-Ausfall
 * (die Rate-Limits bleiben die harte Verteidigung).
 */
const { redisMock } = vi.hoisted(() => ({
  redisMock: {
    get: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/redis", () => ({ redis: redisMock }));

import {
  getLoginFailureCount,
  recordLoginFailure,
  clearLoginFailures,
  loginFailKey,
  LOGIN_FAIL_TTL_SECONDS,
  CAPTCHA_THRESHOLD,
} from "@/lib/login-failures";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginFailKey", () => {
  it("lowercased die E-Mail — UI und authorize() teilen denselben Bucket", () => {
    expect(loginFailKey("User@Example.COM")).toBe(
      "login-fail:user@example.com"
    );
  });
});

describe("getLoginFailureCount", () => {
  it("liest den Zähler als Zahl", async () => {
    redisMock.get.mockResolvedValue("3");
    await expect(getLoginFailureCount("user@example.com")).resolves.toBe(3);
    expect(redisMock.get).toHaveBeenCalledWith("login-fail:user@example.com");
  });

  it("returnt 0 wenn kein Eintrag existiert", async () => {
    redisMock.get.mockResolvedValue(null);
    await expect(getLoginFailureCount("user@example.com")).resolves.toBe(0);
  });

  it("returnt 0 bei nicht-numerischem Wert (kaputter Key)", async () => {
    redisMock.get.mockResolvedValue("garbage");
    await expect(getLoginFailureCount("user@example.com")).resolves.toBe(0);
  });

  it("fail-silent: Redis-Fehler → 0 statt Throw", async () => {
    redisMock.get.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(getLoginFailureCount("user@example.com")).resolves.toBe(0);
  });
});

describe("recordLoginFailure", () => {
  it("setzt die TTL nur beim ERSTEN Fehlversuch", async () => {
    redisMock.incr.mockResolvedValue(1);
    await recordLoginFailure("user@example.com");
    expect(redisMock.expire).toHaveBeenCalledWith(
      "login-fail:user@example.com",
      LOGIN_FAIL_TTL_SECONDS
    );
  });

  it("lässt die TTL bei späteren Fehlversuchen unangetastet (Fenster wandert nicht)", async () => {
    redisMock.incr.mockResolvedValue(2);
    await recordLoginFailure("user@example.com");
    expect(redisMock.expire).not.toHaveBeenCalled();
  });

  it("fail-silent bei Redis-Fehler im incr", async () => {
    redisMock.incr.mockRejectedValue(new Error("down"));
    await expect(
      recordLoginFailure("user@example.com")
    ).resolves.toBeUndefined();
  });

  it("fail-silent bei Redis-Fehler im expire", async () => {
    redisMock.incr.mockResolvedValue(1);
    redisMock.expire.mockRejectedValue(new Error("down"));
    await expect(
      recordLoginFailure("user@example.com")
    ).resolves.toBeUndefined();
  });
});

describe("clearLoginFailures", () => {
  it("löscht den Zähler nach erfolgreichem Login", async () => {
    redisMock.del.mockResolvedValue(1);
    await clearLoginFailures("USER@example.com");
    expect(redisMock.del).toHaveBeenCalledWith("login-fail:user@example.com");
  });

  it("fail-silent bei Redis-Fehler", async () => {
    redisMock.del.mockRejectedValue(new Error("down"));
    await expect(
      clearLoginFailures("user@example.com")
    ).resolves.toBeUndefined();
  });
});

describe("Konstanten", () => {
  it("Threshold und TTL bleiben die abgestimmten Werte (UI ↔ Server-Sync)", () => {
    expect(CAPTCHA_THRESHOLD).toBe(2);
    expect(LOGIN_FAIL_TTL_SECONDS).toBe(600);
  });
});
