import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const PERFORMANCE_ROUTES = [
  { name: "landing", path: "/" },
  { name: "login", path: "/login" },
  { name: "patient-dashboard", path: "/dashboard" },
  { name: "nearby-clinic", path: "/map" },
];

const INITIAL_BUDGET = {
  domContentLoadedMs: 5_000,
  loadMs: 8_000,
  largestContentfulPaintMs: 5_000,
  cumulativeLayoutShift: 0.25,
};

async function installWebVitalObservers(page) {
  await page.addInitScript(() => {
    window.__medimateVitals = { cls: 0, lcp: 0 };

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries.at(-1);
      if (latest) window.__medimateVitals.lcp = latest.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__medimateVitals.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
}

async function readMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadMs: Math.round(navigation.loadEventEnd),
      largestContentfulPaintMs: Math.round(window.__medimateVitals.lcp),
      cumulativeLayoutShift: Number(window.__medimateVitals.cls.toFixed(4)),
    };
  });
}

test.describe("performance baseline", () => {
  for (const route of PERFORMANCE_ROUTES) {
    test(`${route.name} stays within the initial lab budget`, async ({ page }, testInfo) => {
      await preparePage(page);
      await installWebVitalObservers(page);
      await openRoute(page, route.path);
      await page.waitForLoadState("load");
      await page.waitForTimeout(1_500);

      const metrics = await readMetrics(page);
      await testInfo.attach(`${route.name}-metrics.json`, {
        body: JSON.stringify(metrics, null, 2),
        contentType: "application/json",
      });

      expect(metrics.domContentLoadedMs).toBeLessThan(INITIAL_BUDGET.domContentLoadedMs);
      expect(metrics.loadMs).toBeLessThan(INITIAL_BUDGET.loadMs);
      expect(metrics.largestContentfulPaintMs).toBeLessThan(
        INITIAL_BUDGET.largestContentfulPaintMs,
      );
      expect(metrics.cumulativeLayoutShift).toBeLessThan(
        INITIAL_BUDGET.cumulativeLayoutShift,
      );
    });
  }
});
