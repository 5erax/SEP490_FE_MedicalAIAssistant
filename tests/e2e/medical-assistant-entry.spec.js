import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

async function openMedicalAssistant(page) {
  await preparePage(page);
  await page.goto("/medical-assistant", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", {
    name: "Làm rõ triệu chứng trước khi đi khám",
  })).toBeVisible();
}

test("medical assistant entry explains the supported outcome without technical workflow copy", async ({ page }) => {
  await openMedicalAssistant(page);

  await expect(page.getByRole("heading", {
    name: "Điều gì đang khiến bạn lo lắng?",
  })).toBeVisible();
  await expect(page.getByText("Nhận định tham khảo", { exact: true })).toBeVisible();
  await expect(page.getByText("Chuyên khoa phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Cơ sở y tế liên quan", { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Tiến trình phân tích lâm sàng" })).toHaveCount(0);
  await expect(page.getByText("Một ô nhập duy nhất")).toHaveCount(0);
});

test("medical assistant entry keeps actions usable at 320 pixels and by keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openMedicalAssistant(page);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  const primaryAction = page.getByRole("button", { name: "Bắt đầu mô tả triệu chứng" });
  await primaryAction.focus();
  await expect(primaryAction).toBeFocused();
  await expect(primaryAction).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("button", { name: "Tìm cơ sở y tế" })).toBeVisible();
});

test("medical assistant entry has no serious automated accessibility violations", async ({ page }) => {
  await openMedicalAssistant(page);

  const results = await new AxeBuilder({ page })
    .include(".assessment-entry-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);

  expect(seriousViolations).toEqual([]);
});

test("medical assistant entry preserves card boundaries in dark and forced-colors modes", async ({ page }) => {
  await openMedicalAssistant(page);

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(page.locator(".assessment-entry-page")).toHaveCSS("color", "rgb(229, 245, 241)");

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator(".clinical-entry-overview")).toHaveCSS("border-top-style", "solid");
  await expect(page.getByRole("button", { name: "Bắt đầu mô tả triệu chứng" })).toBeVisible();
});
