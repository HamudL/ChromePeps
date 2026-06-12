import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Session-Guards (requireAuth/requireAdmin/requireRole). next/navigation
 * redirect() wirft in Next echte Control-Flow-Exceptions — der Mock
 * bildet das nach, damit "redirect beendet die Funktion" auch im Test
 * gilt (sonst liefe der Code hinter redirect() weiter).
 */
const { authMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
// Überschreibt den globalen next/navigation-Mock aus setup.tsx, der
// kein redirect exportiert.
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import {
  requireAuth,
  requireAdmin,
  requireRole,
  getSession,
} from "@/lib/auth-helpers";
import type { Role } from "@prisma/client";

function session(role: string, id = "user_1") {
  return { user: { id, role, email: "u@example.com" } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("ohne Session → redirect /login", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("Session ohne user → redirect /login", async () => {
    authMock.mockResolvedValue({ user: undefined });
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("user.id === '' (User in DB gelöscht) → redirect /login", async () => {
    authMock.mockResolvedValue(session("USER", ""));
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("valide Session wird durchgereicht", async () => {
    const s = session("USER");
    authMock.mockResolvedValue(s);
    await expect(requireAuth()).resolves.toBe(s);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireAdmin", () => {
  it("Nicht-Admin → redirect auf Startseite", async () => {
    authMock.mockResolvedValue(session("USER"));
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it("Admin kommt durch", async () => {
    const s = session("ADMIN");
    authMock.mockResolvedValue(s);
    await expect(requireAdmin()).resolves.toBe(s);
  });

  it("anonyme Nutzer landen auf /login, nicht auf /", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});

describe("requireRole", () => {
  it("falsche Rolle → redirect /", async () => {
    authMock.mockResolvedValue(session("USER"));
    await expect(requireRole("ADMIN" as Role)).rejects.toThrow(
      "NEXT_REDIRECT:/"
    );
  });

  it("passende Rolle wird durchgereicht", async () => {
    const s = session("ADMIN");
    authMock.mockResolvedValue(s);
    await expect(requireRole("ADMIN" as Role)).resolves.toBe(s);
  });
});

describe("getSession", () => {
  it("reicht das auth()-Resultat ungefiltert durch (auch null)", async () => {
    authMock.mockResolvedValue(null);
    await expect(getSession()).resolves.toBeNull();
  });
});
