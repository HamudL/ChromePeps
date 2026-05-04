import { test, expect } from "@playwright/test";

/**
 * Auth-Smoke-Tests.
 *
 * AUDIT_REPORT_v3 §6 PR 3.
 *
 * Was hier getestet wird:
 *  - /register zeigt das Registrierungs-Formular und die richtigen Felder
 *  - /login zeigt das Login-Formular
 *  - Falsche Credentials zeigen die deutsche Fehlermeldung
 *  - Skip-to-content-Link existiert (a11y, WCAG 2.4.1)
 *
 * Was hier NICHT getestet wird (braucht Mail-Adapter-Mock + DB-Reset):
 *  - vollständiger Register-→-Verify-→-Login-Flow
 *  - 2FA-Stufe-2-Flow (TOTP-Code aus Authenticator-App)
 *
 * Diese Tests dokumentiert ein Issue auf dem Repo (»E2E mit Mail-Mock«),
 * weil es eigene Infrastruktur braucht und nicht in PR 3 reinpasst.
 */

test.describe("Auth · Smoke", () => {
  test("/register zeigt Registrierungsformular", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /konto erstellen|registrier/i }),
    ).toBeVisible();
    // Pflichtfelder vorhanden
    await expect(page.getByLabel(/^name/i).first()).toBeVisible();
    await expect(page.getByLabel(/e-mail/i).first()).toBeVisible();
    await expect(page.getByLabel(/passwort/i).first()).toBeVisible();
  });

  test("/login zeigt Login-Form mit E-Mail + Passwort", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: /willkommen|anmelden|login/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/passwort/i)).toBeVisible();
  });

  test("Login mit falschen Credentials zeigt Fehlermeldung", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/e-mail/i).fill("nichtexistent@example.com");
    await page.getByLabel(/passwort/i).fill("falsches-passwort");
    await page.getByRole("button", { name: /anmelden/i }).click();
    // Server-Side rate-check oder credentials-error — beide erscheinen
    // im error-Banner mit role=alert.
    const error = page.locator("[role='alert']");
    await expect(error.first()).toBeVisible({ timeout: 8_000 });
  });

  test("Skip-to-content-Link ist via Tab fokussierbar (WCAG 2.4.1)", async ({
    page,
  }) => {
    await page.goto("/");
    // Erstes Tab nach Page-Load fokussiert standardmäßig den Skip-Link
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /zum inhalt springen/i });
    await expect(skip).toBeFocused();
  });
});
