import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

test("display preferences apply immediately and persist across reloads", async ({ page }) => {
  await preparePage(page);
  await openRoute(page, "/");

  await page.getByRole("button", { name: "Hiển thị", exact: true }).click();
  await page.locator('select[id$="-theme"]').selectOption("dark");
  await page.locator('select[id$="-motion"]').selectOption("reduce");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
});
