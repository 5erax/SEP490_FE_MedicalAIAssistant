import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const PLAN = {
  id: "11111111-1111-4111-8111-111111111111",
  planName: "Gói 10 lượt",
  price: 90000,
  isActive: true,
};

function campaignFixture(overrides = {}) {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Tuần lễ sức khỏe",
    description: "Ưu đãi chăm sóc sức khỏe",
    badgeText: "HEALTH WEEK",
    startAt: "2026-09-02T01:00:00.000Z",
    endAt: "2026-09-09T01:00:00.000Z",
    eligibilityType: "all",
    maxRedemptions: 100,
    maxRedemptionsPerUser: 1,
    priority: 100,
    isActive: true,
    announceToUsers: false,
    displayStatus: "active",
    occupiedRedemptions: 0,
    completedRedemptions: 0,
    reservedRedemptions: 0,
    remainingRedemptions: 100,
    plans: [{ planId: PLAN.id, planName: PLAN.planName, salePrice: 75000, bonusCredit: 2, isActive: true }],
    ...overrides,
  };
}

async function prepareAdminSales(page, initialCampaigns = []) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, email: "admin@example.com", roles: ["Admin"] }));
  }, ADMIN_TOKEN);

  let campaigns = initialCampaigns;
  const requests = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }) });
    }
    if (pathname === "/api/subscription-plans") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [PLAN] }) });
    }
    if (pathname === "/api/admin/sale-campaigns" && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: campaigns, pageNumber: 1, pageSize: 10, totalCount: campaigns.length, totalPages: 1 } }),
      });
    }
    if (pathname === "/api/admin/sale-campaigns" && method === "POST") {
      const body = request.postDataJSON();
      requests.push({ method, pathname, body });
      campaigns = [campaignFixture({ ...body, id: "33333333-3333-4333-8333-333333333333" })];
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: campaigns[0] }) });
    }

    const redemptionsMatch = pathname.match(/^\/api\/admin\/sale-campaigns\/([^/]+)\/redemptions$/);
    if (redemptionsMatch) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 100, totalCount: 0, totalPages: 1 } }),
      });
    }
    const campaignMatch = pathname.match(/^\/api\/admin\/sale-campaigns\/([^/]+)$/);
    if (campaignMatch && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: campaigns.find(({ id }) => id === campaignMatch[1]) }) });
    }
    if (campaignMatch && method === "PUT") {
      const body = request.postDataJSON();
      requests.push({ method, pathname, body });
      campaigns = campaigns.map((campaign) => campaign.id === campaignMatch[1] ? { ...campaign, ...body } : campaign);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: campaigns.find(({ id }) => id === campaignMatch[1]) }) });
    }

    const pagedData = { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: url.search ? pagedData : [] }) });
  });

  await page.goto("/app/admin/sale-campaigns", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Chương trình ưu đãi MediMate" })).toBeVisible();
  return requests;
}

test("admin creates a campaign with an explicit announcement preference", async ({ page }) => {
  const requests = await prepareAdminSales(page);

  await page.getByRole("button", { name: "Thêm ưu đãi" }).click();
  const dialog = page.getByRole("dialog", { name: "Tạo chương trình ưu đãi" });
  const announcementToggle = dialog.getByRole("checkbox", { name: /Gửi thông báo ưu đãi/ });
  await expect(announcementToggle).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /Kích hoạt chương trình/ })).toBeChecked();

  await dialog.getByLabel("Tên chương trình").fill("Ưu đãi tháng 9");
  await dialog.getByLabel("Nhãn hiển thị").fill("SEPTEMBER");
  await dialog.getByLabel("Bắt đầu").fill("2026-09-03T08:00");
  await dialog.getByLabel("Kết thúc").fill("2026-09-05T08:00");
  await dialog.getByRole("checkbox", { name: /Gói 10 lượt/ }).check();
  await dialog.getByLabel("Mức phí ưu đãi").fill("75000");
  await dialog.locator("label.sale-campaign-toggle").filter({ hasText: "Gửi thông báo ưu đãi" }).click();
  await expect(announcementToggle).toBeChecked();
  await dialog.getByRole("button", { name: "Tạo ưu đãi" }).click();

  await expect.poll(() => requests.find(({ method }) => method === "POST")?.body.announceToUsers).toBe(true);
  expect(requests.find(({ method }) => method === "POST")?.body.isActive).toBe(true);
  await expect(page.getByText("Thông báo: Đang bật", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hệ thống sẽ tự động xét người dùng đủ điều kiện/)).toBeVisible();
});

test("admin edit keeps announcement separate from campaign activity", async ({ page }) => {
  const requests = await prepareAdminSales(page, [campaignFixture({ announceToUsers: true })]);

  await expect(page.getByText("Thông báo: Đang bật", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sửa" }).click();
  const dialog = page.getByRole("dialog", { name: "Tuần lễ sức khỏe" });
  const announcementToggle = dialog.getByRole("checkbox", { name: /Gửi thông báo ưu đãi/ });
  await expect(announcementToggle).toBeChecked();
  await dialog.locator("label.sale-campaign-toggle").filter({ hasText: "Gửi thông báo ưu đãi" }).click();
  await expect(announcementToggle).not.toBeChecked();
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();

  const updateRequest = () => requests.find(({ method }) => method === "PUT");
  await expect.poll(() => updateRequest()?.body.announceToUsers).toBe(false);
  expect(updateRequest()?.body.isActive).toBe(true);
  await expect(page.getByText("Thông báo: Đang tắt", { exact: true })).toBeVisible();
});
