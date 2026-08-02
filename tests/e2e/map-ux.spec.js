import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const FACILITY_DEPARTMENT_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_FACILITY_DEPARTMENT_ID = "44444444-4444-4444-8444-444444444444";
const TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJVc2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0",
  "",
].join(".");
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
    departments: [{ departmentId: FACILITY_DEPARTMENT_ID, departmentName: "Tim mạch" }],
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

    if (url.pathname === "/api/facility-departments/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: options.facilityDepartments ?? [] }),
      });
    }

    if (url.pathname.startsWith("/api/medical-facilities/")) {
      const facilityId = url.pathname.split("/").at(-1);
      const selectedFacility = facilities.find((item) => String(item.id ?? item.facilityId) === facilityId);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: selectedFacility ?? null }),
      });
    }

    if (
      url.pathname === "/api/consultation-sessions/generate-questions-for-consultant-session"
      && route.request().method() === "POST"
    ) {
      options.onGenerateQuestions?.(route.request().postDataJSON());
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            departmentId: FACILITY_DEPARTMENT_ID,
            symptoms: "Đau ngực nhẹ",
            questions: [{ questionVi: "Cơn đau bắt đầu từ khi nào?" }],
          },
        }),
      });
    }

    if (url.pathname === "/api/web-chatbot/message" && route.request().method() === "POST") {
      options.onChat?.(route.request().postDataJSON());
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "Bạn có thể hỏi MediMate ngay mà không cần chọn cơ sở.",
            recommendedPlans: [],
            intent: "health",
            needsMoreInformation: false,
          },
        }),
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

  const mapMarker = page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" });
  await mapMarker.focus();
  await mapMarker.press("Enter");
  await expect(page.getByRole("region", { name: "Bệnh viện kiểm thử" })).toBeVisible();
  await expect(mapMarker).toHaveAttribute("aria-pressed", "true");

  const overviewTab = page.getByRole("tab", { name: "Tổng quan" });
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");
  await overviewTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Bác sĩ" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Bác sĩ" }).press("End");
  await expect(page.getByRole("tab", { name: "Đánh giá" })).toHaveAttribute("aria-selected", "true");

  const skipMap = page.getByRole("link", { name: "Bỏ qua bản đồ, đến danh sách cơ sở" });
  await expect(skipMap).toHaveAttribute("href", "#facility-list");
});

test("pre-visit AI stays present on the map and uses the selected facility department id", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
  }, TOKEN);

  const requestedApiPaths = [];
  let consultationPayload = null;
  let chatPayload = null;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) requestedApiPaths.push(url.pathname);
  });
  await mockMapApis(page, [facility()], {
    facilityDepartments: [
      {
        facilityId: FACILITY_ID,
        departmentId: FACILITY_DEPARTMENT_ID,
        departmentName: "Tim mạch",
      },
      {
        facilityId: FACILITY_ID,
        departmentId: SECOND_FACILITY_DEPARTMENT_ID,
        departmentName: "Hô hấp",
      },
    ],
    onGenerateQuestions(payload) {
      consultationPayload = payload;
    },
    onChat(payload) {
      chatPayload = payload;
    },
  });
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Bệnh viện kiểm thử", { exact: true }).first()).toBeVisible();
  const initialLauncher = page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" });
  await expect(initialLauncher).toBeVisible();
  await initialLauncher.click();
  await expect(page.getByRole("complementary", { name: "AI hỗ trợ trước khám" })).toBeVisible();
  await page.getByLabel("Câu hỏi hoặc triệu chứng của bạn").fill("Tôi nên chuẩn bị gì trước khi đi khám?");
  await page.getByRole("button", { name: "Gửi câu hỏi cho MediMate AI" }).click();
  await expect(page.getByText("Bạn có thể hỏi MediMate ngay mà không cần chọn cơ sở.", { exact: true })).toBeVisible();
  expect(chatPayload).toEqual({ message: "Tôi nên chuẩn bị gì trước khi đi khám?" });
  await page.getByRole("button", { name: "Đóng AI hỗ trợ" }).click();

  await page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử" }).click();
  await expect(page.getByRole("region", { name: "Bệnh viện kiểm thử" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "AI hỗ trợ trước khám" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thu gọn AI hỗ trợ trước khám" })).toHaveAttribute("aria-expanded", "true");

  const departmentSelect = page.getByLabel("Chọn chuyên khoa");
  await expect(departmentSelect).toHaveValue("");
  await expect(departmentSelect.locator("option")).toHaveCount(3);
  await departmentSelect.selectOption(SECOND_FACILITY_DEPARTMENT_ID);
  await page.getByLabel("Câu hỏi hoặc triệu chứng của bạn").fill("Đau ngực nhẹ");
  await page.getByRole("button", { name: "Gửi câu hỏi cho MediMate AI" }).click();

  await expect(page.getByText("Cơn đau bắt đầu từ khi nào?", { exact: true })).toBeVisible();
  expect(consultationPayload).toEqual({
    departmentId: SECOND_FACILITY_DEPARTMENT_ID,
    symptoms: "Đau ngực nhẹ",
  });
  expect(requestedApiPaths).not.toContain("/api/medical-departments");
  expect(requestedApiPaths).toContain("/api/facility-departments/active");

  const closeAssistant = page.getByRole("button", { name: "Đóng AI hỗ trợ" });
  await closeAssistant.click();
  const assistantLauncher = page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" });
  await expect(assistantLauncher).toBeFocused();
  await assistantLauncher.click();
  await expect(page.getByRole("button", { name: "Đóng AI hỗ trợ" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(assistantLauncher).toBeFocused();
});

test("facility without coordinates stays in the list without a false marker", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [facility({ latitude: null, longitude: null })]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử" }).click();
  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toHaveCount(0);

  const directionsButton = page.getByRole("button", { name: "Chỉ đường", exact: true });
  await expect(directionsButton).toBeDisabled();
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
      departments: [{
        departmentId: "44444444-4444-4444-8444-444444444444",
        departmentName: "Da liễu",
      }],
    }),
  ]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await page.getByLabel("Lọc danh sách cơ sở y tế").fill("da lieu");
  await expect(page.getByText("Phòng khám Da liễu", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện Tim", { exact: true })).toHaveCount(0);
  const dermatologyCard = page.locator(".facility-result-card").filter({ hasText: "Phòng khám Da liễu" });
  await expect(dermatologyCard.getByText("Phòng khám", { exact: true })).toBeVisible();

  await dermatologyCard.getByRole("button", { name: "Xem chi tiết Phòng khám Da liễu" }).click();
  const callButton = page.getByRole("button", { name: "Gọi", exact: true });
  await expect(callButton).toBeDisabled();
  await expect(callButton).toHaveAttribute("title", "Cơ sở chưa có số điện thoại");
});

test("map displays only facilities returned by the active API", async ({ page }) => {
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
  ]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("1 kết quả phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện Chợ Rẫy", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện Chấn thương Chỉnh hình TP.HCM", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Bệnh viện Phạm Ngọc Thạch", { exact: true })).toHaveCount(0);
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

test("map refresh remains usable on mobile, dark mode and forced colors", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: "dark" });
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await expect(page.getByRole("heading", { name: "Tìm nơi khám phù hợp" })).toBeVisible();
  await expect(page.locator(".clinic-sidebar")).not.toHaveAttribute("aria-live");
  await expect(page.getByText("1 kết quả phù hợp", { exact: true })).toHaveAttribute("role", "status");
  await expect(page.locator(".map-page-actions").getByRole("button", { name: "Định vị tôi" })).toHaveCSS("min-height", "44px");

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử" })).toBeVisible();
});

test("facility API failure uses safe Vietnamese recovery copy", async ({ page }) => {
  await preparePage(page);
  await page.route("**/api/**", (route) => route.abort("failed"));
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.getByText(
    "Chưa thể tải danh sách cơ sở y tế. Vui lòng kiểm tra kết nối và thử lại.",
    { exact: true },
  )).toBeVisible();
  await expect(page.getByText("Failed to fetch", { exact: true })).toHaveCount(0);
});
