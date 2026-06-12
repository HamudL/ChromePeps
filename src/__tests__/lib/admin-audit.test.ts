import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

/**
 * writeAuditLog — Compliance-Schreiber mit Best-effort-Kontrakt:
 *  - Actor kommt aus der Session (auth() wird hier drin aufgerufen)
 *  - "unknown"-IP → DB-NULL; UA/IP werden auf Spaltenlänge gekappt
 *  - payload undefined → Prisma.JsonNull (Feld nicht überspringen)
 *  - JEDER Fehler (auth, DB) wird geschluckt — Audit darf den
 *    Admin-Hauptpfad nie crashen
 */
const { authMock, auditCreateMock, getClientIpMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  auditCreateMock: vi.fn(),
  getClientIpMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/db", () => ({
  db: { adminAuditLog: { create: auditCreateMock } },
}));
vi.mock("@/lib/client-ip", () => ({ getClientIp: getClientIpMock }));

import { writeAuditLog } from "@/lib/admin-audit";

function makeReq(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/admin/orders", { headers });
}

const entry = { action: "refund", entity: "order", entityId: "order_1" };

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({
    user: { id: "admin_1", email: "admin@example.com" },
  });
  auditCreateMock.mockResolvedValue({});
  getClientIpMock.mockReturnValue("203.0.113.7");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("writeAuditLog", () => {
  it("schreibt Actor, Request-Metadaten und Payload in eine Zeile", async () => {
    const req = makeReq({ "user-agent": "Mozilla/5.0 AdminBrowser" });

    await writeAuditLog(req, { ...entry, payload: { amountInCents: 999 } });

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: {
        actorId: "admin_1",
        actorEmail: "admin@example.com",
        action: "refund",
        entity: "order",
        entityId: "order_1",
        payload: { amountInCents: 999 },
        userAgent: "Mozilla/5.0 AdminBrowser",
        ipAddress: "203.0.113.7",
      },
    });
  });

  it("ohne Session und ohne Request → alle Kontextfelder NULL", async () => {
    authMock.mockResolvedValue(null);
    getClientIpMock.mockReturnValue("unknown");

    await writeAuditLog(null, entry);

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        actorEmail: null,
        userAgent: null,
        ipAddress: null,
      }),
    });
  });

  it("payload undefined → Prisma.JsonNull statt Feld-Skip", async () => {
    await writeAuditLog(null, entry);

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ payload: Prisma.JsonNull }),
    });
  });

  it("'unknown'-IP wird auf DB-NULL gemappt", async () => {
    getClientIpMock.mockReturnValue("unknown");
    const req = makeReq({ "user-agent": "UA" });

    await writeAuditLog(req, entry);

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ ipAddress: null, userAgent: "UA" }),
    });
  });

  it("kappt User-Agent auf 500 und IP auf 64 Zeichen (Spaltenlimits)", async () => {
    getClientIpMock.mockReturnValue("x".repeat(100));
    const req = makeReq({ "user-agent": "A".repeat(600) });

    await writeAuditLog(req, entry);

    const data = auditCreateMock.mock.calls[0][0].data;
    expect(data.userAgent).toHaveLength(500);
    expect(data.ipAddress).toHaveLength(64);
  });

  it("Session ohne id/email → NULL-Fallbacks statt undefined", async () => {
    authMock.mockResolvedValue({ user: {} });

    await writeAuditLog(null, entry);

    expect(auditCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: null, actorEmail: null }),
    });
  });

  it("best-effort: DB-Fehler wird geschluckt und geloggt, kein Throw", async () => {
    auditCreateMock.mockRejectedValue(new Error("connection lost"));

    await expect(writeAuditLog(null, entry)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "[admin-audit] writeAuditLog failed:",
      "connection lost"
    );
  });

  it("best-effort: auch non-Error-Throws (z.B. aus auth()) crashen nicht", async () => {
    authMock.mockRejectedValue("session backend down");

    await expect(writeAuditLog(null, entry)).resolves.toBeUndefined();
    expect(auditCreateMock).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      "[admin-audit] writeAuditLog failed:",
      "session backend down"
    );
  });
});
