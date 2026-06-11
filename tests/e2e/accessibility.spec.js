import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ACCESSIBILITY_ROUTES } from "./route-manifest.js";
import { openRoute, preparePage } from "./helpers.js";

test.describe("accessibility baseline", () => {
  for (const path of ACCESSIBILITY_ROUTES) {
    test(`${path} has no automatically detectable critical violations`, async ({ page }) => {
      await preparePage(page);
      await openRoute(page, path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const criticalViolations = results.violations.filter(
        (violation) => violation.impact === "critical",
      );

      expect(criticalViolations).toEqual([]);
    });
  }
});
