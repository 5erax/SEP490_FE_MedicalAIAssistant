import { expect, test } from "@playwright/test";
import { APP_ROUTES, KNOWN_ROUTE_CONFLICTS, STATIC_ROUTES } from "./route-manifest.js";
import { openRoute, pathname, preparePage } from "./helpers.js";

test.describe("route baseline", () => {
  for (const route of APP_ROUTES) {
    test(`${route.path} renders ${route.surface}`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await preparePage(page);
      await openRoute(page, route.path);

      expect(pathname(page)).toBe(route.expectedPath);
      expect(pageErrors).toEqual([]);
    });
  }

  for (const path of STATIC_ROUTES) {
    test(`${path} renders static content`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await preparePage(page);
      await openRoute(page, path);

      expect(pathname(page)).toBe(path);
      expect(pageErrors).toEqual([]);
    });
  }

  for (const conflict of KNOWN_ROUTE_CONFLICTS) {
    test.fixme(`${conflict.path} has a known route conflict`, async () => {
      expect(conflict.reason).toBeTruthy();
    });
  }
});
