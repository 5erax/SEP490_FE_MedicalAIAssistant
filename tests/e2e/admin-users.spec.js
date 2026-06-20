import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

test("admin retries a failed user list and receives an empty state", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let userRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/users") {
      userRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (userRequestCount <= 2) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Sensitive identity provider detail" }),
        });
      }

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
        }),
      });
    }

    const pagedPaths = ["/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/users", { waitUntil: "domcontentloaded" });

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách tài khoản" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách tài khoản.");
  await expect(errorState).not.toContainText("Sensitive identity provider detail");
  await expect(page.getByText("Trang 1 / 1 · 0 tài khoản cần duyệt", { exact: true })).toHaveCount(0);

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await expect(retryButton).toHaveCSS("min-height", "44px");
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Không có tài khoản chờ duyệt", { exact: true })).toBeVisible();
  await expect(page.getByText("Trang 1 / 1 · 0 tài khoản cần duyệt", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(userRequestCount).toBe(3);
});

test("admin pending queue hides accounts already approved by backend", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/users") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                identityId: "approved-1",
                displayName: "Approved String",
                email: "approved-string@example.com",
                status: "approved",
                statusName: "Active",
                isActive: true,
                isDeleted: false,
              },
              {
                identityId: "approved-2",
                displayName: "Approved Number",
                email: "approved-number@example.com",
                status: 1,
                isActive: true,
                isDeleted: false,
              },
              {
                identityId: "pending-1",
                displayName: "Pending Doctor",
                email: "pending-doctor@example.com",
                status: "pending",
                isActive: true,
                isDeleted: false,
              },
            ],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 3,
            totalPages: 1,
          },
        }),
      });
    }

    const pagedPaths = ["/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/users", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("pending-doctor@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("approved-string@example.com", { exact: true })).toHaveCount(0);
  await expect(page.getByText("approved-number@example.com", { exact: true })).toHaveCount(0);
});
