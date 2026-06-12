import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxMDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

test("authenticated user can create and complete a PayOS checkout", async ({ page, context }) => {
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
  let checkoutCreated = false;

  await page.route("**/api/subscription-plans/active", (route) => route.fulfill({
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

  await page.route("**/api/user-subscriptions/me", (route) => {
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: checkoutCreated
          ? [{
              id: "22222222-2222-2222-2222-222222222222",
              planId: "11111111-1111-1111-1111-111111111111",
              planName: "MediMate+ Monthly",
              status: 1,
              statusName: "Active",
              autoRenew: false,
              endDate: "2026-07-12T00:00:00Z",
            }]
          : [],
      }),
    });
  });

  await page.route("**/api/user-subscriptions/checkout", async (route) => {
    checkoutBody = route.request().postDataJSON();
    checkoutCreated = true;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          subscriptionId: "22222222-2222-2222-2222-222222222222",
          paymentId: "33333333-3333-3333-3333-333333333333",
          paymentUrl: "http://localhost:3000/payment-stub",
          paymentProvider: "PayOS",
        },
      }),
    });
  });

  await page.route("**/api/payments/33333333-3333-3333-3333-333333333333", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "33333333-3333-3333-3333-333333333333",
        status: 1,
        statusName: "Paid",
        paidAt: "2026-06-12T00:00:00Z",
      },
    }),
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
        planName: "MediMate+ Monthly",
      },
    }),
  }));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("149.000 ₫", { exact: true })).toBeVisible();

  const checkoutButton = page.getByRole("button", { name: "Thanh toán qua PayOS" });
  await expect(checkoutButton).toBeEnabled();

  const popupPromise = context.waitForEvent("page");
  await checkoutButton.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");

  await expect(page.getByText("Thanh toán thành công", { exact: true })).toBeVisible();
  await expect(
    page.locator("#current-subscription").getByRole("heading", { name: "MediMate+ Monthly" }),
  ).toBeVisible();
  expect(checkoutBody).toEqual({
    planId: "11111111-1111-1111-1111-111111111111",
    autoRenew: false,
  });

  await popup.close();
});
