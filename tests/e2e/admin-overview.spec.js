import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

async function mockAdminOverview(page) {
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
}

test("admin overview shows only backend totals without inferred operational data", async ({ page }) => {
  await mockAdminOverview(page);
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Thông tin cốt lõi của hệ thống" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở trang Tài khoản" })).toContainText("12");
  await expect(page.getByRole("link", { name: "Mở trang Bác sĩ" })).toContainText("5");
  await expect(page.getByRole("link", { name: "Mở trang Cấu hình AI" })).toContainText("3");
  await expect(page.getByRole("link", { name: "Mở trang Cơ sở y tế" })).toContainText("4");
  await expect(page.getByText("Chỉ hiển thị dữ liệu đã có")).toBeVisible();

  for (const unsupportedLabel of ["Điểm AI", "Hiệu suất vận hành", "Chỉ số quản trị", "Lịch vận hành", "Live"]) {
    await expect(page.getByText(unsupportedLabel, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Thông báo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lịch vận hành" })).toHaveCount(0);
});

test("admin overview navigation remains keyboard operable", async ({ page }) => {
  await mockAdminOverview(page);
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  const usersLink = page.getByRole("link", { name: "Mở trang Tài khoản" });
  await usersLink.focus();
  await expect(usersLink).toBeFocused();
  await expect(usersLink).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/app\/admin\/users$/);
});

test("admin overview reflows without horizontal overflow", async ({ page }) => {
  await mockAdminOverview(page);

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 768, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Thông tin cốt lõi của hệ thống" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    if (viewport.width === 320) {
      await expect(page.getByRole("navigation", { name: "Điều hướng admin" })).toHaveCSS("overflow-x", "auto");
      const logoutButton = page.getByRole("button", { name: "Đăng xuất" });
      expect((await logoutButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("admin overview has no serious automated accessibility violations", async ({ page }) => {
  await mockAdminOverview(page);
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Thông tin cốt lõi của hệ thống" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));

  expect(seriousViolations).toEqual([]);
});
