import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

test("landing uses a truthful map preview without loading MapLibre", async ({ page }) => {
  await preparePage(page);
  await page.goto("/", { waitUntil: "load" });

  await expect(page.getByRole("heading", {
    name: "Mở bản đồ khi bạn cần tìm cơ sở phù hợp.",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở bản đồ cơ sở y tế" })).toHaveAttribute("href", "/map");

  for (const fakeContent of [
    "Bệnh viện Chợ Rẫy",
    "BV Đại học Y Dược TP.HCM",
    "Thời gian chờ dự kiến",
    "35 phút",
    "2.4 km",
  ]) {
    await expect(page.getByText(fakeContent, { exact: false })).toHaveCount(0);
  }

  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);
  const loadedResources = await page.evaluate(() => (
    performance.getEntriesByType("resource").map((entry) => entry.name)
  ));
  expect(loadedResources.some((resource) => resource.includes("maplibre"))).toBe(false);
});

test("landing map CTA navigates to the production map route", async ({ page }) => {
  await preparePage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.getByRole("link", { name: "Mở bản đồ cơ sở y tế" }).click();

  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole("heading", { name: "Bản đồ cơ sở y tế" })).toBeVisible();
});
