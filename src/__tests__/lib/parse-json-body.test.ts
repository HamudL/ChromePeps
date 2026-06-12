import { describe, it, expect } from "vitest";
import { parseJsonBody } from "@/lib/api/parse-json-body";

/**
 * Kontrakt: kaputter/leerer Body → null (Caller → 400 bzw. Zod lehnt
 * null ab). NIEMALS `{}` als Fallback — sonst ginge Garbage bei
 * all-optionalen Schemas still als "leeres Update" durch.
 */
describe("parseJsonBody", () => {
  function makeRequest(body: string | null): Request {
    return new Request("http://localhost/api/test", {
      method: "POST",
      body,
    });
  }

  it("parst validen JSON-Body", async () => {
    const req = makeRequest(JSON.stringify({ name: "BPC-157", qty: 2 }));
    await expect(parseJsonBody(req)).resolves.toEqual({
      name: "BPC-157",
      qty: 2,
    });
  });

  it("returnt null bei syntaktisch kaputtem JSON", async () => {
    const req = makeRequest("{not json");
    await expect(parseJsonBody(req)).resolves.toBeNull();
  });

  it("returnt null bei leerem Body", async () => {
    const req = makeRequest(null);
    await expect(parseJsonBody(req)).resolves.toBeNull();
  });

  it("reicht JSON-Primitive durch (kein {}-Fallback)", async () => {
    await expect(parseJsonBody(makeRequest("null"))).resolves.toBeNull();
    await expect(parseJsonBody(makeRequest("false"))).resolves.toBe(false);
    await expect(parseJsonBody(makeRequest("42"))).resolves.toBe(42);
    await expect(parseJsonBody(makeRequest('"str"'))).resolves.toBe("str");
  });

  it("parst Top-Level-Arrays", async () => {
    await expect(parseJsonBody(makeRequest("[1,2]"))).resolves.toEqual([1, 2]);
  });
});
