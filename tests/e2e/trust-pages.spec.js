import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const TRUST_PAGES = [
  {
    path: "/support",
    title: "Tìm đúng hướng khi bạn cần trợ giúp.",
    section: "Chọn nội dung bạn cần hỗ trợ",
  },
  {
    path: "/privacy",
    title: "Hiểu dữ liệu nào được dùng và khi nào.",
    section: "Những nhóm dữ liệu có thể được xử lý",
  },
  {
    path: "/medical-disclaimer",
    title: "MediMate hỗ trợ chuẩn bị, không chẩn đoán hay kê đơn.",
    section: "MediMate có thể hỗ trợ điều gì",
  },
];

for (const infoPage of TRUST_PAGES) {
  test(`${infoPage.path} presents production information without overflow`, async ({ page }) => {
    await preparePage(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(infoPage.path, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1, name: infoPage.title })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: infoPage.section })).toBeVisible();
    await expect(page.getByRole("link", { name: "Về trang chủ MediMate" })).toHaveAttribute("href", "/");
    await expect(page.getByText("Vuốt hoặc kéo ngang để xem thêm")).toBeVisible();
    await expect(page.getByRole("navigation", {
      name: new RegExp(`Mục lục`, "i"),
    })).toBeVisible();

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  });
}

test("support page does not publish an unverified contact channel", async ({ page }) => {
  await preparePage(page);
  await page.goto("/support", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Kênh hỗ trợ trực tiếp chưa được công bố trên website", { exact: true })).toBeVisible();
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
});

test("signup consent links to the published privacy and medical documents", async ({ page }) => {
  await preparePage(page);
  await page.goto("/signup", { waitUntil: "domcontentloaded" });

  const consent = page.locator(".auth-consent");
  await expect(consent.getByRole("link", { name: "thông tin quyền riêng tư" }))
    .toHaveAttribute("href", "/privacy");
  await expect(consent.getByRole("link", { name: "tuyên bố miễn trừ y tế" }))
    .toHaveAttribute("href", "/medical-disclaimer");
  await expect(consent).not.toContainText("điều khoản sử dụng");
});

test("not-found surface stays compact and only links to registered recovery routes", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/duong-dan-khong-ton-tai", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Trang này chưa tồn tại." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Về trang chủ", exact: true })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: /Xem bảng giá/ })).toHaveAttribute("href", "/pricing");
  await expect(page.getByRole("link", { name: /Mở trang hỗ trợ/ })).toHaveAttribute("href", "/support");
  await expect(page.locator('a[href="/contact"]')).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    contentHeight: document.documentElement.scrollHeight,
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.contentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.contentHeight).toBeLessThanOrEqual(layout.viewportHeight + 120);
});
