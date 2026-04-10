import { test, expect } from "@playwright/test";

test.describe("Product Catalog", () => {
  test("homepage loads and shows content", async ({ page }) => {
    await page.goto("/");
    // The page should contain the shop name somewhere
    await expect(page).toHaveTitle(/ChromePeps/i);
  });

  test("products page lists products", async ({ page }) => {
    await page.goto("/products");
    await expect(page).toHaveURL(/products/);

    // Wait for at least one product card to appear
    const productCards = page.locator("[data-testid='product-card'], article, .product-card").or(
      page.locator("a[href*='/products/']")
    );
    await expect(productCards.first()).toBeVisible({ timeout: 10_000 });
  });

  test("clicking a product navigates to detail page", async ({ page }) => {
    await page.goto("/products");

    // Find a product link and click it
    const productLink = page.locator("a[href*='/products/']").first();
    await productLink.waitFor({ timeout: 10_000 });

    const href = await productLink.getAttribute("href");
    await productLink.click();

    // Should be on a product detail page
    await expect(page).toHaveURL(/\/products\//);
  });
});
