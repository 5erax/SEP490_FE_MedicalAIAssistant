import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function openPatientRecords(page, { forcedColors = "none" } = {}) {
  await page.emulateMedia({ forcedColors });
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      isPremium: true,
      isProfileCompleted: true,
    }));
  }, PATIENT_TOKEN);
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        displayName: "Nguyễn Minh",
        roles: ["Patient"],
        isProfileCompleted: true,
      },
    }),
  }));
  await page.goto("/records", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Hồ sơ y tế chưa được mở trên MediMate" })).toBeVisible();
}

test("patient records stays truthful and responsive at narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openPatientRecords(page);

  await expect(page.getByText("Chưa khả dụng", { exact: true })).toBeVisible();
  await expect(page.getByText("Không có hồ sơ nào được tạo hoặc lưu từ màn hình này.")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

  const primaryAction = await page.getByRole("button", { name: "Mở phân tích lâm sàng" }).boundingBox();
  const helpLauncher = await page.locator(".patient-help-launcher").boundingBox();
  const controlsOverlap = !(
    primaryAction.x + primaryAction.width <= helpLauncher.x
    || helpLauncher.x + helpLauncher.width <= primaryAction.x
    || primaryAction.y + primaryAction.height <= helpLauncher.y
    || helpLauncher.y + helpLauncher.height <= primaryAction.y
  );
  expect(controlsOverlap).toBe(false);
});

test("patient records has no automatically detectable accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPatientRecords(page);

  const results = await new AxeBuilder({ page })
    .include(".records-unavailable-page")
    .analyze();

  expect(results.violations).toEqual([]);
});

test("patient records primary action works by keyboard", async ({ page }) => {
  await openPatientRecords(page);

  const primaryAction = page.getByRole("button", { name: "Mở phân tích lâm sàng" });
  await primaryAction.focus();
  await expect(primaryAction).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/symptom$/);
});

test("patient records remains legible in forced colors mode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPatientRecords(page, { forcedColors: "active" });

  await expect(page.getByText("Chưa khả dụng", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở phân tích lâm sàng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở trợ lý AI" })).toBeVisible();
});
