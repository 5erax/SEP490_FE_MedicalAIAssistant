import AxeBuilder from "@axe-core/playwright";
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

  await expect(page.getByText("Không có tài khoản phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Trang 1 / 1 · 0/0 hiển thị", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(userRequestCount).toBe(3);
});

test("admin user filters use consistent labelled controls and status styling", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
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
                identityId: "system-admin",
                displayName: "System Admin",
                email: "admin@medimate.local",
                roles: ["Admin"],
                status: "approved",
                isActive: true,
                isDeleted: false,
              },
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
            totalCount: 4,
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

  const userSearch = page.getByLabel("Tìm tài khoản");
  await expect(userSearch).toBeVisible();
  await expect(userSearch).toHaveCSS("font-family", /Be Vietnam Pro/);
  await expect(page.getByText("approved-string@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("approved-number@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("pending-doctor@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("System Admin", { exact: true })).toHaveCount(0);
  await expect(page.getByText("admin@medimate.local", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Xóa" })).toHaveCount(3);

  await page.getByRole("button", { name: "Mở danh sách: Tất cả tài khoản" }).click();
  await page.getByRole("listbox", { name: "Trạng thái" })
    .getByRole("option", { name: "Chờ duyệt" })
    .click();

  await expect(page.getByText("approved-string@example.com", { exact: true })).toHaveCount(0);
  await expect(page.getByText("approved-number@example.com", { exact: true })).toHaveCount(0);
  await expect(page.getByText("pending-doctor@example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("1 đang hiển thị · 1 chờ duyệt · 3 tài khoản có thể quản lý trong dữ liệu đã tải", { exact: true })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const adminNavigation = page.getByRole("navigation", { name: "Điều hướng admin" });
  const activeNavigationItem = adminNavigation.getByRole("button", { name: "Người dùng" });
  const navigationToggle = page.locator(".admin-mobile-nav-toggle");
  await expect(navigationToggle).toHaveAttribute("aria-expanded", "false");
  await navigationToggle.click();
  await expect(navigationToggle).toHaveAttribute("aria-expanded", "true");
  const navigationBox = await adminNavigation.boundingBox();
  const activeNavigationBox = await activeNavigationItem.boundingBox();
  expect(activeNavigationBox.x).toBeGreaterThanOrEqual(navigationBox.x);
  expect(activeNavigationBox.x + activeNavigationBox.width).toBeLessThanOrEqual(
    navigationBox.x + navigationBox.width,
  );
  const deleteButton = page.getByRole("button", { name: "Xóa tài khoản Pending Doctor" });
  expect((await deleteButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const accessibility = await new AxeBuilder({ page })
    .include(".admin-users-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);
  expect(seriousViolations).toEqual([]);
});

test("admin restores a soft-deleted user account", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  const state = { restoredId: null };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/users" && method === "GET") {
      const deleted = !state.restoredId;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [{
              identityId: "deleted-1",
              displayName: "Deleted User",
              email: "deleted-user@example.com",
              status: "approved",
              isActive: true,
              isDeleted: deleted,
            }],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
          },
        }),
      });
    }

    if (pathname === "/api/users/deleted-1/restore" && method === "POST") {
      state.restoredId = "deleted-1";
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã khôi phục người dùng." }),
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

  const table = page.locator(".admin-users-table");
  await expect(table.getByText("Đã xóa", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa tài khoản Deleted User" })).toHaveCount(0);
  const restoreButton = page.getByRole("button", { name: "Khôi phục tài khoản Deleted User" });
  await expect(restoreButton).toBeVisible();
  await restoreButton.click();

  await page.getByRole("dialog").getByRole("button", { name: "Khôi phục" }).click();

  await expect(page.getByText("Đã khôi phục người dùng.", { exact: true })).toBeVisible();
  await expect(table.getByText("Hoạt động", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xóa tài khoản Deleted User" })).toBeVisible();
  expect(state.restoredId).toBe("deleted-1");
});
