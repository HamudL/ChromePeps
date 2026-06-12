import { describe, it, expect, afterEach, vi } from "vitest";
import {
  newsletterUnsubscribeToken,
  verifyNewsletterUnsubscribeToken,
} from "@/lib/newsletter";

/**
 * HMAC-basierter Unsubscribe-Token: deterministisch ableitbar aus
 * (normalisierte E-Mail, AUTH_SECRET). Tests decken den Round-Trip,
 * die Normalisierung (muss zur Subscribe-Route passen) und die
 * Fail-Closed-Pfade bei fehlendem Secret/Token ab.
 */
describe("newsletterUnsubscribeToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returnt null ohne AUTH_SECRET (Misskonfiguration → kein Link)", () => {
    vi.stubEnv("AUTH_SECRET", undefined);
    expect(newsletterUnsubscribeToken("user@example.com")).toBeNull();
  });

  it("erzeugt einen stabilen Hex-Token für dieselbe Adresse", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const a = newsletterUnsubscribeToken("user@example.com");
    const b = newsletterUnsubscribeToken("user@example.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 hex
  });

  it("normalisiert trim + lowercase (muss zur Subscribe-Route passen)", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const canonical = newsletterUnsubscribeToken("user@example.com");
    expect(newsletterUnsubscribeToken("  USER@Example.COM  ")).toBe(canonical);
  });

  it("erzeugt unterschiedliche Tokens für unterschiedliche Adressen", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    expect(newsletterUnsubscribeToken("a@example.com")).not.toBe(
      newsletterUnsubscribeToken("b@example.com")
    );
  });

  it("hängt am Secret — anderes Secret, anderer Token", () => {
    vi.stubEnv("AUTH_SECRET", "secret-1");
    const t1 = newsletterUnsubscribeToken("user@example.com");
    vi.stubEnv("AUTH_SECRET", "secret-2");
    const t2 = newsletterUnsubscribeToken("user@example.com");
    expect(t1).not.toBe(t2);
  });
});

describe("verifyNewsletterUnsubscribeToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("akzeptiert den korrekten Token (Round-Trip)", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const token = newsletterUnsubscribeToken("user@example.com")!;
    expect(verifyNewsletterUnsubscribeToken("user@example.com", token)).toBe(
      true
    );
  });

  it("akzeptiert den Token auch für die unnormalisierte Schreibweise", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const token = newsletterUnsubscribeToken("user@example.com")!;
    expect(
      verifyNewsletterUnsubscribeToken("  USER@example.com ", token)
    ).toBe(true);
  });

  it("lehnt einen manipulierten Token ab (timing-safe Vergleich)", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const token = newsletterUnsubscribeToken("user@example.com")!;
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(
      verifyNewsletterUnsubscribeToken("user@example.com", tampered)
    ).toBe(false);
  });

  it("lehnt Tokens fremder Adressen ab", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const tokenForOther = newsletterUnsubscribeToken("other@example.com")!;
    expect(
      verifyNewsletterUnsubscribeToken("user@example.com", tokenForOther)
    ).toBe(false);
  });

  it("lehnt leeren Token ab ohne zu werfen", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    expect(verifyNewsletterUnsubscribeToken("user@example.com", "")).toBe(
      false
    );
  });

  it("fail-closed ohne AUTH_SECRET", () => {
    vi.stubEnv("AUTH_SECRET", undefined);
    expect(
      verifyNewsletterUnsubscribeToken("user@example.com", "deadbeef")
    ).toBe(false);
  });
});
