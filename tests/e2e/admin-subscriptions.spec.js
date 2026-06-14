import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

test("admin can create a subscription plan from the workspace", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let createdPlan = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/subscription-plans" && method === "POST") {
      createdPlan = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "11111111-1111-1111-1111-111111111111",
            ...createdPlan,
            createdAt: "2026-06-12T00:00:00Z",
          },
        }),
      });
    }

    if (pathname === "/api/subscription-plans") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: createdPlan
            ? [{ id: "11111111-1111-1111-1111-111111111111", ...createdPlan }]
            : [],
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Gói dịch vụ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quản lý gói dịch vụ" })).toBeVisible();

  await page.locator(".subscription-plan-heading")
    .getByRole("button", { name: "Tạo gói", exact: true })
    .click();
  await page.getByLabel("Tên gói").fill("MediMate+ Tháng");
  await page.getByLabel("Giá gói (VND)").fill("149000");
  await page.getByLabel("Thời hạn (ngày)").fill("30");
  await page.getByLabel("Giới hạn tính năng (JSON)").fill('{"aiChatPerDay":20}');
  await page.getByRole("dialog", { name: "Tạo gói dịch vụ" })
    .getByRole("button", { name: "Tạo gói", exact: true })
    .click();

  await expect(page.getByText("MediMate+ Tháng", { exact: true })).toBeVisible();
  expect(createdPlan).toEqual({
    planName: "MediMate+ Tháng",
    price: 149000,
    durationInDays: 30,
    featureLimitJson: '{"aiChatPerDay":20}',
    isActive: true,
  });
});

test("admin retries a failed subscription plan list and receives an empty state", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let subscriptionPlanRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/subscription-plans") {
      subscriptionPlanRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (subscriptionPlanRequestCount <= 2) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Sensitive payment platform detail" }),
        });
      }

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/subscriptions", { waitUntil: "domcontentloaded" });

  const loadingState = page.getByText("Đang tải danh sách gói dịch vụ...", { exact: true });
  await expect(loadingState).toBeVisible();

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách gói dịch vụ" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách gói dịch vụ.");
  await expect(errorState).not.toContainText("Sensitive payment platform detail");

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await expect(retryButton).toHaveCSS("min-height", "44px");
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Chưa có gói dịch vụ", { exact: true })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Tạo gói dịch vụ", exact: true });
  await expect(createButton).toBeVisible();
  await expect(createButton).toHaveCSS("min-height", "44px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(subscriptionPlanRequestCount).toBe(3);
});
