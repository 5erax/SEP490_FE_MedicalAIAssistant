import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

test("admin overview shows only backend totals without inferred operational data", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  const totals = {
    "/api/users": 12,
    "/api/doctors": 5,
    "/api/ai-configs": 3,
    "/api/medical-facilities": 4,
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }
    if (Object.hasOwn(totals, pathname)) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            pageNumber: 1,
            pageSize: 10,
            totalCount: totals[pathname],
            totalPages: Math.max(1, Math.ceil(totals[pathname] / 10)),
          },
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Dữ liệu hệ thống đã xác nhận" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở trang Tài khoản" })).toContainText("12");
  await expect(page.getByRole("button", { name: "Mở trang Bác sĩ" })).toContainText("5");
  await expect(page.getByRole("button", { name: "Mở trang Cấu hình AI" })).toContainText("3");
  await expect(page.getByRole("button", { name: "Mở trang Cơ sở y tế" })).toContainText("4");

  for (const unsupportedLabel of ["Điểm AI", "Hiệu suất vận hành", "Chỉ số quản trị", "Lịch vận hành", "Live"]) {
    await expect(page.getByText(unsupportedLabel, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Thông báo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lịch vận hành" })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
