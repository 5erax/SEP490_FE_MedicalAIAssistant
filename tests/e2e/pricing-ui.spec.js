import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACTIVE_PLANS = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    planName: "Gói 10 lượt",
    price: 90000,
    quotas: [{ quotaCode: "SERVICE_CREDIT", limitValue: 10, isActive: true }],
  },
  {
    id: "00000000-0000-4000-8000-000000000025",
    planName: "Gói 25 lượt",
    price: 190000,
    quotas: [{ quotaCode: "SERVICE_CREDIT", limitValue: 25, isActive: true }],
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

test("subscription email CTA alias renders the current pricing offers", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken: "test-patient-token",
      email: "patient@example.com",
      displayName: "Patient Test",
      roles: ["Patient"],
    }));
  });
  let offersCalls = 0;
  await page.route("**/api/subscription-plans/offers", (route) => {
    offersCalls += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [{
          plan: ACTIVE_PLANS[0],
          baseCredit: 2,
          bonusCredit: 10,
          totalCredit: 12,
          grantedCredit: 12,
          originalPrice: 20000,
          effectivePrice: 12000,
          offer: {
            campaignName: "SALE TEST 20K",
            badgeText: "TOTAL LIMIT",
            eligibilityType: "all",
            discountAmount: 8000,
            remainingRedemptions: 7,
            endAt: new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString(),
          },
        }],
      }),
    });
  });
  await page.route("**/api/user-subscriptions/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.route("**/api/me/subscription-usage", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { quotaCode: "SERVICE_CREDIT", grantedCount: 0, usedCount: 0, reservedCount: 0, remainingCount: 0 } }),
  }));
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { displayName: "Patient Test", roles: ["Patient"] } }),
  }));

  await page.goto("/subscription?view=upgrade&returnTo=%2Fprofile", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/subscription\?view=upgrade/);
  await expect(page.getByRole("region", { name: "Gói nâng cấp MediMate Plus" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói 10 lượt", exact: true })).toBeVisible();
  await expect(page.getByText("Tiết kiệm 8.000đ", { exact: true })).toBeVisible();
  await expect(page.getByText("Tặng thêm 10 lượt", { exact: true })).toBeVisible();
  await expect(page.getByText("Còn 7 suất ưu đãi", { exact: true })).toBeVisible();
  await expect(page.getByText("Lượt dùng được cộng vào số dư hiện có và không hết hạn.", { exact: true })).toHaveCount(0);
  await expect(page.locator(".plan-badge-sale")).toHaveCSS("font-size", "13px");
  await expect.poll(() => offersCalls).toBeGreaterThan(0);

  const desktopLayout = await page.evaluate(() => {
    const plans = document.querySelector(".plans-grid-focused")?.getBoundingClientRect();
    const card = document.querySelector(".pricing-plan-card-sale")?.getBoundingClientRect();
    const primary = document.querySelector(".pricing-plan-primary")?.getBoundingClientRect();
    const sale = document.querySelector(".pricing-sale-details")?.getBoundingClientRect();
    return {
      cardBottom: card?.bottom ?? Infinity,
      cardUsesWideLayout: Boolean(plans && card && card.width > plans.width / 2),
      saleStartsAfterPrimary: Boolean(primary && sale && sale.left > primary.left),
    };
  });
  expect(desktopLayout.cardBottom).toBeLessThanOrEqual(1080);
  expect(desktopLayout.cardUsesWideLayout).toBe(true);
  expect(desktopLayout.saleStartsAfterPrimary).toBe(true);

  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/subscription", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Chọn gói phù hợp với cách bạn sử dụng MediMate" })).toBeVisible();
  const publicCardLayout = await page.evaluate(() => {
    const card = document.querySelector(".pricing-plan-card-sale");
    const layout = card?.querySelector(".pricing-plan-offer-layout");
    return {
      columns: layout ? getComputedStyle(layout).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      contentFits: Boolean(card && card.scrollWidth <= card.clientWidth),
    };
  });
  expect(publicCardLayout.columns).toBe(1);
  expect(publicCardLayout.contentFits).toBe(true);
});

test("pricing compares public access with every active SERVICE_CREDIT package", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", {
    name: "Chọn gói phù hợp với cách bạn sử dụng MediMate",
  })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Miễn phí", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói 10 lượt", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói 25 lượt", exact: true })).toBeVisible();
  await expect(page.getByText("90.000 ₫", { exact: true })).toBeVisible();
  await expect(page.getByText("190.000 ₫", { exact: true })).toBeVisible();
  await expect(page.getByText(/10 lượt dùng chung cho kế hoạch phục hồi/i)).toBeVisible();
  await expect(page.getByText(/25 lượt dùng chung cho kế hoạch phục hồi/i)).toBeVisible();
  await expect(page.getByText(/mỗi tháng|mỗi ngày|chu kỳ thanh toán/i)).toHaveCount(0);

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
  await expect(page.getByText(
    /tính năng công khai để phân tích triệu chứng ở mức tham khảo/i,
  )).toBeVisible();
});

test("pricing preserves clear credit-package controls in dark and forced-color modes", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  const paidActions = page.getByRole("button", { name: "Đăng ký để mua lượt" });
  await expect(paidActions).toHaveCount(ACTIVE_PLANS.length);
  await expect(paidActions.first()).toBeVisible();
  await expect(paidActions.first()).toHaveCSS("min-height", "50px");

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByRole("region", { name: "So sánh các gói MediMate" })).toBeVisible();
  await expect(paidActions.first()).toBeEnabled();
  await expect(page.getByRole("group", { name: "Chu kỳ thanh toán" })).toHaveCount(0);
});

test("pricing treats every credit package as a one-time purchase", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("/ một lần", { exact: true })).toHaveCount(ACTIVE_PLANS.length);
  await expect(page.getByRole("button", { name: "Theo tháng" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Theo năm" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Gói 10 lượt", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói 25 lượt", exact: true })).toBeVisible();
});

test("pricing keeps unavailable paid data explicit and retryable", async ({ page }) => {
  let shouldFail = true;
  await page.unroute("**/api/subscription-plans/active");
  await page.route("**/api/subscription-plans/active", (route) => {
    if (shouldFail) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unavailable" }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: ACTIVE_PLANS }),
    });
  });

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  const retryButton = page.getByRole("button", { name: "Thử tải lại" });
  await expect(page.getByRole("alert")).toContainText("Chưa thể tải thông tin gói");
  await expect(retryButton).toBeVisible();
  await expect(page.getByRole("heading", { name: "Miễn phí", exact: true })).toBeVisible();
  await expect(page.getByText(
    "Thông tin gói lượt dùng chưa khả dụng.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng ký để mua lượt" })).toHaveCount(0);

  shouldFail = false;
  await retryButton.click();

  await expect(page.getByRole("heading", { name: "Gói 10 lượt", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói 25 lượt", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText(
    "Thông tin gói lượt dùng chưa khả dụng.",
    { exact: true },
  )).toHaveCount(0);
});
