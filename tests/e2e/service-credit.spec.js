import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function authenticate(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      displayName: "Nguyễn Minh",
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, ACCESS_TOKEN);
}

test.beforeEach(async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
});

test("workspace credit badge renders canonical remaining and reserved counts", async ({ page }) => {
  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === "/api/me/subscription-usage") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            quotaCode: "SERVICE_CREDIT",
            grantedCount: 20,
            usedCount: 7,
            reservedCount: 2,
            remainingCount: 11,
          },
        }),
      });
    }

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { displayName: "Nguyễn Minh", roles: ["Patient"] },
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const badge = page.getByRole("link", { name: /còn 11 lượt dịch vụ/i });
  await expect(badge).toBeVisible();
  await expect(badge).toContainText("11");
  await expect(badge).toContainText(/2.*đang xử lý/i);

  await badge.click();
  await expect(page).toHaveURL(/\/pricing\?view=upgrade/);
});

test("pricing exposes every active SERVICE_CREDIT package as a one-time purchase", async ({ page }) => {
  const plans = [
    {
      id: "00000000-0000-4000-8000-000000000010",
      planName: "Gói 10 lượt",
      price: 90000,
      quotas: [{ quotaCode: "SERVICE_CREDIT", limitValue: 10, isActive: true }],
    },
    {
      id: "00000000-0000-4000-8000-000000000020",
      planName: "Gói 25 lượt",
      price: 190000,
      quotas: [{ quotaCode: "SERVICE_CREDIT", limitValue: 25, isActive: true }],
    },
  ];

  await page.route("**/api/subscription-plans/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: plans }),
  }));
  await page.route("**/api/user-subscriptions/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{
        id: "subscription-active",
        planName: "Gói 10 lượt",
        status: 1,
        statusName: "Active",
      }, {
        id: "subscription-pending",
        planName: "Gói 25 lượt",
        status: 0,
        statusName: "Pending",
      }],
    }),
  }));
  await page.route("**/api/me/subscription-usage", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        quotaCode: "SERVICE_CREDIT",
        grantedCount: 10,
        usedCount: 4,
        reservedCount: 1,
        remainingCount: 5,
      },
    }),
  }));
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { displayName: "Nguyễn Minh" } }),
  }));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Gói 10 lượt", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gói 25 lượt", exact: true })).toBeVisible();
  await expect(page.getByText(/10 lượt dùng chung cho kế hoạch phục hồi/i)).toBeVisible();
  await expect(page.getByText(/25 lượt dùng chung cho kế hoạch phục hồi/i)).toBeVisible();
  await expect(page.getByText("/ một lần", { exact: true })).toHaveCount(plans.length);
  await expect(page.getByText(
    "Lượt dùng được cộng vào số dư hiện có và không hết hạn.",
    { exact: true },
  )).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mua thêm 10 lượt" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Mua thêm 25 lượt" })).toBeEnabled();
  await expect(page.getByText(/theo tháng|theo năm|tự động gia hạn|chu kỳ thanh toán/i)).toHaveCount(0);

  const activeSubscription = page.locator(".current-subscription-item").filter({
    hasText: "Gói 10 lượt",
  });
  const pendingSubscription = page.locator(".current-subscription-item").filter({
    hasText: "Gói 25 lượt",
  });
  await expect(activeSubscription.getByRole("button", { name: "Hủy giao dịch" })).toHaveCount(0);
  await expect(pendingSubscription.getByRole("button", { name: "Hủy giao dịch" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy giao dịch" })).toHaveCount(1);
});
