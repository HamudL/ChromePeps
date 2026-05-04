import "server-only";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Schreibt eine AdminAuditLog-Zeile. Best-effort: wenn der DB-Write
 * failed, wird der Hauptpfad NICHT abgebrochen — Audit-Log ist
 * Compliance, nicht Geschäftslogik. Logging läuft fire-and-forget,
 * Fehler landen in console.error.
 *
 * Aufruf-Pattern in einer Admin-Route:
 *
 *   await writeAuditLog(req, {
 *     action: "refund",
 *     entity: "order",
 *     entityId: order.id,
 *     payload: { amountInCents, reason },
 *   });
 *
 * Actor-ID + Email werden aus der Session geholt (auth() ist async,
 * wir ziehen sie hier rein damit der Caller das nicht selbst machen
 * muss).
 *
 * AUDIT_REPORT_v3 §4.14.
 */

interface AuditEntry {
  action: string;
  entity: string;
  entityId: string;
  payload?: unknown;
}

export async function writeAuditLog(
  req: NextRequest | Request | null,
  entry: AuditEntry,
): Promise<void> {
  try {
    const session = await auth();
    const actor = session?.user;

    const userAgent = req?.headers.get("user-agent") ?? null;
    // X-Forwarded-For kann eine Liste sein ("client, proxy1, proxy2") —
    // erste IP ist der echte Client.
    const ipHeader =
      req?.headers.get("x-forwarded-for") ??
      req?.headers.get("x-real-ip") ??
      null;
    const ipAddress = ipHeader?.split(",")[0]?.trim() ?? null;

    await db.adminAuditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        // Prisma's JSON field unterscheidet zwischen `Prisma.JsonNull`
        // (DB-NULL setzen) und `undefined` (Feld komplett überspringen).
        // Wir behandeln undefined als "kein Payload" → nicht setzen.
        payload:
          entry.payload === undefined
            ? Prisma.JsonNull
            : (entry.payload as Prisma.InputJsonValue),
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
        ipAddress: ipAddress ? ipAddress.slice(0, 64) : null,
      },
    });
  } catch (err) {
    // Best-effort: Audit-Log-Failure darf den Haupt-Flow nicht crashen.
    console.error(
      "[admin-audit] writeAuditLog failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
