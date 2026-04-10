import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewsletterForm } from "@/components/shop/newsletter-form";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("NewsletterForm", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders email input and submit button", () => {
    render(<NewsletterForm />);
    expect(screen.getByPlaceholderText(/e-mail/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /anmelden/i })
    ).toBeInTheDocument();
  });

  it("submits email to /api/newsletter", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<NewsletterForm />);

    await user.type(
      screen.getByPlaceholderText(/e-mail/i),
      "test@example.com"
    );
    await user.click(screen.getByRole("button", { name: /anmelden/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/newsletter",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test@example.com"),
        })
      );
    });
  });

  it("shows success message after successful subscription", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<NewsletterForm />);

    await user.type(
      screen.getByPlaceholderText(/e-mail/i),
      "test@example.com"
    );
    await user.click(screen.getByRole("button", { name: /anmelden/i }));

    await waitFor(() => {
      expect(screen.getByText(/postfach/i)).toBeInTheDocument();
    });
  });

  it("shows error message on API failure", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Ungültige E-Mail-Adresse." }),
    });

    render(<NewsletterForm />);

    await user.type(
      screen.getByPlaceholderText(/e-mail/i),
      "bad@example.com"
    );
    await user.click(screen.getByRole("button", { name: /anmelden/i }));

    await waitFor(() => {
      // Should show some error text
      const errorEl = screen.queryByText(/ungültig|fehler|erneut/i);
      expect(errorEl).toBeInTheDocument();
    });
  });

  it("disables input and button while loading", async () => {
    const user = userEvent.setup();
    // Never resolve — keeps the form in loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<NewsletterForm />);

    await user.type(
      screen.getByPlaceholderText(/e-mail/i),
      "test@example.com"
    );
    await user.click(screen.getByRole("button", { name: /anmelden/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e-mail/i)).toBeDisabled();
    });
  });
});
