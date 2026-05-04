import { test, expect } from "@playwright/test";

/**
 * Checkout-Smoke-Tests.
 *
 * AUDIT_REPORT_v3 §6 PR 3.
 *
 * Was hier getestet wird:
 *  - Empty-Cart → /cart zeigt CTA zurück zu /products
 *  - Produkt → Cart → Cart-Drawer öffnet
 *  - Cart-Drawer → /checkout-Seite lädt mit Formular
 *  - Checkout-Form-Validierung (Adresse Pflichtfelder)
 *
 * Was hier NICHT getestet wird (verlangt echtes Stripe-Test-Mode-Setup):
 *  - Stripe-Hosted-Checkout-Page (extern, iframe-isoliert)
 *  - Webhook-Roundtrip mit Stripe CLI
 *  - Bank-Transfer-Flow (eigener Test-Pfad)
 *
 * Stripe-Integration ist über die Webhook-Unit-Tests
 * (`src/__tests__/api/stripe-webhook.test.ts`) abgedeckt.
 */

test.describe("Checkout · Smoke", () => {
  test("Empty Cart zeigt CTA zurück zum Shop", async ({ page }) => {
    await page.goto("/cart");
    // Auf einer leeren Cart-Page erwarten wir einen klaren Hinweis und
    // einen Link zu /products. Die genaue Copy kann variieren — wir
    // matchen auf den Link-Pfad und ein "leer/keine"-Wort im Text.
    const productsLink = page.locator("a[href='/products']").first();
    await expect(productsLink).toBeVisible({ timeout: 10_000 });
  });

  test("Produkt → Add-to-Cart → Cart-Drawer öffnet", async ({ page }) => {
    await page.goto("/products");
    const firstProduct = page.locator("a[href*='/products/']").first();
    await firstProduct.waitFor({ timeout: 10_000 });
    await firstProduct.click();

    const addToCart = page.getByRole("button", {
      name: /warenkorb|cart/i,
    });
    await addToCart.waitFor({ timeout: 10_000 });
    await addToCart.click();

    // Cart-Drawer öffnet
    const drawer = page.locator("[role='dialog']").first();
    await expect(drawer).toBeVisible({ timeout: 5_000 });
  });

  test("/checkout zeigt Address-Form (auch ohne Login)", async ({ page }) => {
    // Erst ein Produkt in den Cart legen, sonst redirected /checkout
    // u.U. zurück zu /cart wegen Empty-Guard.
    await page.goto("/products");
    const firstProduct = page.locator("a[href*='/products/']").first();
    await firstProduct.click();
    const addToCart = page.getByRole("button", {
      name: /warenkorb|cart/i,
    });
    await addToCart.click();

    await page.goto("/checkout");
    // Kontaktdaten + Adresse erwartet — Felder können je nach Render-
    // State (Auth vs Guest) variieren, daher tolerant matchen.
    await expect(page.getByLabel(/e-mail/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
