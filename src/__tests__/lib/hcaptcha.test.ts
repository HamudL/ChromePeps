import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyHCaptcha } from "@/lib/hcaptcha";

/**
 * hCaptcha-Server-Verification. Kontrakt:
 *  - kein Token → false (Caller blockt)
 *  - kein Secret: dev → fail-OPEN (true), production → fail-CLOSED (false)
 *  - non-200 / Netzwerkfehler / Timeout → fail-CLOSED (false)
 *  - hCaptcha-Antwort entscheidet: Boolean(success)
 *
 * fetch wird global gestubbt — kein echter API-Call.
 */
const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("HCAPTCHA_SECRET", "0xSECRET");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Server Error",
    json: async () => body,
  };
}

describe("verifyHCaptcha", () => {
  it("leerer Token → false ohne API-Call", async () => {
    await expect(verifyHCaptcha("")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("kein Secret in dev/test → fail-OPEN (true), kein API-Call", async () => {
    vi.stubEnv("HCAPTCHA_SECRET", "");
    await expect(verifyHCaptcha("token-123")).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("kein Secret in production → fail-CLOSED (false) mit Error-Log", async () => {
    vi.stubEnv("HCAPTCHA_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(verifyHCaptcha("token-123")).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("HCAPTCHA_SECRET fehlt in Production")
    );
  });

  it("POSTet secret+response als Form-Params an siteverify", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));

    await expect(verifyHCaptcha("token-abc")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.hcaptcha.com/siteverify",
      expect.objectContaining({ method: "POST" })
    );
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("secret")).toBe("0xSECRET");
    expect(body.get("response")).toBe("token-abc");
  });

  it("non-200 von siteverify → fail-CLOSED (false)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 502));
    await expect(verifyHCaptcha("token-abc")).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("non-200")
    );
  });

  it("success:false mit error-codes → false und Codes im Log", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, "error-codes": ["invalid-input-response"] })
    );
    await expect(verifyHCaptcha("verbrauchter-token")).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalledWith(
      "[hcaptcha] verification failed:",
      ["invalid-input-response"]
    );
  });

  it("success:false ohne error-codes → false ohne Zusatz-Log", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }));
    await expect(verifyHCaptcha("token")).resolves.toBe(false);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("kaputtes success-Feld wird zu Boolean gecastet", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: undefined }));
    await expect(verifyHCaptcha("token")).resolves.toBe(false);
  });

  it("Netzwerkfehler (Error) → fail-CLOSED (false)", async () => {
    fetchMock.mockRejectedValue(new Error("ETIMEDOUT"));
    await expect(verifyHCaptcha("token")).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[hcaptcha] verify request failed:",
      "ETIMEDOUT"
    );
  });

  it("non-Error-Throw (z.B. Abort-Reason) → fail-CLOSED ohne Crash", async () => {
    fetchMock.mockRejectedValue("timeout");
    await expect(verifyHCaptcha("token")).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[hcaptcha] verify request failed:",
      "timeout"
    );
  });
});
