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
}

test("payment return verifies the order and opens the activated experience", async ({ page }) => {
  await page.route("**/api/payments/payos-return**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        orderCode: "987654321",
        paymentStatus: "Paid",
        subscriptionStatus: "Active",
        isPaid: true,
        isActive: true,
        isCancelled: false,
      },
    }),
  }));
  await mockRefreshPremium(page);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    sessionStorage.setItem("medimate.returnTo", "/map?search=tim%20mach#results");
  });
  await page.goto("/payment/return?orderCode=987654321", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "MediMate+ đã sẵn sàng." })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục tác vụ" }).click();
  await expect(page).toHaveURL(/\/map\?search=tim%20mach#results$/);
});

test("payment cancel calls the backend cancel callback before showing retry actions", async ({ page }) => {
  let cancelRequests = 0;
  await page.route("**/api/payments/payos-cancel**", (route) => {
    cancelRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          orderCode: "123456789",
          paymentStatus: "Cancelled",
          subscriptionStatus: "Cancelled",
          isPaid: false,
          isActive: false,
          isCancelled: true,
        },
      }),
    });
  });

  await page.goto("/payment/cancel?orderCode=123456789", { waitUntil: "domcontentloaded" });
  await expect.poll(() => cancelRequests).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Bạn đã hủy giao dịch." })).toBeVisible();
  await expect(page.getByText("Đã hủy", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Kiểm tra lại trạng thái" })).toHaveCount(0);
  await page.getByRole("button", { name: "Quay lại bảng giá" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});

test("payment cancel trusts backend success over the cancel URL", async ({ page }) => {
  await page.route("**/api/payments/payos-cancel**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        orderCode: "123456789",
        paymentStatus: "Paid",
        subscriptionStatus: "Active",
        isPaid: true,
        isActive: true,
        isCancelled: false,
      },
    }),
  }));
  await mockRefreshPremium(page);

  await page.goto("/payment/cancel?orderCode=123456789", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "MediMate+ đã sẵn sàng." })).toBeVisible();
  await expect(page.getByText("Đã kích hoạt", { exact: true })).toBeVisible();
});
