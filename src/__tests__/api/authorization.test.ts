import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Autorisierungs- und IDOR-Tests für Route-Handler.
 *
 * Deckt die im Audit als ungetestet identifizierte Lücke: Admin-Rollencheck
 * (403 für nicht-Admins) und Ownership-Check (404 statt Fremdzugriff) werden
 * bislang nur durch den Code selbst garantiert, nicht durch Tests.
 *
 * Gemockt: `@/lib/auth` (Session steuern) und `@/lib/db` (Prisma-Stubs).
 */

// vi.mock wird an den Dateianfang gehoisted — die Mock-Objekte müssen daher
// via vi.hoisted() erzeugt werden, damit sie im Factory verfügbar sind.
const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    user: { findMany: vi.fn(), count: vi.fn() },
    order: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
  isPrismaUniqueError: () => false,
}));

import { NextRequest } from "next/server";
import { GET as adminUsersGet } from "@/app/api/admin/users/route";
import { GET as orderGet } from "@/app/api/orders/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/users — Admin-Rollencheck", () => {
  const req = () => new NextRequest("http://localhost/api/admin/users?page=1");

  it("ohne Session → 403", async () => {
    authMock.mockResolvedValue(null);
    const res = await adminUsersGet(req());
    expect(res.status).toBe(403);
    expect(dbMock.user.findMany).not.toHaveBeenCalled();
  });

  it("mit USER-Rolle → 403 (keine Admin-Rechte)", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } });
    const res = await adminUsersGet(req());
    expect(res.status).toBe(403);
    expect(dbMock.user.findMany).not.toHaveBeenCalled();
  });

  it("mit ADMIN-Rolle → 200", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    dbMock.user.findMany.mockResolvedValue([]);
    dbMock.user.count.mockResolvedValue(0);
    const res = await adminUsersGet(req());
    expect(res.status).toBe(200);
    expect(dbMock.user.findMany).toHaveBeenCalled();
  });
});

describe("GET /api/orders/[id] — IDOR-Ownership-Check", () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
  const foreignOrder = { id: "o1", userId: "owner", items: [], events: [] };

  it("ohne Session → 401", async () => {
    authMock.mockResolvedValue(null);
    const res = await orderGet({} as NextRequest, ctx("o1"));
    expect(res.status).toBe(401);
    expect(dbMock.order.findUnique).not.toHaveBeenCalled();
  });

  it("fremde Bestellung (anderer User) → 404, keine Datenpreisgabe", async () => {
    authMock.mockResolvedValue({ user: { id: "attacker", role: "USER" } });
    dbMock.order.findUnique.mockResolvedValue(foreignOrder);
    const res = await orderGet({} as NextRequest, ctx("o1"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
  });

  it("eigene Bestellung → 200", async () => {
    authMock.mockResolvedValue({ user: { id: "owner", role: "USER" } });
    dbMock.order.findUnique.mockResolvedValue(foreignOrder);
    const res = await orderGet({} as NextRequest, ctx("o1"));
    expect(res.status).toBe(200);
  });

  it("Admin darf fremde Bestellung sehen → 200", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    dbMock.order.findUnique.mockResolvedValue(foreignOrder);
    const res = await orderGet({} as NextRequest, ctx("o1"));
    expect(res.status).toBe(200);
  });
});
