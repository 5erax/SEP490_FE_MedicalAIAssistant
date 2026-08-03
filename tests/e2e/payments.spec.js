import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxMDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

test("authenticated user opens PayOS and reconciles the checkout", async ({ page, context }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "patient@example.com",
      displayName: "Patient Test",
      roles: ["Patient"],
    }));
  }, ACCESS_TOKEN);

  let checkoutBody = null;

  await context.route("**/api/subscription-plans/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          planName: "MediMate+ Monthly",
          price: 149000,
          durationInDays: 30,
          isActive: true,
        },
      ],
    }),
  }));

  await context.route("**/api/user-subscriptions/me", (route) => {
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  await context.route("**/api/user-subscriptions/checkout", async (route) => {
    checkoutBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          subscriptionId: "22222222-2222-2222-2222-222222222222",
          paymentId: "33333333-3333-3333-3333-333333333333",
          orderCode: "987654321",
          paymentUrl: "http://127.0.0.1:3000/payment/return?orderCode=987654321",
          paymentProvider: "PayOS",
        },
      }),
    });
  });

  await context.route("**/api/payments/payos-reconcile/987654321", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        orderCode: "987654321",
        isPaid: true,
        isActive: true,
        isCancelled: false,
      },
    }),
  }));

  await context.route("**/api/payments/me/33333333-3333-3333-3333-333333333333", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "33333333-3333-3333-3333-333333333333",
        statusName: "Paid",
        paidAt: "2026-08-03T00:00:00Z",
      },
    }),
  }));

  await context.route("**/api/authentication/refresh", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        accessToken: ACCESS_TOKEN,
        email: "patient@example.com",
        roles: ["Patient"],
        subscriptionStatus: "Active",
        planName: "MediMate+ Monthly",
      },
    }),
  }));

  await context.route("**/api/me/subscription-usage", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { limitValue: 3, usedCount: 0, reservedCount: 0, remainingCount: 3 } }),
  }));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("149.000 ₫", { exact: true })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Thanh toán qua PayOS" });
  await expect(checkoutButton).toBeEnabled();
  await page.getByLabel("Tự động gia hạn").check();

  const popupPromise = context.waitForEvent("page");
  await checkoutButton.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");

  await expect(page.locator("#main-content").getByText("Thanh toán thành công", { exact: true })).toBeVisible();
  await expect(popup).toHaveURL(/\/payment\/return\?orderCode=987654321$/);
  await expect(popup.getByRole("heading", { name: "MediMate+ đã sẵn sàng." })).toBeVisible();
  expect(checkoutBody).toEqual({
    planId: "11111111-1111-1111-1111-111111111111",
    autoRenew: true,
  });

  await popup.close();
});
