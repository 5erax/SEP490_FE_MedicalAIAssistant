import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VISUAL_ROUTES, VISUAL_VIEWPORTS } from "./route-manifest.js";
import { openRoute, preparePage } from "./helpers.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const visualStyles = path.join(currentDirectory, "visual-stabilize.css");

test.describe("visual baseline", () => {
  test.setTimeout(60_000);

  for (const route of VISUAL_ROUTES) {
    for (const viewport of VISUAL_VIEWPORTS) {
      test(`${route.name} at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page);
        await openRoute(page, route.path);
        const routeLoading = page.locator("[data-route-loading]");
        if (await routeLoading.count()) {
          await routeLoading.waitFor({ state: "detached" });
        }

        await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
          fullPage: true,
          stylePath: visualStyles,
          timeout: 15_000,
        });
      });
    }
  }
});
