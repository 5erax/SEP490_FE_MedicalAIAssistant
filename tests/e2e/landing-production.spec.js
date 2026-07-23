import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const MAP_STYLE = { version: 8, name: "Landing test map", sources: {}, layers: [] };

async function mockLandingPreviewApis(page) {
  await page.route("**/api/medical-facilities/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          facilityName: "Cơ sở kiểm thử Quận 1",
          address: "Quận 1, TP.HCM",
          latitude: 10.7769,
          longitude: 106.7009,
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          facilityName: "Cơ sở kiểm thử Quận 3",
          address: "Quận 3, TP.HCM",
          latitude: 10.7844,
          longitude: 106.6844,
        },
      ],
    }),
  }));

  await page.route("**/api/subscription-plans/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          planName: "Medimate + tháng",
          price: 149000,
          durationInDays: 30,
          featureLimitJson: JSON.stringify({
            symptomAnalysisPerMonth: 30,
            aiChatPerDay: 20,
          }),
        },
      ],
    }),
  }));

  await page.route("https://basemaps.cartocdn.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(MAP_STYLE),
  }));
}

test("landing uses a direct MapLibre preview with a text alternative", async ({ page }) => {
  await preparePage(page);
  await mockLandingPreviewApis(page);
  await page.goto("/", { waitUntil: "load" });

  await expect(page.getByRole("heading", {
    name: "Tìm cơ sở và chuẩn bị cho buổi khám.",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Khám phá bản đồ cơ sở y tế" })).toHaveAttribute("href", "/map");
  await expect(page.getByText("Cơ sở kiểm thử Quận 1", { exact: true })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  const firstMarker = page.getByRole("button", { name: "Chọn Cơ sở kiểm thử Quận 1 trên bản đồ" });
  await expect(firstMarker).toBeVisible();
  await firstMarker.focus();
  await firstMarker.press("Enter");
  await expect(page.getByRole("link", { name: "Xem trên bản đồ đầy đủ" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bỏ qua bản đồ, xem danh sách cơ sở" })).toHaveAttribute("href", "#landing-map-details");
  await expect(page.getByRole("heading", { name: "Bắt đầu miễn phí. Nâng cấp khi cần." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Miễn phí", exact: true })).toBeVisible();
  await expect(page.getByText("Phân tích triệu chứng qua câu hỏi lâm sàng tham khảo", { exact: true })).toBeVisible();
  await expect(page.getByText("Tìm cơ sở y tế trên bản đồ công khai", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Bắt đầu miễn phí. Nâng cấp").getByRole("link", { name: "Bắt đầu miễn phí" }),
  ).toHaveAttribute("href", "/medical-assistant");
  await expect(page.getByRole("heading", { name: "MediMate Plus" })).toBeVisible();
  await expect(page.getByText("149.000đ", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "MediMate Plus" }).locator("..").getByText("/ tháng", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("30 lượt phân tích triệu chứng mỗi tháng", { exact: true })).toBeVisible();
  await expect(page.getByText("20 lượt trò chuyện với trợ lý AI mỗi ngày", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đăng ký MediMate Plus" })).toHaveAttribute("href", "/pricing");
  await expect(page.getByText("Xem bảng giá đầy đủ", { exact: true })).toHaveCount(0);

  for (const fakeContent of [
    "Thời gian chờ dự kiến",
    "35 phút",
    "2.4 km",
  ]) {
    await expect(page.getByText(fakeContent, { exact: false })).toHaveCount(0);
  }

});

test("landing map CTA navigates to the production map route", async ({ page }) => {
  await preparePage(page);
  await mockLandingPreviewApis(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.getByRole("link", { name: "Khám phá bản đồ cơ sở y tế" }).click();

  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole("heading", { name: "Bản đồ cơ sở y tế" })).toBeVisible();
});

test("landing presents only current product capabilities and explicit boundaries", async ({ page }) => {
  await preparePage(page);
  await mockLandingPreviewApis(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", {
    name: "Điều hướng y tế. Sẵn sàng trước khi khám.",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Chọn việc bạn cần làm trước.",
  })).toBeVisible();
  await expect(page.getByRole("heading", {
    name: "Biết rõ giới hạn để sử dụng an toàn.",
  })).toBeVisible();
  await expect(page.getByText("Giới hạn được nói rõ", { exact: true })).toBeVisible();
  await expect(page.getByText("Thông tin theo dữ liệu hiện có", { exact: true })).toBeVisible();
  await expect(page.getByText("Bạn kiểm soát thông tin được chia sẻ", { exact: true })).toBeVisible();
  await expect(page.getByText("Không dùng MediMate trong tình huống khẩn cấp", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Không chẩn đoán hay kê đơn" })).toBeVisible();
  await expect(page.getByText(
    "Không cần biết thuật ngữ y khoa. Chọn đúng việc bạn cần làm ở thời điểm hiện tại.",
    { exact: true },
  )).toHaveCount(0);
  await expect(page.getByText(
    "So sánh những gì bạn có thể dùng ngay trên các trang công khai với quyền lợi có hạn mức của gói đăng ký. Giá và hạn mức gói trả phí được lấy trực tiếp từ hệ thống.",
    { exact: true },
  )).toHaveCount(0);
  await expect(page.getByText(
    "Phân tích triệu chứng khi bạn cần làm rõ dấu hiệu, hoặc mở bản đồ khi đã sẵn sàng tìm nơi thăm khám.",
    { exact: true },
  )).toHaveCount(0);
  await expect(page.locator('a[href="/medical-assistant/safety"]')).toHaveCount(0);
  await expect(page.locator(".care-dossier-output").getByRole("listitem")).toHaveCount(3);
  await expect(
    page.locator(".care-dossier").getByRole("link", { name: /Mô tả triệu chứng bằng lời của bạn/ }),
  ).toHaveAttribute("href", "/medical-assistant");
  await expect(page.getByRole("button", { name: "Mở trợ lý sức khỏe MediMate" })).toBeVisible();

  await expect(page.locator(".care-hero").getByRole("link", { name: "Phân tích triệu chứng", exact: true })).toHaveAttribute(
    "href",
    "/medical-assistant",
  );
  await expect(page.getByRole("link", { name: "Bắt đầu phân tích triệu chứng", exact: true })).toHaveAttribute(
    "href",
    "/medical-assistant",
  );
  await expect(
    page.locator(".care-support-section").getByRole("link", { name: "Tìm cơ sở trên bản đồ", exact: true }),
  ).toHaveAttribute("href", "/map");
  await expect(
    page.locator(".care-support-section").getByRole("link", { name: "Tạo tài khoản MediMate", exact: true }),
  ).toHaveAttribute("href", "/signup");
  await expect(
    page.locator(".care-support-section").getByRole("link", { name: "Hỏi MediMate AI", exact: true }),
  ).toHaveAttribute("href", "/medical-assistant");
  await expect(page.locator(".care-path-grid").getByRole("article")).toHaveCount(2);
  await expect(page.locator(".care-supporting-tools").getByRole("article")).toHaveCount(2);

  for (const unsupportedClaim of [
    "2.5s",
    "24/7",
    "50K+",
    "98%",
    "Dùng thử 14 ngày",
    "Nguyễn Thị Lan",
    "Trần Minh Khoa",
    "Lê Phương Anh",
    "Nhắc thuốc đúng lịch",
    "Giải thích kết quả xét nghiệm",
    "Cho gia đình",
    "Cho phòng khám",
  ]) {
    await expect(page.getByText(unsupportedClaim, { exact: false })).toHaveCount(0);
  }
});

test("landing remains readable without horizontal overflow on mobile", async ({ page }) => {
  await preparePage(page);
  await mockLandingPreviewApis(page);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  await expect(page.locator(".care-hero").getByRole("link", {
    name: "Phân tích triệu chứng",
    exact: true,
  })).toBeVisible();
  await expect(page.locator(".care-dossier")).toBeVisible();
  await expect(page.locator(".care-trust-strip")).toBeVisible();
});

test("landing navigation exposes the active in-page destination", async ({ page }) => {
  await preparePage(page);
  await mockLandingPreviewApis(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const pricingLink = page.getByRole("navigation", { name: "Điều hướng chính" })
    .getByRole("link", { name: "Bảng giá" });
  await pricingLink.click();

  await expect(page).toHaveURL(/#pricing-preview$/);
  await expect(pricingLink).toHaveAttribute("aria-current", "location");

  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  const destinations = [
    ["support", "Tính năng"],
    ["map", "Bản đồ"],
    ["pricing-preview", "Bảng giá"],
  ];

  for (const [sectionId, linkName] of destinations) {
    await page.locator(`#${sectionId}`).evaluate((section) => {
      section.scrollIntoView({ block: "center" });
    });
    await expect(navigation.getByRole("link", { name: linkName })).toHaveAttribute(
      "aria-current",
      "location",
    );
  }

  await page.locator("#safety").evaluate((section) => {
    section.scrollIntoView({ block: "center" });
  });
  await expect(navigation.locator('[aria-current="location"]')).toHaveCount(0);
});
