import { describe, it, expect, beforeEach } from "vitest";
import { useCookieConsent } from "@/store/cookie-consent-store";

describe("cookie-consent-store", () => {
  beforeEach(() => {
    useCookieConsent.setState({ decision: null, decidedAt: null });
  });

  it("starts with decision = null", () => {
    expect(useCookieConsent.getState().decision).toBeNull();
    expect(useCookieConsent.getState().decidedAt).toBeNull();
  });

  describe("accept()", () => {
    it("sets decision to 'accepted'", () => {
      useCookieConsent.getState().accept();
      expect(useCookieConsent.getState().decision).toBe("accepted");
    });

    it("records a timestamp", () => {
      const before = Date.now();
      useCookieConsent.getState().accept();
      const after = Date.now();
      const ts = useCookieConsent.getState().decidedAt!;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe("reject()", () => {
    it("sets decision to 'rejected'", () => {
      useCookieConsent.getState().reject();
      expect(useCookieConsent.getState().decision).toBe("rejected");
    });

    it("records a timestamp", () => {
      useCookieConsent.getState().reject();
      expect(useCookieConsent.getState().decidedAt).toBeTypeOf("number");
    });
  });

  describe("reset()", () => {
    it("clears decision and timestamp", () => {
      useCookieConsent.getState().accept();
      useCookieConsent.getState().reset();
      expect(useCookieConsent.getState().decision).toBeNull();
      expect(useCookieConsent.getState().decidedAt).toBeNull();
    });
  });

  describe("flow: reject → reset → accept", () => {
    it("allows changing decision after reset", () => {
      useCookieConsent.getState().reject();
      expect(useCookieConsent.getState().decision).toBe("rejected");

      useCookieConsent.getState().reset();
      expect(useCookieConsent.getState().decision).toBeNull();

      useCookieConsent.getState().accept();
      expect(useCookieConsent.getState().decision).toBe("accepted");
    });
  });
});
