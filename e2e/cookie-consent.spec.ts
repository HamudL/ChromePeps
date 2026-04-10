import { test, expect } from "@playwright/test";

test.describe("Cookie Consent Banner", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test so the banner shows up
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("banner is visible on first visit", async ({ page }) => {
    const banner = page.getByRole("dialog", { name: /cookie/i });
    await expect(banner).toBeVisible({ timeout: 5_000 });
  });

  test("banner disappears after accepting", async ({ page }) => {
    const banner = page.getByRole("dialog", { name: /cookie/i });
    await expect(banner).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /akzeptieren/i }).click();
    await expect(banner).not.toBeVisible();
  });

  test("banner stays hidden after reload when accepted", async ({ page }) => {
    const banner = page.getByRole("dialog", { name: /cookie/i });
    await expect(banner).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /akzeptieren/i }).click();
    await expect(banner).not.toBeVisible();

    // Reload — banner should stay hidden (persisted in localStorage)
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    // Give it a moment, then assert it's not there
    await expect(banner).not.toBeVisible({ timeout: 3_000 });
  });

  test("banner disappears after rejecting", async ({ page }) => {
    const banner = page.getByRole("dialog", { name: /cookie/i });
    await expect(banner).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: /ablehnen/i }).click();
    await expect(banner).not.toBeVisible();
  });
});
