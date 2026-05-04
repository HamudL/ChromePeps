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

    // Find a PRODUCT-DETAIL link (NOT a /products/category/...-Pill).
    // Sonst klickt der Test eine Kategorie-Pill und bleibt auf der
    // Listing-Page mit URL=/products/category/<slug>, was die URL-
    // Assertion mit /\/products\// nicht eindeutig prüft.
    const productLink = page
      .locator("a[href^='/products/']")
      .and(page.locator(":not([href^='/products/category/'])"))
      .first();
    await productLink.waitFor({ timeout: 10_000 });
    await productLink.click();

    // URL sollte nun /products/<slug> sein — also NICHT /products und
    // NICHT /products/category/...
    await expect(page).toHaveURL(/\/products\/[^/]+$/);
  });
});
