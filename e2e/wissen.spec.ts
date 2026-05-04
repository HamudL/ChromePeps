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
    // Article-Detail-Links haben das Format /wissen/<slug> — also NICHT
    // /wissen/kategorie/... und NICHT /wissen/glossar. Filter explizit.
    // (Vorher: filter mit hasNot wirkte nur auf children, was nichts
    // ausgeschlossen hat — auf der Hub-Page gibt es Pills mit href=
    // /wissen/kategorie/<slug>, die im ersten Versuch ausgewählt wurden.)
    const articleLink = page
      .locator("a[href^='/wissen/']")
      .and(
        page.locator(
          ":not([href='/wissen/glossar']):not([href^='/wissen/kategorie/'])",
        ),
      );
    const count = await articleLink.count();
    test.skip(
      count === 0,
      "no published posts in DB — seed required for this case",
    );
    const href = await articleLink.first().getAttribute("href");
    // Promise.all stellt sicher dass der waitForURL VOR dem Click
    // armed ist — sonst race-condition wenn die Navigation schneller
    // ist als das await.
    await Promise.all([
      page.waitForURL(new RegExp(href ?? "/wissen/"), { timeout: 10_000 }),
      articleLink.first().click(),
    ]);
    // Article-Layout hat eine prose-class für den Body — ggf. lädt
    // react-markdown etwas, daher Timeout etwas großzügiger.
    await expect(page.locator(".prose").first()).toBeVisible({
      timeout: 10_000,
    });
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
