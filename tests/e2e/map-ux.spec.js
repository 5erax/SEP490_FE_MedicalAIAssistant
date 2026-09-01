import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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

    if (url.pathname.startsWith("/api/symptom-analysis/")) {
      if (options.analysisError) return route.abort("failed");
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: options.analysis ?? null }) });
    }

    if (url.pathname === "/api/medical-departments") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.departments ?? [{ id: FACILITY_DEPARTMENT_ID, departmentName: options.analysis?.recommendedDepartment?.departmentName || "Tim mạch" }],
        }),
      });
    }

    if (url.pathname === "/api/medical-facilities/nearby" && options.nearby) {
      return options.nearby(route, url);
    }

    if (url.pathname === "/api/medical-facilities/active" || url.pathname === "/api/medical-facilities/nearby") {
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

async function selectDepartment(page, name) {
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("combobox", { name: "Chuyên khoa", exact: true }).selectOption({ label: name });
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
}

test("map renders and facility selection works with keyboard", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await selectDepartment(page, "Tim mạch");

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
  await expect(page.getByRole("tab", { name: "Đánh giá" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Đánh giá" }).press("Home");
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");

  const skipMap = page.getByRole("link", { name: "Bỏ qua bản đồ, đến danh sách cơ sở" });
  await expect(skipMap).toHaveAttribute("href", "#facility-list");
});

test("map omits the consultation assistant while preserving facility department data", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
  }, TOKEN);

  const requestedApiPaths = [];
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
  });
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await selectDepartment(page, "Tim mạch");

  const marker = page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" });
  await expect(marker).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "AI hỗ trợ trước khám" })).toHaveCount(0);

  await marker.click();
  await expect(page.getByRole("region", { name: "Bệnh viện kiểm thử" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "AI hỗ trợ trước khám" })).toHaveCount(0);
  expect(requestedApiPaths).toContain("/api/medical-departments");
  expect(requestedApiPaths).toContain("/api/facility-departments/active");
});

test("facility without coordinates does not render a false marker", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [facility({ latitude: null, longitude: null })]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await selectDepartment(page, "Tim mạch");

  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toHaveCount(0);
});

test("map shows every facility by default, a department narrows them, then search narrows further", async ({ page }) => {
  await preparePage(page);
  await mockMapApis(page, [
    facility({
      id: FACILITY_ID,
      facilityName: "Bệnh viện Tim",
      departments: [{ departmentId: FACILITY_DEPARTMENT_ID, departmentName: "Tim mạch" }],
    }),
    facility({
      id: "22222222-2222-4222-8222-222222222222",
      facilityName: "Phòng khám Da liễu",
      latitude: 10.81,
      longitude: 106.72,
      phone: null,
      facilityType: "Phòng khám",
      departments: [{
        departmentId: SECOND_FACILITY_DEPARTMENT_ID,
        departmentName: "Da liễu",
      }],
    }),
  ], {
    departments: [
      { id: FACILITY_DEPARTMENT_ID, departmentName: "Tim mạch" },
      { id: SECOND_FACILITY_DEPARTMENT_ID, departmentName: "Da liễu" },
    ],
  });
  await mockSuccessfulMapStyle(page);

  const heartMarker = page.getByRole("button", { name: "Chọn Bệnh viện Tim trên bản đồ" });
  const skinMarker = page.getByRole("button", { name: "Chọn Phòng khám Da liễu trên bản đồ" });

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  // By default ("Tất cả các khoa") every facility shows without picking anything.
  await expect(heartMarker).toBeVisible();
  await expect(skinMarker).toBeVisible();

  await selectDepartment(page, "Da liễu");
  await expect(skinMarker).toBeVisible();
  await expect(heartMarker).toHaveCount(0);

  await page.getByLabel("Tìm tên bệnh viện, phòng khám").fill("phong kham");
  await expect(skinMarker).toBeVisible();
  await expect(heartMarker).toHaveCount(0);

  await skinMarker.click();
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
  ], {
    departments: [{ id: "department-musculoskeletal", departmentName: "Khoa cơ - xương - khớp" }],
  });
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await selectDepartment(page, "Khoa cơ - xương - khớp");

  await expect(page.getByRole("button", { name: "Chọn Bệnh viện Chợ Rẫy trên bản đồ" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Chấn thương Chỉnh hình/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Phạm Ngọc Thạch/ })).toHaveCount(0);
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

  // With no map, there is no pin to click, so the list falls back to
  // showing every facility regardless of the department filter.
  await expect(page.getByText("Không thể hiển thị bản đồ lúc này", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện kiểm thử", { exact: true }).first()).toBeVisible();

  allowStyle = true;
  await page.getByRole("button", { name: "Thử tải lại bản đồ" }).click();

  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("Không thể hiển thị bản đồ lúc này", { exact: true })).toBeHidden();
  await selectDepartment(page, "Tim mạch");
  await expect(page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" })).toBeVisible();
});

test("geolocation denial does not remove the rendered map", async ({ page, context }) => {
  await preparePage(page);
  await context.clearPermissions();
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();

  const locateButton = page.getByRole("button", { name: "Vị trí của tôi", exact: true });
  await locateButton.click();

  await expect(page.locator(".explorer-location").getByRole("alert")).toHaveText("Chưa được phép dùng vị trí của bạn. Bạn có thể cho phép truy cập vị trí trong cài đặt trình duyệt rồi thử lại.");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
});

test("map stays light and usable on mobile with a dark system preference and forced colors", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: "dark" });
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await selectDepartment(page, "Tim mạch");

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.getByRole("button", { name: "Bản đồ", exact: true }).click();
  const marker = page.getByRole("button", { name: "Chọn Bệnh viện kiểm thử trên bản đồ" });
  await expect(marker).toBeVisible();
  const locateButtonBox = await page.getByRole("button", { name: "Vị trí của tôi", exact: true }).boundingBox();
  expect(locateButtonBox?.height).toBeGreaterThanOrEqual(44);

  await page.emulateMedia({ forcedColors: "active" });
  await expect(marker).toBeVisible();
  await marker.click();
  await expect(page.getByRole("button", { name: "Xem chi tiết", exact: true })).toBeVisible();
});

test("facility API failure uses safe Vietnamese recovery copy", async ({ page }) => {
  await preparePage(page);
  await page.route("**/api/**", (route) => route.abort("failed"));
  await mockSuccessfulMapStyle(page);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  await expect(page.getByText(
    "Chưa thể tải danh sách cơ sở y tế. Vui lòng kiểm tra kết nối và thử lại.",
    { exact: false },
  )).toBeVisible();
  await expect(page.getByText("Failed to fetch", { exact: true })).toHaveCount(0);
});

const SESSION_ID = "55555555-5555-4555-8555-555555555555";
const clinicalAnalysis = {
  sessionId: SESSION_ID,
  recommendedDepartment: {
    departmentId: FACILITY_DEPARTMENT_ID,
    departmentName: "Khoa Hô hấp",
    reason: "Chuyên khoa được gợi ý dựa trên nội dung bạn đã cung cấp.",
    description: "Mô tả chuyên khoa dùng để kiểm tra khả năng đọc và cuộn nội dung dài. ".repeat(35),
  },
  diagnoses: Array.from({ length: 5 }, (_, index) => ({
    diseaseName: `Kết quả tham khảo ${index + 1}`,
    rank: index + 1,
    confidenceScore: 0.47 - index * 0.08,
    clinicalReasoning: "Nội dung giải thích được giữ đầy đủ và chỉ mở khi người dùng muốn xem. ".repeat(15),
  })),
  recommendedFacilities: [facility()],
};

for (const screen of [
  { name: "desktop", width: 1440, height: 900, systemDark: false, scale: 100 },
  { name: "mobile", width: 390, height: 844, systemDark: false, scale: 100 },
  { name: "mobile-large-text-system-dark", width: 320, height: 740, systemDark: true, scale: 125 },
]) {
  test(`clinical next step stays visible with long results: ${screen.name}`, async ({ page }, testInfo) => {
    await preparePage(page);
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.emulateMedia({ colorScheme: screen.systemDark ? "dark" : "light" });
    await page.addInitScript(({ accessToken, snapshot, scale }) => {
      localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
      sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = `${scale}%`;
      }, { once: true });
    }, { accessToken: TOKEN, snapshot: clinicalAnalysis, scale: screen.scale });
    await mockMapApis(page, [facility()], { analysis: clinicalAnalysis });
    await mockSuccessfulMapStyle(page);
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`, { waitUntil: "domcontentloaded" });

    const nextStep = page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" });
    await expect(nextStep).toBeInViewport({ ratio: 1 });
    await expect(page.locator(".clinic-sidebar")).toHaveCSS("background-color", "rgb(241, 245, 247)");
    await expect(page.locator("html")).toHaveCSS("font-size", `${16 * screen.scale / 100}px`);
    await expect(nextStep).toHaveAttribute("href", `/pre-consultation?sessionId=${SESSION_ID}`);
    expect((await nextStep.boundingBox()).height).toBeGreaterThanOrEqual(52);
    await expect(page.locator(".explorer-description")).not.toHaveAttribute("open");
    await page.screenshot({ path: testInfo.outputPath(`${screen.name}-results.png`) });
    await page.getByText("Vì sao gợi ý chuyên khoa này?", { exact: true }).click();
    await expect(nextStep).toBeInViewport({ ratio: 1 });
    await page.locator(".explorer-reference-results > summary").click();
    await page.locator(".explorer-diagnosis summary").last().click();
    await expect(nextStep).toBeInViewport({ ratio: 1 });
    await page.locator(".explorer-clinical-disclaimer").scrollIntoViewIfNeeded();
    await expect(nextStep).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(await page.locator(".explorer-scroll").evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);

    const accessibility = await new AxeBuilder({ page }).include(".clinic-sidebar").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.getByRole("button", { name: "Xem cơ sở mà không dùng vị trí", exact: true }).click();
    await expect(nextStep).toHaveCount(0);
    await page.getByRole("button", { name: "Kết quả gợi ý", exact: true }).click();
    await expect(nextStep).toBeInViewport({ ratio: 1 });
  });
}

test("clinical facility detail carries the selected facility into pre-consultation", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(({ accessToken, snapshot }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
    sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
  }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
  await mockMapApis(page, [facility()], { analysis: clinicalAnalysis });
  await mockSuccessfulMapStyle(page);
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);

  await page.getByRole("button", { name: "Xem cơ sở mà không dùng vị trí", exact: true }).click();
  await page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử", exact: true }).click();
  const nextStep = page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" });
  await expect(nextStep).toBeVisible();
  const href = await nextStep.getAttribute("href");
  const target = new URL(href, "http://localhost");
  expect(target.pathname).toBe("/pre-consultation");
  expect(target.searchParams.get("sessionId")).toBe(SESSION_ID);
  expect(target.searchParams.get("facilityId")).toBe(FACILITY_ID);
  expect(target.searchParams.get("facilityName")).toBe("Bệnh viện kiểm thử");
});

for (const width of [1440, 390]) {
  test(`clinical specialty nearby choice searches progressively: ${width}`, async ({ page }, testInfo) => {
    await preparePage(page);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(({ accessToken, snapshot }) => {
      localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
      sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
      navigator.geolocation.getCurrentPosition = (success) => success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
    }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
    await mockMapApis(page, [facility()], { analysis: clinicalAnalysis });
    await mockSuccessfulMapStyle(page);
    const radii = [];
    await page.route("**/api/medical-facilities/nearby?**", (route) => {
      const query = new URL(route.request().url()).searchParams;
      const radius = Number(query.get("radiusKm"));
      radii.push(radius);
      expect(query.get("departmentId")).toBe(FACILITY_DEPARTMENT_ID);
      expect(query.get("limit")).toBe("20");
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: radius === 1 ? [] : [facility({ distanceKm: 2.4, isActive: true })] }) });
    });
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    const choice = page.getByRole("button", { name: "Tìm nơi khám gần tôi" });
    await expect(choice).toBeVisible();
    await expect(page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath(`nearby-choice-${width}.png`) });
    await choice.click();
    await expect(page.locator(".result-summary")).toContainText("3 km");
    await expect(page.locator(".facility-result-card")).toHaveCount(1);
    expect(radii).toEqual([1, 3]);
    await expect(page.getByRole("button", { name: "Kết quả gợi ý", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`nearby-results-${width}.png`) });
  });
}

for (const scenario of ["empty", "error"]) {
  test(`specialty nearby handles ${scenario} without silently expanding beyond scope`, async ({ page }) => {
    await preparePage(page);
    await page.addInitScript(({ accessToken, snapshot }) => {
      localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
      sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
      navigator.geolocation.getCurrentPosition = (success) => success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
    }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
    await mockMapApis(page, [facility()], { analysis: clinicalAnalysis });
    await mockSuccessfulMapStyle(page);
    const radii = [];
    await page.route("**/api/medical-facilities/nearby?**", (route) => {
      const query = new URL(route.request().url()).searchParams;
      radii.push(Number(query.get("radiusKm")));
      expect(query.get("departmentId")).toBe(FACILITY_DEPARTMENT_ID);
      return route.fulfill({ status: scenario === "error" ? 503 : 200, contentType: "application/json", body: JSON.stringify({ success: scenario !== "error", data: [] }) });
    });
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    await page.getByRole("button", { name: "Tìm nơi khám gần tôi" }).click();
    if (scenario === "empty") {
      await expect(page.locator(".result-summary")).toContainText("trong 50 km");
      expect(radii).toEqual([1, 3, 5, 7, 10, 15, 20, 30, 50]);
      await expect(page.locator(".clinic-marker")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /Tìm xa hơn/ })).toHaveCount(0);
    } else {
      await expect(page.locator(".explorer-list [role=alert]")).toContainText("Không thể tải cơ sở gần bạn");
      expect(radii).toEqual([1]);
      await expect(page.getByRole("button", { name: "Tìm xa hơn · trong 10 km" })).toHaveCount(0);
    }
  });
}

test("changing specialty during a nearby search discards the previous response", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(({ accessToken, snapshot }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
    sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
    navigator.geolocation.getCurrentPosition = (success) => success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
  }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
  await mockMapApis(page, [facility()], { analysis: clinicalAnalysis, departments: [
    { id: FACILITY_DEPARTMENT_ID, departmentName: "Khoa Hô hấp" },
    { id: SECOND_FACILITY_DEPARTMENT_ID, departmentName: "Khoa khác" },
  ] });
  await mockSuccessfulMapStyle(page);
  let releaseOld;
  let oldFinished = false;
  const requests = [];
  await page.route("**/api/medical-facilities/nearby?**", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const departmentId = query.get("departmentId");
    requests.push([departmentId, Number(query.get("radiusKm"))]);
    if (departmentId === FACILITY_DEPARTMENT_ID) {
      await new Promise((resolve) => { releaseOld = resolve; });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: [] }) }).catch(() => {});
      oldFinished = true;
      return;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: [facility({
      facilityName: "Cơ sở khoa mới", distanceKm: 0.4,
      departments: [{ departmentId: SECOND_FACILITY_DEPARTMENT_ID, departmentName: "Khoa khác" }],
    })] }) });
  });
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await page.getByRole("button", { name: "Tìm nơi khám gần tôi" }).click();
  await expect.poll(() => typeof releaseOld).toBe("function");
  await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
  await page.getByRole("combobox", { name: "Chuyên khoa", exact: true }).selectOption(SECOND_FACILITY_DEPARTMENT_ID);
  await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(page.locator(".facility-result-card")).toContainText("Cơ sở khoa mới");
  releaseOld();
  await expect.poll(() => oldFinished).toBe(true);
  await expect(page.locator(".facility-result-card")).toContainText("Cơ sở khoa mới");
  expect(requests).toEqual([[FACILITY_DEPARTMENT_ID, 1], [SECOND_FACILITY_DEPARTMENT_ID, 1]]);
});

test("specialty nearby permission denial stays on results with a recovery message", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(({ accessToken, snapshot }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
    sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
    let calls = 0;
    navigator.geolocation.getCurrentPosition = (success, failure) => {
      if (calls++ === 0) failure({ code: 1 });
      else success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
    };
  }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
  await mockMapApis(page, [facility({ distanceKm: 0.8 })], { analysis: clinicalAnalysis });
  await mockSuccessfulMapStyle(page);
  const nearbyRequests = [];
  page.on("request", (request) => { if (request.url().includes("/medical-facilities/nearby")) nearbyRequests.push(request.url()); });
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await page.getByRole("button", { name: "Tìm nơi khám gần tôi" }).click();
  await expect(page.locator(".explorer-specialty-nearby [role=alert]")).toContainText("Chưa được phép dùng vị trí");
  await expect(page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" })).toBeVisible();
  expect(nearbyRequests).toEqual([]);
  await expect(page.getByRole("alert")).toHaveCount(1);
  await page.getByRole("button", { name: "Xem cơ sở mà không dùng vị trí" }).click();
  await expect(page.getByRole("heading", { name: "Nơi khám có Khoa Hô hấp" })).toBeVisible();
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await expect(page.locator(".explorer-location-compact")).toContainText("Chưa dùng vị trí");
  await expect(page.locator(".facility-result-card .explorer-distance")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(nearbyRequests).toEqual([]);
  await page.getByRole("button", { name: "Tìm và xem nơi khám gần tôi", exact: true }).click();
  await expect(page.locator(".result-summary")).toContainText("trong 1 km");
  expect(nearbyRequests).toHaveLength(1);
  expect(new URL(nearbyRequests[0]).searchParams.get("departmentId")).toBe(FACILITY_DEPARTMENT_ID);
  expect(new URL(nearbyRequests[0]).searchParams.get("limit")).toBe("20");
});

for (const screen of [{ width: 390, height: 660 }, { width: 375, height: 600 }]) {
  test(`nearby mobile prioritizes the first facility and keeps full information available: ${screen.width}`, async ({ page }, testInfo) => {
    await preparePage(page);
    await page.setViewportSize(screen);
    await page.addInitScript(({ accessToken, snapshot }) => {
      localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
      sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
      navigator.geolocation.getCurrentPosition = (success) => success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
    }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
    await mockMapApis(page, [facility({ distanceKm: 0.8 })], { analysis: clinicalAnalysis });
    await mockSuccessfulMapStyle(page);
    const nearbyRequests = [];
    page.on("request", (request) => { if (request.url().includes("/medical-facilities/nearby")) nearbyRequests.push(request.url()); });
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    await expect(page.locator(".explorer-reference-results")).not.toHaveAttribute("open");
    await expect(page.locator(".explorer-clinical-disclaimer")).toContainText("không phải chẩn đoán");
    await page.getByRole("button", { name: "Tìm nơi khám gần tôi", exact: true }).click();
    const card = page.locator(".facility-result-card").first();
    await expect(card.locator("strong")).toBeInViewport({ ratio: 1 });
    await expect(card.locator(".explorer-distance")).toBeInViewport({ ratio: 1 });
    await expect(card.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử" })).toBeInViewport({ ratio: 1 });
    expect(await page.locator(".explorer-scroll").evaluate((node) => node.scrollTop)).toBe(0);
    await expect(page.locator(".explorer-location-compact")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cập nhật vị trí" })).toBeInViewport();
    await expect(page.locator(".explorer-result-info")).not.toHaveAttribute("open");
    await expect(page.getByLabel("Tìm tên bệnh viện, phòng khám")).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath(`nearby-simple-${screen.width}.png`) });

    await page.locator(".explorer-result-info summary").click();
    await expect(page.locator(".explorer-result-info")).toContainText("Khoảng cách là ước tính theo đường thẳng");
    await expect(page.locator(".explorer-result-info")).toContainText("Ban đầu hiển thị 5 cơ sở");
    await page.screenshot({ path: testInfo.outputPath(`nearby-information-${screen.width}.png`) });
    await page.locator(".explorer-result-info summary").click();
    await page.getByRole("button", { name: "Tìm theo tên" }).click();
    await page.getByLabel("Tìm tên bệnh viện, phòng khám").fill("không tồn tại");
    await expect(page.locator(".facility-result-card")).toHaveCount(0);
    await expect(page.locator(".explorer-list")).toContainText("trong các kết quả đã tìm");
    await page.getByRole("button", { name: "Đóng tìm kiếm" }).click();
    await expect(card).toBeVisible();

    await page.getByRole("button", { name: "Bản đồ", exact: true }).click();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.getByRole("button", { name: "Về vị trí của tôi", exact: true }).click();
    await page.getByRole("button", { name: "Danh sách", exact: true }).click();
    expect(nearbyRequests).toHaveLength(1);
    await expect(page.locator(".result-summary")).toContainText("trong 1 km");
    await page.getByRole("button", { name: "Kết quả gợi ý", exact: true }).click();
    await page.getByRole("button", { name: "Trở lại các cơ sở đã tìm" }).click();
    await expect(card).toBeVisible();
    expect(nearbyRequests).toHaveLength(1);
    await card.getByRole("button").click();
    await expect(page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" })).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "Quay lại danh sách", exact: true }).click();
    await expect(card.getByRole("button")).toBeFocused();
    const accessibility = await new AxeBuilder({ page }).include(".clinic-sidebar").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.locator(".explorer-scroll").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(false);
  });
}

test("failed location refresh keeps prior results with an explicit stale-location notice", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(({ accessToken, snapshot }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
    sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
    let calls = 0;
    navigator.geolocation.getCurrentPosition = (success, failure) => {
      if (calls++ === 0) success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
      else failure({ code: 3 });
    };
  }, { accessToken: TOKEN, snapshot: clinicalAnalysis });
  await mockMapApis(page, [facility({ distanceKm: 0.8 })], { analysis: clinicalAnalysis });
  await mockSuccessfulMapStyle(page);
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await page.getByRole("button", { name: "Tìm nơi khám gần tôi", exact: true }).click();
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Cập nhật vị trí", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.locator(".explorer-location-compact")).toContainText("Đang dùng vị trí trước đó");
  await expect(page.getByRole("alert")).not.toContainText("GPS");
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
});

test("clinical next step is absent when results cannot be restored", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles: ["User"] }));
  }, TOKEN);
  await mockMapApis(page, [facility()], { analysisError: true });
  await mockSuccessfulMapStyle(page);
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await page.getByRole("button", { name: "Kết quả gợi ý", exact: true }).click();
  await expect(page.locator(".explorer-advice").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" })).toHaveCount(0);
  await page.getByRole("button", { name: "Xem danh sách cơ sở", exact: true }).click();
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Kết quả gợi ý", exact: true })).toBeVisible();
});

test("location controls share progress and mobile map shows permission errors", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) => {
      setTimeout(() => failure({ code: 1 }), 2000);
    };
  });
  await mockMapApis(page, [facility()]);
  await mockSuccessfulMapStyle(page);
  await page.goto("/map");
  await expect(page.locator(".locate-button")).toBeVisible();
  await page.getByRole("button", { name: "Tìm và xem nơi khám gần tôi", exact: true }).click();
  await expect(page.locator(".locate-button")).toBeDisabled();
  await expect(page.locator(".explorer-location-button")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".explorer-location").getByRole("alert")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Bản đồ", exact: true }).click();
  await expect(page.locator(".explorer-map-location").getByRole("alert")).toBeVisible();
  await expect(page.locator(".locate-button")).toBeEnabled();
  expect((await page.locator(".locate-button").boundingBox()).height).toBeGreaterThanOrEqual(56);
});

test("the public near-me action prioritizes five highly rated facilities and reveals more in the same radius", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => success({ coords: { latitude: 10.8, longitude: 106.65, accuracy: 20 } });
  });
  const facilities = Array.from({ length: 25 }, (_, index) => facility({
    id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
    facilityName: `Cơ sở kiểm thử ${index + 1}`,
    latitude: 10.8 + index / 1000,
    longitude: 106.65 + index / 1000,
  }));
  const nearbyFacilities = [
    { index: 0, averageRating: 4.1, reviewCount: 50, distanceKm: 12 },
    { index: 1, averageRating: 4.8, reviewCount: 120, distanceKm: 18 },
    { index: 2, averageRating: 5, reviewCount: 2, distanceKm: 19 },
    { index: 3, averageRating: 4.8, reviewCount: 120, distanceKm: 13 },
    { index: 4, averageRating: 4.6, reviewCount: 200, distanceKm: 14 },
    { index: 5, averageRating: 4.8, reviewCount: 80, distanceKm: 15 },
    { index: 6, averageRating: 3.9, reviewCount: 300, distanceKm: 16 },
    { index: 7, averageRating: null, reviewCount: 0, distanceKm: 17 },
  ].map(({ index, ...overrides }) => ({ ...facilities[index], ...overrides, isActive: true }));
  const requests = [];
  await mockMapApis(page, facilities, {
    nearby: (route, url) => {
      const radiusKm = Number(url.searchParams.get("radiusKm"));
      requests.push({ radiusKm, limit: Number(url.searchParams.get("limit")) });
      const data = radiusKm === 20 ? nearbyFacilities : [];
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    },
  });
  await mockSuccessfulMapStyle(page);
  await page.goto("/map");
  await expect(page.locator(".facility-result-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Tìm và xem nơi khám gần tôi", exact: true }).click();
  await expect(page.locator(".result-summary")).toContainText("Đang hiển thị 5 trong 8 cơ sở trong 20 km");
  await expect(page.locator(".facility-result-card")).toHaveCount(5);
  await expect(page.locator(".facility-result-card").first()).toContainText("Cơ sở kiểm thử 3");
  expect(requests).toEqual([1, 3, 5, 7, 10, 15, 20].map((radiusKm) => ({ radiusKm, limit: 20 })));
  await page.getByRole("button", { name: "Xem thêm cơ sở trong 20 km", exact: true }).click();
  await expect(page.locator(".facility-result-card")).toHaveCount(8);
  await expect(page.locator(".result-summary")).toContainText("Đang hiển thị 8 trong 8 cơ sở trong 20 km");
  await expect(page.getByRole("button", { name: "Tìm xa hơn · trong 30 km", exact: true })).toBeVisible();
});

for (const systemTheme of ["light", "dark"]) {
  test(`facility details stay light and restore the list with ${systemTheme} system preference`, async ({ page }, testInfo) => {
    await preparePage(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: systemTheme });
    await mockMapApis(page, [facility({ website: "https://example.com" })]);
    await mockSuccessfulMapStyle(page);
    await page.goto("/map");
    const listAction = page.getByRole("button", { name: "Xem chi tiết Bệnh viện kiểm thử", exact: true });
    await listAction.click();
    await expect(page.getByRole("heading", { name: "Bệnh viện kiểm thử", exact: true })).toBeVisible();
    for (const name of ["Chỉ đường", "Gọi", "Chia sẻ"]) {
      const action = page.getByRole("button", { name, exact: true });
      await expect(action).toBeInViewport({ ratio: 1 });
      expect((await action.boundingBox()).height).toBeGreaterThanOrEqual(52);
    }
    await expect(page.getByRole("link", { name: "Website", exact: true })).toHaveAttribute("href", "https://example.com");
    await expect(page.getByRole("region", { name: "Thông tin cần biết" })).toContainText("123 Nguyễn Trãi, TP.HCM");
    await expect(page.locator(".clinic-sidebar")).toHaveCSS("background-color", "rgb(241, 245, 247)");
    await page.screenshot({ path: testInfo.outputPath(`facility-detail-system-${systemTheme}.png`) });
    const accessibility = await new AxeBuilder({ page }).include(".clinic-sidebar").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(await page.locator(".explorer-scroll").evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
    await page.getByRole("button", { name: "Quay lại danh sách", exact: true }).click();
    await expect(listAction).toBeFocused();
    await expect(listAction).toBeInViewport({ ratio: 1 });
  });
}
