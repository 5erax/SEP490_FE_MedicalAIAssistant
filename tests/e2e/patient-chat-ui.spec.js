import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function openPatientChat(page, { forcedColors = "none" } = {}) {
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
  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bạn đang cần tìm hiểu điều gì?" })).toBeVisible();
}

test("patient chat remains usable at narrow width without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openPatientChat(page);

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  await expect(page.getByLabel("Nội dung cần hỏi")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi" })).toBeDisabled();

  const sendButton = await page.getByRole("button", { name: "Gửi" }).boundingBox();
  const helpLauncher = await page.locator(".patient-help-launcher").boundingBox();
  expect(sendButton).not.toBeNull();
  expect(helpLauncher).not.toBeNull();
  const controlsOverlap = !(
    sendButton.x + sendButton.width <= helpLauncher.x
    || helpLauncher.x + helpLauncher.width <= sendButton.x
    || sendButton.y + sendButton.height <= helpLauncher.y
    || helpLauncher.y + helpLauncher.height <= sendButton.y
  );
  expect(controlsOverlap).toBe(false);
});

test("patient chat empty state has no automatically detectable accessibility violations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPatientChat(page);

  const results = await new AxeBuilder({ page })
    .include(".chatbot-page")
    .analyze();

  expect(results.violations).toEqual([]);
});

test("patient chat keeps controls visible in forced colors mode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPatientChat(page, { forcedColors: "active" });

  await expect(page.getByRole("button", { name: "Quay lại tổng quan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở công cụ nhận diện thuốc" })).toBeVisible();
  await expect(page.getByLabel("Nội dung cần hỏi")).toBeVisible();
});
