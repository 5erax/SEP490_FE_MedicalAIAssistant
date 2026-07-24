import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACTIVE_PLANS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    planName: "Miễn phí",
    price: 0,
    durationInDays: 0,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    planName: "MediMate Plus",
    price: 149000,
    durationInDays: 30,
    featureLimitJson: JSON.stringify({
      symptomAnalysisPerMonth: 30,
      aiChatPerDay: 20,
      clinicalQuestionPerMonth: 10,
      recoveryPlanPerMonth: 5,
      medicationScanPerMonth: 5,
    }),
  },
];

async function mockPlans(page, plans = ACTIVE_PLANS) {
  await page.route("**/api/subscription-plans/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: plans }),
  }));
}

test.beforeEach(async ({ page }) => {
  await preparePage(page);
  await mockPlans(page);
});

test("pricing compares only available public and paid benefits", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", {
    name: "Chọn quyền lợi phù hợp với nhu cầu của bạn",
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Miễn phí", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "MediMate Plus", exact: true })).toBeVisible();
  await expect(page.getByText("149.000 ₫", { exact: true })).toBeVisible();
  await expect(page.getByText("30 lượt phân tích triệu chứng mỗi tháng")).toBeVisible();
  await expect(page.getByText("20 lượt trò chuyện với trợ lý AI mỗi ngày")).toBeVisible();
  await expect(page.getByText("10 bộ câu hỏi lâm sàng mỗi tháng")).toBeVisible();

  await expect(page.getByText(/kế hoạch phục hồi mỗi tháng/i)).toHaveCount(0);
  await expect(page.getByText(/kiểm tra thuốc mỗi tháng/i)).toHaveCount(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => (
    violation.impact === "critical" || violation.impact === "serious"
  ))).toEqual([]);
});

test("pricing remains usable at 320px and supports keyboard disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const question = page.getByRole("button", { name: "Phần miễn phí bao gồm gì?" });
  await question.focus();
  await expect(question).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/trang công khai để xem hướng dẫn triệu chứng/i)).toBeVisible();
});

test("pricing preserves clear controls in dark and forced-color modes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  const paidAction = page.getByRole("button", { name: "Đăng ký để nâng cấp" });
  await expect(paidAction).toBeVisible();
  await expect(paidAction).toHaveCSS("min-height", "50px");

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByRole("group", { name: "Chu kỳ thanh toán" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Theo tháng" })).toBeEnabled();
});
