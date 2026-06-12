import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { ACCESSIBILITY_ROUTES } from "./route-manifest.js";
import { openRoute, preparePage } from "./helpers.js";

test.describe("accessibility baseline", () => {
  for (const path of ACCESSIBILITY_ROUTES) {
    test(`${path} has no automatically detectable serious violations`, async ({ page }) => {
      await preparePage(page);
      await openRoute(page, path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const seriousViolations = results.violations.filter(
        (violation) => ["critical", "serious"].includes(violation.impact),
      );
      const summary = seriousViolations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
      }));

      expect(summary).toEqual([]);
    });
  }
});
