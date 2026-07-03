import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const MAP_STYLE = {
  version: 8,
  name: "E2E map style",
  sources: {},
  layers: [],
};

function facility(overrides = {}) {
  return {
    id: FACILITY_ID,
    facilityName: "Bệnh viện kiểm thử",
    address: "123 Nguyễn Trãi, TP.HCM",
    latitude: 10.77,
    longitude: 106.69,
    phone: "0123456789",
    facilityType: "Hospital",
    openingHours: "24/7",
    departments: [{ departmentName: "Tim mạch" }],
    ...overrides,
  };
}

async function mockMapApis(page, facilities, options = {}) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/medical-facilities/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: facilities }),
      });
    }

    if (url.pathname === "/api/medical-departments") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: options.departments ?? [] }),
      });
    }

    if (url.pathname === "/api/facility-departments/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: options.facilityDepartments ?? [] }),
      });
    }

    if (url.pathname.startsWith("/api/feedback-reviews/facility/")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

async function mockSuccessfulMapStyle(page) {
  await page.route("https://basemaps.cartocdn.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(MAP_STYLE),
  }));
}

test("map renders and facility selection works with keyboard", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toBeVisible();
  await expect(page.getByText("Đang tải bản đồ…", { exact: true })).toBeHidden();

  const viewDetails = page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử" });
  await viewDetails.focus();
  await viewDetails.press("Enter");
  await expect(viewDetails).toHaveAttribute("aria-pressed", "true");
  await expect(viewDetails).toHaveText("Đang xem chi tiết");

  const skipMap = page.getByRole("link", { name: "Bỏ qua bản đồ, đến danh sách cơ sở" });
  await expect(skipMap).toHaveAttribute("href", "#facility-list");
});

test("map controls meet mobile touch target size", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await preparePage(page);
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const controlSizes = await page.locator(".maplibregl-ctrl-group button").evaluateAll((buttons) => (
    buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    })
  ));

  expect(controlSizes.length).toBeGreaterThanOrEqual(3);
  expect(controlSizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true);
});

test("facility without coordinates stays in the list without a false marker", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [facility({ latitude: null, longitude: null })]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử" }).click();
  await expect(page.getByText("Chưa có vị trí chính xác trên bản đồ.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toHaveCount(0);

  const directionsButton = page.getByRole("button", { name: "Chỉ đường đến Bệnh viện kiểm thử" });
  await expect(directionsButton).toBeDisabled();
  await expect(directionsButton).toHaveAttribute("title", "Cơ sở chưa có tọa độ chính xác");
});

test("map search matches facility departments from active backend data", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [
    facility({
      id: FACILITY_ID,
      facilityName: "Bệnh viện Tim",
      departments: [{ departmentName: "Tim mạch" }],
    }),
    facility({
      id: "22222222-2222-4222-8222-222222222222",
      facilityName: "Phòng khám Da liễu",
      phone: null,
      facilityType: "Phòng khám",
      departments: [],
    }),
  ], {
    departments: [{ id: "33333333-3333-4333-8333-333333333333", departmentName: "Da liễu" }],
    facilityDepartments: [{
      facilityId: "22222222-2222-4222-8222-222222222222",
      departmentId: "33333333-3333-4333-8333-333333333333",
    }],
  });
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await page.getByLabel("Tìm cơ sở y tế").fill("da lieu");
  await expect(page.getByText("Phòng khám Da liễu", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện Tim", { exact: true })).toHaveCount(0);
  const dermatologyCard = page.locator(".facility-result-card").filter({ hasText: "Phòng khám Da liễu" });
  await expect(dermatologyCard.getByText("Phòng khám", { exact: true })).toBeVisible();

  await dermatologyCard.getByRole("button", { name: "Xem chi tiết Phòng khám Da liễu" }).click();
  const callButton = page.getByRole("button", { name: "Gọi Phòng khám Da liễu" });
  await expect(callButton).toBeDisabled();
  await expect(callButton).toHaveAttribute("title", "Cơ sở chưa có số điện thoại");
});

test("map supplements each department with three complete mock hospitals", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [
    facility({
      id: "11111111-1111-4111-8111-111111111111",
      facilityName: "Bệnh viện Chợ Rẫy",
      address: "201B Nguyễn Chí Thanh, Quận 5",
      phone: null,
      website: null,
      openingHours: null,
      departments: [{
        departmentId: "department-musculoskeletal",
        departmentName: "Khoa cơ - xương - khớp",
      }],
    }),
  ], {
    departments: [
      { id: "department-musculoskeletal", departmentName: "Khoa cơ - xương - khớp", chapterCode: "M" },
      { id: "department-respiratory", departmentName: "Khoa Hô Hấp", chapterCode: "J" },
    ],
  });
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("6 kết quả phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Backend chưa đủ 3 bệnh viện cho mỗi khoa.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Bệnh viện Chấn thương Chỉnh hình TP.HCM", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện Phạm Ngọc Thạch", { exact: true })).toBeVisible();

  const respiratoryCard = page.locator(".facility-result-card").filter({ hasText: "Bệnh viện Phạm Ngọc Thạch" });
  await respiratoryCard.getByRole("button", { name: "Xem chi tiết" }).click();

  const detail = page.locator(".facility-detail-view");
  await expect(detail).toBeVisible();
  await expect(detail.locator("img")).toHaveAttribute("src", "https://cdn.youmed.vn/tin-tuc/wp-content/uploads/2019/05/benh-vien-pham-ngoc-thach-1024x634.png");
  await expect(detail).toContainText("028 3855 0207");
  await expect(detail).toContainText("https://bvphamngocthach.vn");
});

test("map style failure shows a usable fallback and supports retry", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [facility()]);
  let allowStyle = false;

  await page.route("https://basemaps.cartocdn.com/**", (route) => (
    allowStyle
      ? route.fulfill({ contentType: "application/json", body: JSON.stringify(MAP_STYLE) })
      : route.abort("failed")
  ));

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Không thể hiển thị bản đồ lúc này", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện kiểm thử", { exact: true }).first()).toBeVisible();

  allowStyle = true;
  await page.getByRole("button", { name: "Thử tải lại bản đồ" }).click();

  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("Không thể hiển thị bản đồ lúc này", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toBeVisible();
});

test("geolocation denial does not remove the rendered map", async ({ page, context }) => {
  await preparePage(page);
  await context.clearPermissions();
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const locateButton = page.locator(".map-page-actions").getByRole("button", { name: "Định vị tôi" });
  await locateButton.click();

  await expect(page.getByText("Không thể lấy vị trí của bạn.", { exact: true })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});
