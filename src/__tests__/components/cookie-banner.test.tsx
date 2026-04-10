import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieBanner } from "@/components/shop/cookie-banner";
import { useCookieConsent } from "@/store/cookie-consent-store";

describe("CookieBanner", () => {
  beforeEach(() => {
    useCookieConsent.setState({ decision: null, decidedAt: null });
  });

  it("renders when decision is null", () => {
    render(<CookieBanner />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Cookies & Datenschutz")).toBeInTheDocument();
  });

  it("shows accept, reject, and info buttons", () => {
    render(<CookieBanner />);
    expect(screen.getByText("Akzeptieren")).toBeInTheDocument();
    expect(screen.getByText("Ablehnen")).toBeInTheDocument();
    expect(screen.getByText("Mehr erfahren")).toBeInTheDocument();
  });

  it("disappears after accept", async () => {
    const user = userEvent.setup();
    const { container } = render(<CookieBanner />);

    await user.click(screen.getByText("Akzeptieren"));

    expect(container.innerHTML).toBe("");
    expect(useCookieConsent.getState().decision).toBe("accepted");
  });

  it("disappears after reject", async () => {
    const user = userEvent.setup();
    const { container } = render(<CookieBanner />);

    await user.click(screen.getByText("Ablehnen"));

    expect(container.innerHTML).toBe("");
    expect(useCookieConsent.getState().decision).toBe("rejected");
  });

  it("disappears when X button is clicked (rejects)", async () => {
    const user = userEvent.setup();
    const { container } = render(<CookieBanner />);

    await user.click(screen.getByLabelText("Cookie-Hinweis schließen"));

    expect(container.innerHTML).toBe("");
    expect(useCookieConsent.getState().decision).toBe("rejected");
  });

  it("does not render when decision is already 'accepted'", () => {
    useCookieConsent.setState({ decision: "accepted", decidedAt: Date.now() });
    const { container } = render(<CookieBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("does not render when decision is already 'rejected'", () => {
    useCookieConsent.setState({ decision: "rejected", decidedAt: Date.now() });
    const { container } = render(<CookieBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("links to /datenschutz", () => {
    render(<CookieBanner />);
    const links = screen.getAllByRole("link");
    const datenschutzLinks = links.filter(
      (l) => l.getAttribute("href") === "/datenschutz"
    );
    expect(datenschutzLinks.length).toBeGreaterThanOrEqual(1);
  });
});
