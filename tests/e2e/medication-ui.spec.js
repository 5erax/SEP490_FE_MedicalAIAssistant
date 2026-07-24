import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function openMedicationPreview(page) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      isPremium: true,
      isProfileCompleted: true,
    }));
  }, ACCESS_TOKEN);

  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        displayName: "Nguyễn Minh",
        email: "patient@example.com",
      },
    }),
  }));

  await page.goto("/medication", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", {
    name: "Xem trước ảnh trước khi trao đổi với người có chuyên môn",
  })).toBeVisible();
}

test("medication page describes the local-only preview boundary", async ({ page }) => {
  await openMedicationPreview(page);

  await expect(page.getByText(
    "MediMate hiện chưa nhận diện thuốc hoặc kiểm tra tương tác từ ảnh.",
  )).toBeVisible();
  await expect(page.getByText(
    "Không có dữ liệu thuốc mẫu được hiển thị như kết quả thật.",
  )).toBeVisible();
  await expect(page.getByText("Kết quả nhận diện sẽ hiển thị tại đây")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Kiểm tra thuốc" })).toBeVisible();
});

test("medication upload remains keyboard reachable without mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openMedicationPreview(page);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  const upload = page.locator("#medication-label-upload");
  await upload.focus();
  await expect(upload).toBeFocused();
  await expect(page.locator(".upload-zone")).toHaveCSS("outline-style", "solid");
});

test("medication page has no serious automated accessibility violations", async ({ page }) => {
  await openMedicationPreview(page);

  const results = await new AxeBuilder({ page })
    .include(".medication-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);

  expect(seriousViolations).toEqual([]);
});

test("medication page remains legible in dark and forced-colors modes", async ({ page }) => {
  await openMedicationPreview(page);

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(page.locator(".medication-page")).toHaveCSS("color", "rgb(243, 247, 241)");

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByRole("button", { name: "Tìm cơ sở y tế" })).toBeVisible();
  await expect(page.locator(".medication-workspace")).toHaveCSS("border-top-style", "solid");
});
