import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ADMIN_ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

async function prepareAdmin(page, failedPaths = []) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_ACCESS_TOKEN);

  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { displayName: "System Admin", roles: ["Admin"] },
        }),
      });
    }
    if (failedPaths.includes(url.pathname)) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Internal service detail" }),
      });
    }
    if (url.pathname === "/api/subscription-plans") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
    if (url.pathname === "/api/facility-departments/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          items: [],
          pageNumber: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 1,
        },
      }),
    });
  });
}

test("admin overview marks failed KPI requests unavailable instead of zero", async ({ page }) => {
  await prepareAdmin(page, [
    "/api/users",
    "/api/doctors",
    "/api/ai-configs",
    "/api/medical-facilities",
  ]);

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  const overview = page.locator(".admin-overview");
  await expect(overview.getByText("Không khả dụng", { exact: true })).toHaveCount(4);
  await expect(overview.locator(".admin-overview-card-copy > strong", { hasText: /^0$/ })).toHaveCount(0);
  await expect(overview.getByText("Internal service detail", { exact: false })).toHaveCount(0);
  await expect(overview.getByText("Thử tải lại", { exact: true })).toHaveCount(4);
});

test("admin subscriptions hides KPI summaries when the request fails", async ({ page }) => {
  await prepareAdmin(page, ["/api/subscription-plans"]);

  await page.goto("/app/admin/subscriptions", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Không thể tải danh sách gói dịch vụ", { exact: true })).toBeVisible();
  await expect(page.locator(".subscription-plan-kpis")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thử tải lại" })).toBeVisible();
  await expect(page.getByText("Internal service detail", { exact: false })).toHaveCount(0);
});

for (const catalog of [
  {
    name: "departments",
    path: "/app/admin/departments",
    apiPath: "/api/medical-departments",
    errorTitle: "Không thể tải danh mục chuyên khoa",
    summary: ".department-result-summary",
  },
  {
    name: "ICD chapters",
    path: "/app/admin/icd-chapters",
    apiPath: "/api/icd-chapters",
    errorTitle: "Không thể tải danh mục chương ICD",
    summary: ".icd-result-summary",
  },
  {
    name: "clinical questions",
    path: "/app/admin/clinical-questions",
    apiPath: "/api/clinical-questions",
    errorTitle: "Không thể tải câu hỏi lâm sàng",
    summary: ".clinical-catalog-result-summary",
  },
]) {
  test(`admin ${catalog.name} separates request errors from empty state`, async ({ page }) => {
    await prepareAdmin(page, [catalog.apiPath]);

    await page.goto(catalog.path, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(catalog.errorTitle, { exact: true })).toBeVisible();
    await expect(page.locator(catalog.summary)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thử tải lại" })).toBeVisible();
    await expect(page.getByText("Internal service detail", { exact: false })).toHaveCount(0);
  });
}
