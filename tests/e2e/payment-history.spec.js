import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxMDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

const FIRST_PAYMENT_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_PAYMENT_ID = "22222222-2222-4222-8222-222222222222";

async function authenticate(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "patient@example.com",
      displayName: "Bệnh nhân kiểm thử",
      roles: ["Patient"],
    }));
  }, ACCESS_TOKEN);
}

function payment(overrides = {}) {
  return {
    id: FIRST_PAYMENT_ID,
    userSubscriptionId: "33333333-3333-4333-8333-333333333333",
    planId: "44444444-4444-4444-8444-444444444444",
    planName: "MediMate+ Tháng",
    amount: 99000,
    currency: "VND",
    status: "Paid",
    statusName: "Paid",
    paidAt: "2026-07-12T08:30:00Z",
    createdAt: "2026-07-12T08:20:00Z",
    updatedAt: "2026-07-12T08:30:00Z",
    provider: "payOS",
    transactionReference: "PAYOS_TXN_123456",
    ...overrides,
  };
}

async function mockProfileDependencies(page, paymentHandler) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Bệnh nhân kiểm thử",
            email: "patient@example.com",
          },
        }),
      });
    }

    if (url.pathname === "/api/patient-profiles") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
        }),
      });
    }

    if (url.pathname === "/api/user-subscriptions/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    if (url.pathname.startsWith("/api/payments")) {
      return paymentHandler(route, url);
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

test("patient views paged payment history and owned payment detail", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);

  const listRequests = [];
  const detailAuthorizationHeaders = [];
  let calledAdminPaymentApi = false;

  await mockProfileDependencies(page, (route, url) => {
    if (url.pathname.startsWith("/api/payments/user/") || url.pathname === `/api/payments/${FIRST_PAYMENT_ID}`) {
      calledAdminPaymentApi = true;
    }

    if (url.pathname === "/api/payments/me") {
      const pageNumber = Number(url.searchParams.get("PageNumber"));
      const pageSize = Number(url.searchParams.get("PageSize"));
      listRequests.push({
        pageNumber,
        pageSize,
        authorization: route.request().headers().authorization,
      });
      const item = pageNumber === 2
        ? payment({
            id: SECOND_PAYMENT_ID,
            planName: "MediMate+ Năm",
            amount: 999000,
            status: "Pending",
            statusName: "Pending",
            paidAt: null,
            transactionReference: null,
          })
        : payment();

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OK",
          data: {
            pageNumber,
            pageSize,
            totalCount: 11,
            totalPages: 2,
            items: [item],
          },
        }),
      });
    }

    if (url.pathname === `/api/payments/me/${FIRST_PAYMENT_ID}`) {
      detailAuthorizationHeaders.push(route.request().headers().authorization);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "OK", data: payment() }),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "Payment not found.", data: null }),
    });
  });

  await page.goto("/profile?tab=transactions", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Lịch sử thanh toán" })).toBeVisible();
  await expect(page.getByText("MediMate+ Tháng", { exact: true })).toBeVisible();
  await expect(page.getByText("payOS", { exact: true })).toBeVisible();
  await expect(page.getByText("PAYOS_TXN_123456", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã thanh toán", { exact: true })).toBeVisible();
  const historyA11y = await new AxeBuilder({ page })
    .include("#profile-panel-transactions")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(historyA11y.violations.filter(
    (violation) => ["critical", "serious"].includes(violation.impact),
  )).toEqual([]);

  const detailButton = page.getByRole("button", { name: "Xem chi tiết" });
  await detailButton.click();
  const dialog = page.getByRole("dialog", { name: "MediMate+ Tháng" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(FIRST_PAYMENT_ID, { exact: true })).toBeVisible();
  const detailA11y = await new AxeBuilder({ page })
    .include(".payment-detail-dialog")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(detailA11y.violations.filter(
    (violation) => ["critical", "serious"].includes(violation.impact),
  )).toEqual([]);
  const closeButton = page.getByRole("button", { name: "Đóng chi tiết giao dịch" });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(detailButton).toBeFocused();

  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(page.getByText("MediMate+ Năm", { exact: true })).toBeVisible();
  await expect(page.getByText("Đang chờ", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const viewportWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(viewportWidth.scrollWidth).toBeLessThanOrEqual(viewportWidth.clientWidth);
  expect(new Set(listRequests.map((request) => request.pageNumber))).toEqual(new Set([1, 2]));
  expect(listRequests.every((request) => request.pageSize === 10)).toBe(true);
  expect(listRequests.every((request) => request.authorization === `Bearer ${ACCESS_TOKEN}`)).toBe(true);
  expect(detailAuthorizationHeaders.length).toBeGreaterThan(0);
  expect(detailAuthorizationHeaders.every((header) => header === `Bearer ${ACCESS_TOKEN}`)).toBe(true);
  expect(calledAdminPaymentApi).toBe(false);

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByRole("button", { name: "Xem chi tiết" })).toBeVisible();
});

test("payment detail hides backend error details when the payment is unavailable", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);

  await mockProfileDependencies(page, (route, url) => {
    if (url.pathname === "/api/payments/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            pageNumber: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
            items: [payment()],
          },
        }),
      });
    }

    if (url.pathname === `/api/payments/me/${FIRST_PAYMENT_ID}`) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Provider account ref secret-provider-value",
          data: null,
        }),
      });
    }

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "Not found", data: null }),
    });
  });

  await page.goto("/profile?tab=transactions", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Xem chi tiết" }).click();

  await expect(page.locator(".payment-history-error p")).toHaveText(
    "Không tìm thấy giao dịch này hoặc bạn không có quyền xem giao dịch.",
  );
  await expect(page.getByText("secret-provider-value", { exact: false })).toHaveCount(0);
});
