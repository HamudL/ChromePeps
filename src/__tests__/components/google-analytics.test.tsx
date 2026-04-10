import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useCookieConsent } from "@/store/cookie-consent-store";

// Mock next/script — renders a <div> with data attributes for inspection
vi.mock("next/script", () => ({
  default: ({ id, src, children }: { id?: string; src?: string; children?: string }) => (
    <div data-testid={id ?? "script"} data-src={src}>
      {children}
    </div>
  ),
}));

// Import AFTER mocks are in place
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

describe("GoogleAnalytics", () => {
  beforeEach(() => {
    useCookieConsent.setState({ decision: null, decidedAt: null });
  });

  it("renders nothing when consent is null", () => {
    const { container } = render(<GoogleAnalytics />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when consent is 'rejected'", () => {
    useCookieConsent.setState({ decision: "rejected", decidedAt: Date.now() });
    const { container } = render(<GoogleAnalytics />);
    expect(container.innerHTML).toBe("");
  });

  it("renders GA4 scripts when consent is 'accepted'", () => {
    useCookieConsent.setState({ decision: "accepted", decidedAt: Date.now() });
    const { container } = render(<GoogleAnalytics />);

    // Should render the gtag.js loader and the init script
    expect(container.innerHTML).toContain("googletagmanager.com");
    expect(container.innerHTML).toContain("G-0N2ETR0S31");
  });

  it("includes anonymize_ip for DSGVO compliance", () => {
    useCookieConsent.setState({ decision: "accepted", decidedAt: Date.now() });
    const { container } = render(<GoogleAnalytics />);
    expect(container.innerHTML).toContain("anonymize_ip");
  });
});
