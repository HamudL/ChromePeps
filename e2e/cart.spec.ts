import { test, expect } from "@playwright/test";

test.describe("Shopping Cart", () => {
  test("can add a product to cart and see cart drawer", async ({ page }) => {
    // Navigate to products page
    await page.goto("/products");

    // Wait for product cards to load
    const productLink = page.locator("a[href*='/products/']").first();
    await productLink.waitFor({ timeout: 10_000 });
    await productLink.click();

    // On product detail page — find and click add-to-cart
    const addToCartBtn = page.getByRole("button", {
      name: /warenkorb|in den warenkorb|cart/i,
    });
    await addToCartBtn.waitFor({ timeout: 10_000 });
    await addToCartBtn.click();

    // Cart drawer or sheet should open
    const cartDrawer = page.locator(
      "[role='dialog'], [data-state='open'], .cart-sheet"
    );
    await expect(cartDrawer.first()).toBeVisible({ timeout: 5_000 });
  });
});
