import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";
import { saleCampaignFixtures, saleImpactFixture } from "./fixtures/sale-revenue-impact";

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
      const pageNumber = Number(url.searchParams.get("PageNumber") || 1);
      const pageSize = Number(url.searchParams.get("PageSize") || 10);
      const users = Array.from({ length: totals["/api/users"] }, (_, index) => ({ id: `user-${index}`, name: `User ${index}` }));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: pathname === "/api/users" ? users.slice((pageNumber - 1) * pageSize, pageNumber * pageSize) : [],
            pageNumber,
            pageSize,
            totalCount: totals[pathname],
            totalPages: Math.max(1, Math.ceil(totals[pathname] / pageSize)),
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
  for (const endpoint of ["doctor-invitations", "user-subscriptions"]) {
    await page.route(`**/api/admin/${endpoint}*`, (route) => route.fulfill({ status: 503, json: { success: false } }));
  }
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

  // Unavailable backend metrics must read as blocked, not as zero.
  await expect(attentionList.locator("li", { hasText: "Lời mời bác sĩ chưa nhận" }).getByText("Không khả dụng")).toBeVisible();
  await expect(attentionList.locator("li", { hasText: "Người dùng đang dùng gói" }).getByText("Không khả dụng")).toBeVisible();
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
          { id: "p1", amount: 100000, status: "paid", createdAt: "2026-06-15T08:00:00Z", paidAt: "2026-06-15T08:00:00Z" },
          { id: "p2", amount: 200000, status: "paid", createdAt: "2026-07-10T08:00:00Z", paidAt: "2026-07-10T08:00:00Z" },
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
          { id: "p1", amount: 400000, status: "paid", createdAt: "2026-08-01T08:00:00Z", paidAt: "2026-09-01T08:00:00Z" },
          { id: "p2", amount: 364000, status: "paid", createdAt: "2026-08-06T08:00:00Z", paidAt: "2026-09-06T08:00:00Z" },
          { id: "invalid", amount: 999999, status: "paid", createdAt: "2026-10-06T08:00:00Z", paidAt: null },
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
  // Every calendar month of the year must get a point, not just September
  // (the only month with an actual payment).
  await expect(chart.locator("circle.overview-line-chart-dot")).toHaveCount(12);
  await expect(chart.locator("text.overview-line-chart-axis-label")).toHaveText([
    "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",
  ]);
  // Zero-revenue months skip the value label to avoid cluttering the chart.
  await expect(chart.locator("text.overview-line-chart-value-label")).toHaveCount(1);
  await expect(chart.locator("text.overview-line-chart-value-label")).toHaveText("764k ₫");
  await expect(chart.locator("circle.overview-line-chart-dot").nth(7).locator("title")).toHaveText("T8: 0 ₫");
  await expect(chart.locator("circle.overview-line-chart-dot").nth(8).locator("title")).toHaveText("T9: 764.000 ₫");
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
      await page.getByRole("button", { name: "Danh mục", exact: true }).click();
      await expect(page.getByRole("navigation", { name: "Điều hướng admin" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Điều hướng admin" })).toHaveCSS("overflow-y", "auto");
      const logoutButton = page.getByRole("button", { name: "Đăng xuất" });
      expect((await logoutButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("admin overview has no serious automated accessibility violations", async ({ page }) => {
  await mockAdminOverview(page);
  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Thông tin cốt lõi của hệ thống" })).toBeVisible();
  await expect(salePanel(page).getByText("Chưa có chương trình khuyến mãi để phân tích.")).toBeVisible();

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

async function mockSaleImpact(page, { campaigns = saleCampaignFixtures, impact = saleImpactFixture() } = {}) {
  await mockAdminOverview(page);
  const calls = { list: [], impact: [] };
  await page.route("**/api/admin/sale-campaigns**", async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/sale-campaigns\/([^/]+)\/revenue-impact$/);
    if (match) {
      calls.impact.push(match[1]);
      return route.fulfill({ json: { success: true, data: { ...impact, campaignId: match[1] } } });
    }
    const pageNumber = Number(url.searchParams.get("PageNumber"));
    calls.list.push(pageNumber);
    return route.fulfill({ json: { success: true, data: { items: campaigns.slice(pageNumber - 1, pageNumber), totalPages: campaigns.length, totalCount: campaigns.length } } });
  });
  return calls;
}

const salePanel = (page) => page.getByRole("region", { name: "Doanh thu theo timeline Sale", exact: true });
const saleMetric = (page, label) => salePanel(page).locator(".sale-impact-kpi").filter({ has: page.locator("dt", { hasText: new RegExp(`^${label}$`) }) }).locator("dd").first();

test("sale impact loads all campaign pages, selects latest and keeps attribution separate", async ({ page }) => {
  const calls = await mockSaleImpact(page);
  await page.goto("/app/admin");
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  expect(calls.list).toEqual([1, 2]);
  expect(calls.impact).toEqual(["latest"]);
  await expect(page.getByLabel("Chương trình khuyến mãi", { exact: true })).toHaveValue("latest");
  await expect(saleMetric(page, "Kỳ liền trước")).toHaveText("1.200.000 ₫");
  await expect(saleMetric(page, "Trong thời gian Sale")).toHaveText("1.800.000 ₫");
  await expect(saleMetric(page, "Doanh thu từ campaign")).toHaveText("1.450.000 ₫");
  await expect(saleMetric(page, "Thay đổi so với kỳ liền trước")).toHaveText("+50%");
  await expect(saleMetric(page, "Giao dịch Sale")).toHaveText("31");
  await expect(saleMetric(page, "Giá trị đơn TB")).toHaveText("46.774 ₫");
  await expect(saleMetric(page, "Tổng ưu đãi giá đã áp dụng")).toHaveText("410.000 ₫");
  await expect(saleMetric(page, "Lượt khuyến mãi đã cấp")).toHaveText("96 lượt");
  await expect(saleMetric(page, "Sau Sale")).toHaveText("1.350.000 ₫");
  await expect(salePanel(page).getByText(/Dữ liệu sau Sale chưa đủ kỳ/)).toBeVisible();
  const boundary = salePanel(page).locator('.sale-impact-point[data-date="2026-09-20"]');
  await expect(boundary).toHaveCount(2);
  await expect(boundary.nth(0).locator("title").first()).toContainText("20/09 · Trước Sale");
  await expect(boundary.nth(1).locator("title").first()).toContainText("20/09 · Trong Sale");
  await page.getByLabel("Chương trình khuyến mãi", { exact: true }).selectOption("older");
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  expect(calls.impact).toEqual(["latest", "older"]);
  await salePanel(page).getByRole("button", { name: "Tải lại phân tích", exact: true }).click();
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  expect(calls.list).toEqual([1, 2]);
  await salePanel(page).getByRole("button", { name: "Tải lại danh sách" }).click();
  await expect(page.getByLabel("Chương trình khuyến mãi", { exact: true })).toHaveValue("older");
});

test("same-day campaign keeps three period points and two distinct series", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (/same key|unique.*key/i.test(message.text())) errors.push(message.text()); });
  await mockSaleImpact(page, { impact: saleImpactFixture({ series: ["Before", "During", "After"].map((period) => ({ date: "2026-09-20", period, totalRevenue: 0, campaignRevenue: 0, paidOrders: 0, campaignOrders: 0 })) }) });
  await page.goto("/app/admin");
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(3);
  await expect(salePanel(page).locator("path.sale-impact-line")).toHaveCount(2);
  await expect(salePanel(page).locator(".sale-impact-separator")).toHaveCount(2);
  await expect(salePanel(page).getByRole("img")).not.toHaveAttribute("viewBox", /NaN|Infinity/);
  await salePanel(page).getByText("Xem dữ liệu từng ngày", { exact: true }).click();
  await expect(salePanel(page).locator("tbody tr")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("active campaign shows equal-window explanation, N/A percent and no After KPI", async ({ page }) => {
  const fixture = saleImpactFixture();
  await mockSaleImpact(page, { impact: { ...fixture, campaignStatus: "Active", windows: { ...fixture.windows, isCampaignEnded: false, isCampaignActive: true, afterStart: null, afterEnd: null }, metrics: { ...fixture.metrics, revenueBefore: 0, revenueChangePercent: null }, series: fixture.series.filter((point) => point.period !== "After") } });
  await page.goto("/app/admin");
  await expect(saleMetric(page, "Thay đổi so với kỳ liền trước")).toHaveText("N/A - kỳ trước chưa có doanh thu");
  await expect(saleMetric(page, "Sau Sale")).toHaveCount(0);
  await expect(salePanel(page).getByText(/cùng độ dài với thời gian Sale đã chạy/)).toBeVisible();
  await expect(salePanel(page).getByText(/Dữ liệu sau Sale chưa đủ kỳ/)).toHaveCount(0);
  await expect(salePanel(page).locator('.sale-impact-point[data-period="After"]')).toHaveCount(0);
});

test("future campaign shows metadata and honest empty state", async ({ page }) => {
  await mockSaleImpact(page, { impact: saleImpactFixture({ campaignStatus: "NotStarted", windows: { isCampaignNotStarted: true }, series: [] }) });
  await page.goto("/app/admin");
  await expect(salePanel(page).getByText("Chưa bắt đầu", { exact: true })).toBeVisible();
  await expect(salePanel(page).getByText(/biểu đồ sẽ có dữ liệu/)).toBeVisible();
  await expect(salePanel(page).getByRole("img")).toHaveCount(0);
  await expect(saleMetric(page, "Trong thời gian Sale")).toHaveCount(0);
});

test("empty campaign list never requests impact", async ({ page }) => {
  const calls = await mockSaleImpact(page, { campaigns: [] });
  await page.goto("/app/admin");
  await expect(salePanel(page).getByText("Chưa có chương trình khuyến mãi để phân tích.")).toBeVisible();
  expect(calls.impact).toEqual([]);
});

test("404 reloads the campaign list and skips the deleted campaign even if list is stale", async ({ page }) => {
  const calls = await mockSaleImpact(page);
  await page.route("**/api/admin/sale-campaigns/latest/revenue-impact", (route) => route.fulfill({ status: 404, json: { success: false, message: "Deleted" } }));
  await page.goto("/app/admin");
  await expect(page.getByLabel("Chương trình khuyến mãi", { exact: true })).toHaveValue("older");
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  await expect(salePanel(page).getByText(/Chương trình đã chọn không còn khả dụng/)).toBeVisible();
  expect(calls.list).toEqual([1, 2, 1, 2]);
  expect(calls.impact).toEqual(["older"]);
});

test("404 on the last campaign leaves a clear empty state without retry loops", async ({ page }) => {
  const calls = await mockSaleImpact(page, { campaigns: [saleCampaignFixtures[1]] });
  await page.route("**/api/admin/sale-campaigns/latest/revenue-impact", (route) => route.fulfill({ status: 404, json: { success: false } }));
  await page.goto("/app/admin");
  await expect(salePanel(page).getByText("Chưa có chương trình khuyến mãi để phân tích.")).toBeVisible();
  expect(calls.list).toEqual([1, 1]);
});

for (const failure of ["server", "network"]) {
  test(`sale impact ${failure} error stays local and retry recovers`, async ({ page }) => {
    await mockSaleImpact(page);
    let fail = true;
    await page.route("**/api/admin/sale-campaigns/latest/revenue-impact", (route) => {
      if (!fail) return route.fulfill({ json: { success: true, data: saleImpactFixture() } });
      return failure === "network" ? route.abort("failed") : route.fulfill({ status: 500, json: { success: false } });
    });
    await page.goto("/app/admin");
    await expect(salePanel(page).getByRole("alert")).toContainText("Không thể tải phân tích doanh thu");
    await expect(page.getByRole("heading", { name: "Tỉ lệ thanh toán thành công" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mở trang Tài khoản" })).toContainText("12");
    fail = false;
    await salePanel(page).getByRole("button", { name: "Thử lại phân tích" }).click();
    await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  });
}

test("campaign list failure can be retried independently", async ({ page }) => {
  await mockSaleImpact(page);
  let fail = true;
  await page.route(/\/api\/admin\/sale-campaigns\?/, (route) => fail
    ? route.fulfill({ status: 500, json: { success: false } })
    : route.fallback());
  await page.goto("/app/admin");
  await expect(salePanel(page).getByRole("alert")).toContainText("Không thể tải danh sách");
  fail = false;
  await salePanel(page).getByRole("button", { name: "Tải lại danh sách" }).click();
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
});

test("switching campaigns ignores a late response from the previous selection", async ({ page }) => {
  await mockSaleImpact(page);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/admin/sale-campaigns/latest/revenue-impact", async (route) => {
    await gate;
    await route.fulfill({ json: { success: true, data: saleImpactFixture({ campaignName: "Stale campaign" }) } });
  });
  const pending = page.waitForRequest("**/api/admin/sale-campaigns/latest/revenue-impact");
  await page.goto("/app/admin");
  await pending;
  await expect(salePanel(page).getByText("Đang tải phân tích doanh thu…")).toBeVisible();
  await page.getByLabel("Chương trình khuyến mãi", { exact: true }).selectOption("older");
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  const completed = page.waitForResponse("**/api/admin/sale-campaigns/latest/revenue-impact");
  release();
  await completed;
  await expect(page.getByLabel("Chương trình khuyến mãi", { exact: true })).toHaveValue("older");
  await expect(salePanel(page).getByText("Stale campaign", { exact: true })).toHaveCount(0);
});

test("sale impact supports keyboard, responsive layouts and dark mode without page overflow", async ({ page }, testInfo) => {
  testInfo.setTimeout(90_000);
  await mockSaleImpact(page);
  await page.goto("/app/admin");
  await expect(salePanel(page).locator(".sale-impact-point")).toHaveCount(5);
  const selector = page.getByLabel("Chương trình khuyến mãi", { exact: true });
  await selector.focus();
  await expect(selector).toBeFocused();
  await expect(selector).toHaveCSS("outline-style", "solid");
  await selector.blur();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => document.documentElement.dataset.theme = value, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await salePanel(page).screenshot({ path: testInfo.outputPath(`sale-impact-${width}-${theme}.png`), style: ".skip-link { visibility: hidden; }" });
      const results = await new AxeBuilder({ page }).include(".sale-impact-card").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact))).toEqual([]);
    }
  }
});
