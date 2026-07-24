import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function openRecoveryPlan(page) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });

  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: USER_ID,
        displayName: "Nguyễn Minh",
        email: "patient@example.com",
      },
    }),
  }));

  await page.goto("/recovery-plan", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Kế hoạch phục hồi chưa được mở" })).toBeVisible();
}

test("recovery plan states its current product boundary clearly", async ({ page }) => {
  await openRecoveryPlan(page);

  await expect(page.getByText("MediMate hiện chưa tạo, lưu hoặc theo dõi kế hoạch phục hồi cá nhân.")).toBeVisible();
  await expect(page.getByText("Trang này không yêu cầu và không lưu thông tin sức khỏe của bạn.")).toBeVisible();
  await expect(page.getByText("Đang chờ")).toHaveCount(0);
  await expect(page.getByText("3 bước")).toHaveCount(0);
});

test("recovery plan remains usable at 320px and supports keyboard actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openRecoveryPlan(page);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  const facilityButton = page.getByRole("button", { name: "Tìm cơ sở y tế" });
  await facilityButton.focus();
  await expect(facilityButton).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/map$/);
});

test("recovery plan has no serious automated accessibility violations", async ({ page }) => {
  await openRecoveryPlan(page);

  const results = await new AxeBuilder({ page })
    .include(".recovery-plan-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);

  expect(seriousViolations).toEqual([]);
});

test("recovery plan keeps content and actions visible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openRecoveryPlan(page);

  await expect(page.getByRole("button", { name: "Phân tích triệu chứng" })).toBeVisible();
  await expect(page.locator(".recovery-availability")).toHaveCSS("border-top-style", "solid");
});
