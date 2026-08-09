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

test("admin overview shows the phase-1 master-data count cards", async ({ page }) => {
  await mockAdminOverview(page);
  await page.route("**/api/medical-departments*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 7, totalPages: 1 } }),
  }));
  await page.route("**/api/icd-chapters*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 22, totalPages: 3 } }),
  }));
  await page.route("**/api/clinical-questions*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 1, totalCount: 48, totalPages: 48 } }),
  }));
  await page.route("**/api/lab-indicators*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 1, totalCount: 15, totalPages: 15 } }),
  }));
  await page.route("**/api/patient-profiles*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 30, totalPages: 3 } }),
  }));
  await page.route("**/api/subscription-plans*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [{ id: "p1", isActive: true }, { id: "p2", isActive: true }, { id: "p3", isActive: false }] }),
  }));
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("link", { name: "Mở trang Chuyên khoa" })).toContainText("7");
  await expect(page.getByRole("link", { name: "Mở trang Chương ICD" })).toContainText("22");
  await expect(page.getByRole("link", { name: "Mở trang Câu hỏi" })).toContainText("48");
  await expect(page.getByRole("link", { name: "Mở trang Chỉ số XN" })).toContainText("15");
  await expect(page.getByRole("link", { name: "Mở trang Hồ sơ bệnh nhân" })).toContainText("30");
  await expect(page.getByRole("link", { name: "Mở trang Gói dịch vụ" })).toContainText("2");
});

test("admin overview shows the phase-2 operational attention list, including blocked metrics", async ({ page }) => {
  await mockAdminOverview(page);
  await page.route("**/api/feedback-reviews*", (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    const totalCount = status === "pending" ? 3 : status === "hidden" ? 2 : 0;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 1, totalCount, totalPages: 1 } }),
    });
  });
  await page.route("**/api/lab-tests/sessions*", (route) => {
    const status = new URL(route.request().url()).searchParams.get("status");
    const totalCount = status === "processing" ? 4 : status === "failed" ? 1 : 0;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 1, totalCount, totalPages: 1 } }),
    });
  });
  await page.route("**/api/symptom-analysis/sessions*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 1, totalCount: 6, totalPages: 6 } }),
  }));
  await page.route("**/api/payments*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        items: [
          { id: "p1", amount: 100000, status: "paid", createdAt: "2026-08-01T08:00:00Z" },
          { id: "p2", amount: 50000, status: "pending", createdAt: "2026-08-02T08:00:00Z" },
          { id: "p3", amount: 30000, status: "failed", createdAt: "2026-08-03T08:00:00Z" },
        ],
        pageNumber: 1,
        pageSize: 100,
        totalCount: 3,
        totalPages: 1,
      },
    }),
  }));
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Vận hành cần xử lý" })).toBeVisible();
  const attentionList = page.locator(".admin-overview-attention-list");
  await expect(attentionList.getByText("Feedback chờ duyệt")).toBeVisible();
  await expect(attentionList.locator("li", { hasText: "Feedback chờ duyệt" }).getByText("5", { exact: true })).toBeVisible();
  await expect(attentionList.locator("li", { hasText: "Xét nghiệm cần xử lý" }).getByText("5", { exact: true })).toBeVisible();
  await expect(attentionList.locator("li", { hasText: "Phân tích triệu chứng lỗi" }).getByText("6", { exact: true })).toBeVisible();
  await expect(attentionList.locator("li", { hasText: "Thanh toán chưa hoàn tất" }).getByText("2", { exact: true })).toBeVisible();

  // Metrics with no backend list endpoint yet must read as blocked, not as zero.
  await expect(attentionList.locator("li", { hasText: "Lời mời bác sĩ chưa nhận" }).getByText("Chưa khả dụng")).toBeVisible();
  await expect(attentionList.locator("li", { hasText: "Người dùng đang dùng gói" }).getByText("Chưa khả dụng")).toBeVisible();
});

test("admin overview shows revenue growth, a payment success/failure chart, and account growth", async ({ page }) => {
  await mockAdminOverview(page);
  await page.route("**/api/users*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        items: [
          { id: "u1", name: "User 1", createdAt: "2026-03-05T08:00:00Z" },
          { id: "u2", name: "User 2", createdAt: "2026-03-20T08:00:00Z" },
          { id: "u3", name: "User 3", createdAt: "2026-07-01T08:00:00Z" },
          { id: "u4", name: "User 4", createdAt: "2026-07-15T08:00:00Z" },
          { id: "u5", name: "User 5", createdAt: "2026-07-20T08:00:00Z" },
        ],
        pageNumber: 1,
        pageSize: 100,
        totalCount: 5,
        totalPages: 1,
      },
    }),
  }));
  await page.route("**/api/payments*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        items: [
          { id: "p1", amount: 100000, status: "paid", createdAt: "2026-06-15T08:00:00Z" },
          { id: "p2", amount: 200000, status: "paid", createdAt: "2026-07-10T08:00:00Z" },
          { id: "p3", amount: 50000, status: "failed", createdAt: "2026-07-12T08:00:00Z" },
          { id: "p4", amount: 150000, status: "pending", createdAt: "2026-07-14T08:00:00Z" },
          { id: "p5", amount: 80000, status: "cancelled", createdAt: "2026-07-15T08:00:00Z" },
        ],
        pageNumber: 1,
        pageSize: 100,
        totalCount: 5,
        totalPages: 1,
      },
    }),
  }));
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Doanh thu theo tháng - Năm 2026" })).toBeVisible();
  await expect(page.locator(".admin-overview-chart-card.is-revenue .admin-overview-chart-total")).toHaveText("300.000 ₫");

  await expect(page.getByRole("heading", { name: "Tỉ lệ thanh toán thành công" })).toBeVisible();
  const barChartRows = page.locator(".overview-bar-chart-rows > li");
  await expect(barChartRows.nth(0).locator(".overview-bar-chart-fill.is-success")).toBeVisible();
  await expect(barChartRows.nth(0).locator(".overview-bar-chart-value")).toHaveText("2 · 50%");
  await expect(barChartRows.nth(1).locator(".overview-bar-chart-fill.is-danger")).toBeVisible();
  await expect(barChartRows.nth(1).locator(".overview-bar-chart-value")).toHaveText("2 · 50%");

  await expect(page.getByRole("heading", { name: "Tăng trưởng tài khoản - Năm 2026" })).toBeVisible();
  await expect(page.locator(".admin-overview-chart-card.is-user-growth .admin-overview-chart-total")).toHaveText("5 tài khoản mới");
  const userGrowthChart = page.getByRole("img", { name: "Biểu đồ tăng trưởng tài khoản theo từng tháng" });
  await expect(userGrowthChart).toBeVisible();
  await expect(userGrowthChart.locator("circle.overview-line-chart-dot")).toHaveCount(12);
  await expect(userGrowthChart.locator("text.overview-line-chart-value-label")).toHaveText(["2", "3"]);
});

test("revenue chart always plots all 12 months of the latest year with data, even ones with no revenue", async ({ page }) => {
  await mockAdminOverview(page);
  await page.route("**/api/payments*", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        items: [
          { id: "p1", amount: 400000, status: "paid", createdAt: "2026-08-01T08:00:00Z" },
          { id: "p2", amount: 364000, status: "paid", createdAt: "2026-08-06T08:00:00Z" },
        ],
        pageNumber: 1,
        pageSize: 100,
        totalCount: 2,
        totalPages: 1,
      },
    }),
  }));
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".admin-overview-chart-total")).toHaveText("764.000 ₫");
  const chart = page.getByRole("img", { name: "Biểu đồ doanh thu theo từng tháng" });
  await expect(chart).toBeVisible();
  // Every calendar month of the year must get a point, not just August
  // (the only month with an actual payment).
  await expect(chart.locator("circle.overview-line-chart-dot")).toHaveCount(12);
  await expect(chart.locator("text.overview-line-chart-axis-label")).toHaveText([
    "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",
  ]);
  // Zero-revenue months skip the value label to avoid cluttering the chart.
  await expect(chart.locator("text.overview-line-chart-value-label")).toHaveCount(1);
  await expect(chart.locator("text.overview-line-chart-value-label")).toHaveText("764k ₫");
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
