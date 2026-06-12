import { describe, it, expect, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";

/**
 * Bearer-Auth für Cron-Endpoints. Kontrakt:
 *  - CRON_SECRET fehlt → 503 (fail-closed statt offener Endpoint)
 *  - falscher/fehlender Header → 401
 *  - exakter `Bearer <secret>` → null (Caller fährt fort)
 */
function makeRequest(authorization?: string): NextRequest {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return { headers } as unknown as NextRequest;
}

describe("checkCronAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returnt 503 wenn CRON_SECRET nicht konfiguriert ist", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const res = checkCronAuth(makeRequest("Bearer egal"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
    const json = await res!.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/CRON_SECRET/);
  });

  it("returnt 503 auch bei leerem CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = checkCronAuth(makeRequest("Bearer "));
    expect(res!.status).toBe(503);
  });

  it("returnt 401 ohne Authorization-Header", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const res = checkCronAuth(makeRequest());
    expect(res!.status).toBe(401);
    const json = await res!.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returnt 401 bei falschem Secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(checkCronAuth(makeRequest("Bearer wrong"))!.status).toBe(401);
  });

  it("returnt 401 wenn das Bearer-Prefix fehlt", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    // Nur das nackte Secret ohne "Bearer " — muss abgelehnt werden.
    expect(checkCronAuth(makeRequest("s3cret"))!.status).toBe(401);
  });

  it("returnt null bei korrektem Bearer-Token", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(checkCronAuth(makeRequest("Bearer s3cret"))).toBeNull();
  });

  it("ist case-sensitiv beim Secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(checkCronAuth(makeRequest("Bearer S3CRET"))!.status).toBe(401);
  });
});
