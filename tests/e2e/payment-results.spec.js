import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

test.beforeEach(async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "patient@example.com",
      roles: ["Patient"],
    }));
  }, ACCESS_TOKEN);
});

async function mockRefreshPremium(page) {
  await page.route("**/api/user-subscriptions/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [{ status: 1, statusName: "Active" }] }),
  }));
  await page.route("**/api/authentication/refresh", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        accessToken: ACCESS_TOKEN,
        email: "patient@example.com",
        roles: ["Patient"],
        subscriptionStatus: "Active",
      },
    }),
  }));
  await page.route("**/api/me/subscription-usage", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { quotaCode: "SERVICE_CREDIT", grantedCount: 3, usedCount: 0, reservedCount: 0, remainingCount: 3 } }),
  }));
}

function paymentStatus(overrides = {}) {
  return {
    orderCode: "987654321",
    paymentStatus: "Pending",
    subscriptionStatus: "Pending",
    isPaid: false,
    isActive: false,
    isCancelled: false,
    ...overrides,
  };
}

test("payment return reconciles the order and opens the activated experience", async ({ page }) => {
  let statusRequests = 0;
  let reconcileRequests = 0;
  await page.route("**/api/payments/payos-status/987654321", (route) => {
    statusRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: paymentStatus() }),
    });
  });
  await page.route("**/api/payments/payos-reconcile/987654321", (route) => {
    reconcileRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: paymentStatus({
          paymentStatus: "Paid",
          subscriptionStatus: "Active",
          isPaid: true,
          isActive: true,
        }),
      }),
    });
  });
  await mockRefreshPremium(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    sessionStorage.setItem("medimate.returnTo", "/map?search=tim%20mach#results");
  });
  await page.goto("/payment/return?orderCode=987654321", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Lượt dùng đã được cộng vào tài khoản." })).toBeVisible();
  await expect(page.getByText("3/3 lượt", { exact: true })).toBeVisible();
  expect(statusRequests).toBeGreaterThan(0);
  expect(reconcileRequests).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Tiếp tục tác vụ" }).click();
  await expect(page).toHaveURL(/\/map\?search=tim%20mach#results$/);
});

test("payment cancel trusts the public payment status before showing retry actions", async ({ page }) => {
  let statusRequests = 0;
  await page.route("**/api/payments/payos-status/123456789", (route) => {
    statusRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: paymentStatus({
          orderCode: "123456789",
          paymentStatus: "Cancelled",
          subscriptionStatus: "Cancelled",
          isCancelled: true,
        }),
      }),
    });
  });

  await page.goto("/payment/cancel?orderCode=123456789", { waitUntil: "domcontentloaded" });
  await expect.poll(() => statusRequests).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Giao dịch đã hủy" })).toBeVisible();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kiểm tra lại trạng thái" })).toHaveCount(0);
  await page.getByRole("button", { name: "Quay lại bảng giá" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});

test("payment cancel remains unverified when backend verification is unavailable", async ({ page }) => {
  let statusRequests = 0;
  await page.route("**/api/payments/payos-status/123456789", (route) => {
    statusRequests += 1;
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "PayOS unavailable" }),
    });
  });

  await page.goto("/payment/cancel?orderCode=123456789", { waitUntil: "domcontentloaded" });
  await expect.poll(() => statusRequests).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Không thể kiểm tra giao dịch lúc này." })).toBeVisible();
  await expect(page.getByText("Chưa xác minh", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã hủy", { exact: true })).toHaveCount(0);
  await expect(page.getByText("bạn không bị mất tiền", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kiểm tra lại trạng thái" })).toBeVisible();
});

test("payment cancel trusts backend success over the cancel URL", async ({ page }) => {
  await page.route("**/api/payments/payos-status/123456789", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: paymentStatus({
        orderCode: "123456789",
        paymentStatus: "Paid",
        subscriptionStatus: "Active",
        isPaid: true,
        isActive: true,
      }),
    }),
  }));
  await mockRefreshPremium(page);

  await page.goto("/payment/cancel?orderCode=123456789", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Lượt dùng đã được cộng vào tài khoản." })).toBeVisible();
  await expect(page.getByText("Đã kích hoạt", { exact: true })).toBeVisible();
});

for (const path of ["/payment/return", "/payment/cancel"]) {
  test(`${path} stays neutral when the callback has no order code`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Chưa thể kiểm tra giao dịch này." })).toBeVisible();
    await expect(page.getByText("Đã hủy", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Đã kích hoạt", { exact: true })).toHaveCount(0);
    await expect(page).toHaveTitle("Trạng thái thanh toán | MediMate AI");
  });
}
