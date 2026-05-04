import { test, expect } from "@playwright/test";

test.describe("Shopping Cart", () => {
  test("can add a product to cart and see cart drawer", async ({ page }) => {
    // Navigate to products page
    await page.goto("/products");

    // Statt ProductCard zu klicken (nested preventDefault-Handler) —
    // direkt zur Detail-Page navigieren über den href des ersten
    // Detail-Links.
    const productLink = page
      .locator("a[href^='/products/']")
      .and(page.locator(":not([href^='/products/category/'])"))
      .first();
    await productLink.waitFor({ timeout: 10_000 });
    const href = await productLink.getAttribute("href");
    await page.goto(href!);

    // Auf der Product-Detail-Page: PRIMÄRER Add-to-Cart-Button.
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
