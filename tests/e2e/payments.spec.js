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
          quotas: [{ quotaCode: "SERVICE_CREDIT", limitValue: 10, isActive: true }],
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
          transactionId: "44444444-4444-4444-4444-444444444444",
          orderCode: "987654321",
          paymentUrl: "http://127.0.0.1:3001/payment/return?orderCode=987654321",
          paymentProvider: "PayOS",
        },
      }),
    });
  });

  let payOsStatusRequests = 0;
  await context.route("**/api/payments/payos-status/987654321", (route) => {
    payOsStatusRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          orderCode: "987654321",
          paymentStatus: "Pending",
          subscriptionStatus: "Pending",
          isPaid: false,
          isActive: false,
          isCancelled: false,
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
    body: JSON.stringify({
      success: true,
      data: {
        quotaCode: "SERVICE_CREDIT",
        grantedCount: 3,
        usedCount: 0,
        reservedCount: 0,
        remainingCount: 3,
      },
    }),
  }));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("149.000 ₫", { exact: true })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Mua 10 lượt" });
  await expect(checkoutButton).toBeEnabled();

  const popupPromise = context.waitForEvent("page");
  await checkoutButton.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");

  await expect(page.locator("#main-content").getByText("Thanh toán thành công", { exact: true })).toBeVisible();
  await expect(popup).toHaveURL(/\/payment\/return\?orderCode=987654321$/);
  await expect(popup.getByRole("heading", { name: "Lượt dùng đã được cộng vào tài khoản." })).toBeVisible();
  await expect(popup.getByText("3/3 lượt", { exact: true })).toBeVisible();
  expect(payOsStatusRequests).toBeGreaterThan(0);
  expect(checkoutBody).toEqual({
    planId: "11111111-1111-1111-1111-111111111111",
    autoRenew: false,
  });

  await popup.close();
});
