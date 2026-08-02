import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

async function prepareAdminSubscriptions(page, plans = [], payments = []) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, email: "admin@example.com", roles: ["Admin"] }));
  }, ADMIN_TOKEN);

  const mutationCalls = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;
    if (path === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }) });
    }
    if (path === "/api/subscription-plans") {
      if (method !== "GET") mutationCalls.push(method);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: plans }) });
    }
    if (path === "/api/payments" && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: payments, pageNumber: 1, pageSize: 10, totalCount: payments.length, totalPages: 1 } }),
      });
    }
    const paymentMatch = path.match(/^\/api\/payments\/([^/]+)$/);
    if (paymentMatch && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: payments.find((payment) => payment.id === paymentMatch[1]) }),
      });
    }
    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(path) ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 } : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });

  await page.goto("/app/admin/subscriptions", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Quản lý gói dịch vụ" })).toBeVisible();
  return mutationCalls;
}

test("admin subscription catalog is read-only until permissions are secured", async ({ page }) => {
  const mutationCalls = await prepareAdminSubscriptions(page, [{
    id: "11111111-1111-1111-1111-111111111111",
    planName: "MediMate+ Tháng",
    price: 149000,
    durationInDays: 30,
    featureLimitJson: "{\"recoveryPlanPerMonth\":3}",
    isActive: true,
    createdAt: "2026-08-01T00:00:00Z",
  }]);

  await expect(page.getByText("Trang đang ở chế độ chỉ xem.")).toBeVisible();
  await expect(page.getByText("MediMate+ Tháng", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có dữ liệu hạn mức đã xác nhận", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo gói", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sửa", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Xóa", exact: true })).toHaveCount(0);
  expect(mutationCalls).toEqual([]);
});

test("admin can review paged payments and open account transaction details", async ({ page }) => {
  await prepareAdminSubscriptions(page, [], [{
    id: "33333333-3333-4333-8333-333333333333",
    userId: "55555555-5555-4555-8555-555555555555",
    userSubscriptionId: "22222222-2222-4222-8222-222222222222",
    planId: "11111111-1111-4111-8111-111111111111",
    planName: "MediMate+ Tháng",
    amount: 149000,
    currency: "VND",
    status: "paid",
    statusName: "Paid",
    paidAt: "2026-08-02T08:00:00Z",
    createdAt: "2026-08-02T07:55:00Z",
    paymentProvider: "PayOS",
    transactionReference: "987654321",
  }]);

  await expect(page.getByRole("heading", { name: "Lịch sử thanh toán" })).toBeVisible();
  await expect(page.getByText("149.000 ₫", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  const dialog = page.getByRole("dialog", { name: "MediMate+ Tháng" });
  await expect(dialog).toContainText("987654321");
  await expect(dialog).toContainText("Đã thanh toán");
});

test("empty admin catalog remains responsive and offers retry synchronization", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareAdminSubscriptions(page, []);

  await expect(page.getByText("Chưa có gói dịch vụ", { exact: true })).toBeVisible();
  const reloadButton = page.getByRole("button", { name: "Đồng bộ" });
  await expect(reloadButton).toHaveCSS("min-height", "44px");
  await reloadButton.focus();
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
