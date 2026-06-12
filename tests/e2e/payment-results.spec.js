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

test("payment return verifies the order and opens the activated experience", async ({ page }) => {
  await page.route("**/api/payments/payos-status/987654321", (route) => route.fulfill({
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

  await page.goto("/payment/return?orderCode=987654321", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "MediMate+ đã sẵn sàng." })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu sử dụng" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("payment cancel keeps the user safe and offers a clear retry path", async ({ page }) => {
  await page.route("**/api/payments/payos-status/123456789", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        orderCode: "123456789",
        paymentStatus: "Cancelled",
        subscriptionStatus: "Pending",
        isPaid: false,
        isActive: false,
        isCancelled: true,
      },
    }),
  }));

  await page.goto("/payment/cancel?orderCode=123456789", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bạn chưa bị tính phí." })).toBeVisible();
  await page.getByRole("button", { name: "Chọn lại gói" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});
