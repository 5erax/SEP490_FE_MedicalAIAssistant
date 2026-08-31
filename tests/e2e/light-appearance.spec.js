import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

for (const path of ["/", "/login", "/pricing"]) {
  test(`${path} keeps light colors despite system and legacy dark preferences`, async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/**", route => route.fulfill({ json: { success: true, data: [] } }));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();

    const surfaces = page.locator("body, main, input, select, button, .landing-page, .pricing-page, .auth-card-clean");
    const readColors = elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color, scheme: style.colorScheme };
    });
    const lightColors = await surfaces.evaluateAll(readColors);
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light only");

    await page.emulateMedia({ colorScheme: "dark" });
    // An old theme attribute must no longer activate any dark styles.
    await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    await expect(page.locator("html")).toHaveCSS("color-scheme", "light only");
    expect(await surfaces.evaluateAll(readColors)).toEqual(lightColors);
  });
}
