import { test, expect } from "@playwright/test";

test.describe("Shopping Cart", () => {
  test("can add a product to cart and see cart drawer", async ({ page }) => {
    // Navigate to products page
    await page.goto("/products");

    // Wait for product DETAIL link (NOT category-pill `/products/category/...`).
    const productLink = page
      .locator("a[href^='/products/']")
      .and(page.locator(":not([href^='/products/category/'])"))
      .first();
    await productLink.waitFor({ timeout: 10_000 });
    await productLink.click();

    // Auf der Product-Detail-Page: PRIMÄRER Add-to-Cart-Button (nicht
    // die kleinen "Quick-Add"-Buttons in den Related-Cards). Wir
    // matchen explizit den Button im Hauptbereich, der genau
    // „In den Warenkorb" heißt.
    const addToCartBtn = page.getByRole("button", {
      // Tatsächlicher Button-Text: „In den Warenkorb — 49,99 €" — also
      // anchor nur am Anfang, kein $-Match auf das Ende.
      name: /^in den warenkorb/i,
    });
    await addToCartBtn.first().waitFor({ timeout: 10_000 });
    await addToCartBtn.first().click();

    // Cart drawer or sheet should open
    const cartDrawer = page.locator(
      "[role='dialog'], [data-state='open'], .cart-sheet"
    );
    await expect(cartDrawer.first()).toBeVisible({ timeout: 5_000 });
  });
});
