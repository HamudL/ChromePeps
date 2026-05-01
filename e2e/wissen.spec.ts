import { test, expect } from "@playwright/test";

/**
 * E2E-Smoke für /wissen.
 *
 * Setzt nicht voraus dass die Demo-Seeds laufen — die Tests checken
 * primär dass die Routes ohne Crash rendern und dass die wichtigsten
 * Surface-Elemente da sind. Detail-Tests des Inhalts wären brittle, weil
 * Seed-Daten sich ändern.
 *
 * Wenn keine Posts gesseedet sind, soll der Hub trotzdem laden — der
 * "Im Fokus"-Block fehlt dann, aber die Pillar-Cards (BlogCategories)
 * und der Newsletter-Block sind sichtbar.
 */
test.describe("Wissen", () => {
  test("hub loads with hero + newsletter block", async ({ page }) => {
    await page.goto("/wissen");
    await expect(
      page.getByRole("heading", { level: 1, name: /Forschung/i }),
    ).toBeVisible();
    // Newsletter-Block hat ein Email-Input mit dem Label "E-Mail-Adresse".
    await expect(page.locator("#wissen-newsletter-email")).toBeVisible();
  });

  test("hub navigates to article detail when present", async ({ page }) => {
    await page.goto("/wissen");
    const articleLink = page.locator("a[href^='/wissen/']").filter({
      hasNot: page.locator("a[href='/wissen/glossar']"),
    });
    const count = await articleLink.count();
    test.skip(
      count === 0,
      "no published posts in DB — seed required for this case",
    );
    const href = await articleLink.first().getAttribute("href");
    await articleLink.first().click();
    await expect(page).toHaveURL(new RegExp(href ?? "/wissen/"));
    // Article-Layout hat eine prose-class für den Body.
    await expect(page.locator(".prose")).toBeVisible();
  });

  test("glossar loads with A–Z bar", async ({ page }) => {
    await page.goto("/wissen/glossar");
    await expect(
      page.getByRole("heading", { level: 1, name: /Glossar/i }),
    ).toBeVisible();
    // Letter-Bar enthält "A–Z"-Label.
    await expect(page.locator(".letter-link").first()).toBeVisible();
  });

  test("header has Wissen nav entry", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("nav a[href='/wissen']").first(),
    ).toBeVisible();
  });
});
