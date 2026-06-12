import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * sendMail-Retry-Matrix (lib/mail/client.ts). Kontrakt:
 *  - never-throw: jeder Fehlerpfad endet in einem Result-Objekt
 *  - transiente Fehler (429, 5xx, Netzwerk-Throw) → Retry mit
 *    Backoff 1s/5s, max. 3 Versuche
 *  - 4xx-Validierungsfehler → KEIN Retry (würde identisch failen)
 *  - retries-Option: 0 = genau 1 Versuch (interaktive Pfade),
 *    Werte > 2 werden auf die Backoff-Stufen geclamped
 *  - fehlender RESEND_API_KEY → skipped, kein Send-Versuch
 *
 * Resend-SDK wird gemockt; Backoffs laufen über Fake-Timer.
 */
const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmailMock };
  },
}));

type ClientModule = typeof import("@/lib/mail/client");

/**
 * Frischer Modul-Import pro Test: client.ts cached den Resend-Client
 * modulglobal — ohne resetModules würde der "kein API-Key"-Fall nach
 * einem Test mit Key nie mehr eintreten.
 */
async function importClient(): Promise<ClientModule> {
  vi.resetModules();
  return import("@/lib/mail/client");
}

const reactStub = { type: "div" } as unknown as React.ReactElement;

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    to: "kunde@example.com",
    subject: "Test",
    react: reactStub,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("getResendClient", () => {
  it("returnt null ohne RESEND_API_KEY", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { getResendClient } = await importClient();
    expect(getResendClient()).toBeNull();
  });

  it("cached den Client über mehrere Aufrufe (Singleton)", async () => {
    const { getResendClient } = await importClient();
    const first = getResendClient();
    expect(first).not.toBeNull();
    expect(getResendClient()).toBe(first);
  });
});

describe("sendMail — Skip ohne API-Key", () => {
  it("skipped ohne Send-Versuch und nennt alle Empfänger im Log", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendMail } = await importClient();

    const result = await sendMail(
      baseInput({ to: ["a@example.com", "b@example.com"] })
    );

    expect(result).toEqual({
      success: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("a@example.com,b@example.com")
    );
  });
});

describe("sendMail — Erfolgspfad", () => {
  it("sendet mit Default-From/Reply-To und mappt Attachments", async () => {
    // ?? greift nur bei undefined — Var komplett entfernen, nicht leeren.
    vi.stubEnv("MAIL_FROM", undefined);
    vi.stubEnv("MAIL_REPLY_TO", undefined);
    const { sendMail } = await importClient();
    sendEmailMock.mockResolvedValue({ data: { id: "email_1" }, error: null });

    const pdf = Buffer.from("pdf");
    const result = await sendMail(
      baseInput({ attachments: [{ filename: "coa.pdf", content: pdf }] })
    );

    expect(result).toEqual({ success: true, id: "email_1" });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "ChromePeps <no-reply@chromepeps.com>",
        replyTo: "support@chromepeps.com",
        to: "kunde@example.com",
        attachments: [{ filename: "coa.pdf", content: pdf }],
        // Default-Tag "email" landet als Resend-Kategorie
        tags: [{ name: "category", value: "email" }],
      })
    );
  });

  it("respektiert MAIL_FROM/MAIL_REPLY_TO/tag und verkraftet data=null", async () => {
    vi.stubEnv("MAIL_FROM", "Shop <shop@example.com>");
    vi.stubEnv("MAIL_REPLY_TO", "help@example.com");
    const { sendMail } = await importClient();
    // Resend kann (laut Typ) data null liefern — id bleibt dann undefined.
    sendEmailMock.mockResolvedValue({ data: null, error: null });

    const result = await sendMail(
      baseInput({ to: ["x@example.com", "y@example.com"], tag: "order" })
    );

    expect(result).toEqual({ success: true, id: undefined });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Shop <shop@example.com>",
        replyTo: "help@example.com",
        tags: [{ name: "category", value: "order" }],
        attachments: undefined,
      })
    );
  });
});

describe("sendMail — Fehler-Klassifikation", () => {
  it("4xx-Validierungsfehler wird NICHT retried (genau 1 Versuch)", async () => {
    const { sendMail } = await importClient();
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { statusCode: 422, name: "validation_error", message: "bad to" },
    });

    const result = await sendMail(baseInput());

    expect(result).toEqual({ success: false, error: "bad to" });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("statusCode=null + nicht-transienter Fehlername → kein Retry", async () => {
    const { sendMail } = await importClient();
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { statusCode: null, name: "missing_required_field", message: "no subject" },
    });

    const result = await sendMail(baseInput());

    expect(result).toEqual({ success: false, error: "no subject" });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("429 wird mit 1s-Backoff retried und kann im 2. Versuch durchgehen", async () => {
    vi.useFakeTimers();
    const { sendMail } = await importClient();
    sendEmailMock
      .mockResolvedValueOnce({
        data: null,
        error: { statusCode: 429, name: "rate_limit_exceeded", message: "slow down" },
      })
      .mockResolvedValueOnce({ data: { id: "email_retry" }, error: null });

    const promise = sendMail(baseInput());
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: true, id: "email_retry" });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it("5xx wird bis zum Maximum (3 Versuche) retried und endet als Failure", async () => {
    vi.useFakeTimers();
    const { sendMail } = await importClient();
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { statusCode: 503, name: "internal_server_error", message: "down" },
    });

    const promise = sendMail(baseInput());
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: false, error: "down" });
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
  });

  it("statusCode=null + transienter Fehlername (application_error) → Retry", async () => {
    vi.useFakeTimers();
    const { sendMail } = await importClient();
    sendEmailMock
      .mockResolvedValueOnce({
        data: null,
        error: { statusCode: null, name: "application_error", message: "hiccup" },
      })
      .mockResolvedValueOnce({ data: { id: "email_2" }, error: null });

    const promise = sendMail(baseInput());
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ success: true, id: "email_2" });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });
});

describe("sendMail — geworfene Fehler (Netzwerk)", () => {
  it("Throw wird als transient behandelt und retried", async () => {
    vi.useFakeTimers();
    const { sendMail } = await importClient();
    sendEmailMock
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce({ data: { id: "email_3" }, error: null });

    const promise = sendMail(baseInput());
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ success: true, id: "email_3" });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });

  it("never-throw: dauerhafter Netzwerkfehler endet als Result mit letzter Message", async () => {
    vi.useFakeTimers();
    const { sendMail } = await importClient();
    sendEmailMock.mockRejectedValue(new Error("ETIMEDOUT"));

    const promise = sendMail(baseInput());
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: false, error: "ETIMEDOUT" });
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
  });

  it("non-Error-Throw wird stringifiziert statt zu crashen", async () => {
    const { sendMail } = await importClient();
    sendEmailMock.mockRejectedValue("kaputt");

    const result = await sendMail(baseInput({ retries: 0 }));

    expect(result).toEqual({ success: false, error: "kaputt" });
  });
});

describe("sendMail — retries-Option", () => {
  it("retries: 0 → genau 1 Versuch auch bei transientem Fehler", async () => {
    const { sendMail } = await importClient();
    sendEmailMock.mockResolvedValue({
      data: null,
      error: { statusCode: 500, name: "internal_server_error", message: "down" },
    });

    const result = await sendMail(baseInput({ retries: 0 }));

    expect(result).toEqual({ success: false, error: "down" });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("retries über dem Backoff-Plan werden auf 3 Gesamtversuche geclamped", async () => {
    vi.useFakeTimers();
    const { sendMail } = await importClient();
    sendEmailMock.mockRejectedValue(new Error("flaky"));

    const promise = sendMail(baseInput({ retries: 99 }));
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.success).toBe(false);
    expect(sendEmailMock).toHaveBeenCalledTimes(3);
  });
});
