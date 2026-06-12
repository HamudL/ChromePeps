import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * requireWissenAdmin — API-Guard-Kontrakt: non-Admin → fertige
 * 403-NextResponse (Caller returnt sie direkt), Admin → null
 * (Caller macht weiter).
 */
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: authMock }));

import { requireWissenAdmin } from "@/lib/wissen/admin-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireWissenAdmin", () => {
  it("ohne Session → 403 mit Unauthorized-Body", async () => {
    authMock.mockResolvedValue(null);

    const guard = await requireWissenAdmin();

    expect(guard).not.toBeNull();
    expect(guard!.status).toBe(403);
    await expect(guard!.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });

  it("Session ohne user → 403", async () => {
    authMock.mockResolvedValue({ user: undefined });
    const guard = await requireWissenAdmin();
    expect(guard!.status).toBe(403);
  });

  it("eingeloggt, aber keine ADMIN-Rolle → 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const guard = await requireWissenAdmin();
    expect(guard!.status).toBe(403);
  });

  it("ADMIN → null (Route darf weitermachen)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    await expect(requireWissenAdmin()).resolves.toBeNull();
  });
});
