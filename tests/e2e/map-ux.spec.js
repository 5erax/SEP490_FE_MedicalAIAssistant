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
  await page.getByRole("button", { name: "Điều chỉnh tìm kiếm", exact: true }).click();
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

  await page.getByRole("searchbox", { name: "Tìm cơ sở" }).fill("phong kham");
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
  await expect(page.getByText("Chưa thể hiển thị bản đồ", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện kiểm thử", { exact: true }).first()).toBeVisible();

  allowStyle = true;
  await page.getByRole("button", { name: "Thử tải lại bản đồ" }).click();

  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByText("Chưa thể hiển thị bản đồ", { exact: true })).toBeHidden();
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

  await expect(page.locator(".discovery-list-head").getByRole("alert")).toHaveText("Chưa được phép dùng vị trí của bạn. Bạn có thể cho phép truy cập vị trí trong cài đặt trình duyệt rồi thử lại.");
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
  await expect(page.getByRole("button", { name: "Xem thông tin", exact: true })).toBeVisible();
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


async function openClinical(page, facilities = [facility()], options = {}) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, roles:["User"] }));
    navigator.geolocation.getCurrentPosition = (success) => success({coords:{latitude:10.8,longitude:106.65,accuracy:20}});
  }, TOKEN);
  await mockMapApis(page, facilities, {analysis:clinicalAnalysis, ...options});
  await mockSuccessfulMapStyle(page);
}
async function browseClinical(page) {
  await page.getByRole("button", {name:"Tìm cơ sở khám phù hợp",exact:true}).click();
}
async function findNear(page) {
  await page.getByRole("button", {name:"Dùng vị trí để tìm gần tôi",exact:true}).click();
}
for (const screen of [
  {name:"desktop",width:1440,height:900,scale:100},
  {name:"mobile",width:390,height:844,scale:100},
  {name:"mobile-large-text-system-dark",width:320,height:740,scale:125},
]) {
  test(`clinical next step remains reachable with long results: ${screen.name}`, async ({page}, testInfo) => {
    await openClinical(page);
    await page.setViewportSize({width:screen.width,height:screen.height});
    await page.emulateMedia({colorScheme:screen.scale===125 ? "dark":"light"});
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    await page.evaluate((scale) => { document.documentElement.style.fontSize = scale + "%"; }, screen.scale);
    const nextStep=page.getByRole("button",{name:"Tìm cơ sở khám phù hợp",exact:true});
    await expect(nextStep).toBeInViewport();
    await expect(page.locator("html")).toHaveCSS("font-size", `${16*screen.scale/100}px`);
    await page.getByText("Vì sao gợi ý chuyên khoa này?",{exact:true}).click();
    await page.locator(".discovery-results details").last().locator("summary").click();
    await expect(page.locator(".discovery-results details").last()).toContainText(clinicalAnalysis.diagnoses[4].clinicalReasoning.trim());
    await page.locator(".discovery-results > p.discovery-note").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)).toBe(false);
    expect(await page.locator(".clinic-sidebar").evaluate((el)=>el.scrollWidth>el.clientWidth)).toBe(false);
    await page.screenshot({path:testInfo.outputPath(screen.name+"-results.png")});
    const a11y=await new AxeBuilder({page}).include(".clinic-sidebar").withTags(["wcag2a","wcag2aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    await nextStep.click();
    await expect(page.locator(".facility-result-card")).toHaveCount(1);
    await page.getByRole("button",{name:"Kết quả tư vấn",exact:true}).click();
    await expect(nextStep).toBeVisible();
  });
}
test("clinical facility detail carries the selected facility into pre-consultation", async ({page}) => {
  await openClinical(page);
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await browseClinical(page);
  await page.getByRole("button",{name:"Xem thông tin Bệnh viện kiểm thử",exact:true}).click();
  await page.getByRole("button",{name:"Tiếp tục tư vấn trước khám",exact:true}).click();
  await expect(page).toHaveURL(/\/pre-consultation\?/);
  const target=new URL(page.url());
  expect(target.searchParams.get("sessionId")).toBe(SESSION_ID);
  expect(target.searchParams.get("facilityId")).toBe(FACILITY_ID);
  expect(target.searchParams.get("departmentId")).toBe(FACILITY_DEPARTMENT_ID);
  expect(target.searchParams.get("facilityName")).toBe("Bệnh viện kiểm thử");
});
for (const width of [1440,390]) {
  test(`clinical specialty nearby choice searches progressively: ${width}`, async ({page},testInfo)=>{
    // The unpaged active catalog is authoritative; compute radius before ranking/page slicing.
    await openClinical(page,[facility({latitude:10.97,longitude:106.65})]);
    await page.setViewportSize({width,height:900});
    const requests=[];
    page.on("request",r=>{if(r.url().includes("/medical-facilities/nearby"))requests.push(r.url());});
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    await browseClinical(page);
    await findNear(page);
    await expect(page.locator(".discovery-chips")).toContainText("Trong 20 km");
    await expect(page.locator(".facility-result-card")).toHaveCount(1);
    expect(requests).toEqual([]);
    await page.screenshot({path:testInfo.outputPath("nearby-results-"+width+".png")});
  });
}
for (const scenario of ["empty","error"]) {
  test(`specialty nearby handles ${scenario} without silently expanding beyond scope`, async ({page})=>{
    await openClinical(page,[]);
    if(scenario==="error") await page.route("**/api/medical-facilities/active", r=>r.abort("failed"));
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    await browseClinical(page);
    await findNear(page);
    await expect(page.locator(".facility-result-card")).toHaveCount(0);
    await expect(page.locator(".clinic-marker")).toHaveCount(0);
    if(scenario==="error"){
      await expect(page.getByRole("alert")).toContainText("Chưa thể tải danh sách cơ sở");
      await expect(page.getByText("Chưa tìm thấy cơ sở phù hợp.",{exact:false})).toHaveCount(0);
    }else{
      await expect(page.locator(".discovery-chips")).toContainText("Trong 1000 km");
      await expect(page.getByText("Chưa tìm thấy cơ sở phù hợp.",{exact:false})).toBeVisible();
    }
  });
}
test("changing specialty during a catalog request uses the latest filter on arrival", async ({page})=>{
  await openClinical(page,[],{departments:[
    {id:FACILITY_DEPARTMENT_ID,departmentName:"Khoa Hô hấp"},
    {id:SECOND_FACILITY_DEPARTMENT_ID,departmentName:"Khoa khác"},
  ]});
  let release;
  await page.route("**/api/medical-facilities/active",async route=>{
    await new Promise(resolve=>{release=resolve;});
    await route.fulfill({json:{success:true,data:[facility(),facility({
      id:"22222222-2222-4222-8222-222222222222",facilityName:"Cơ sở khoa mới",
      departments:[{departmentId:SECOND_FACILITY_DEPARTMENT_ID,departmentName:"Khoa khác"}]
    })]}});
  });
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await browseClinical(page);
  await expect.poll(()=>typeof release).toBe("function");
  await selectDepartment(page,"Khoa khác");
  release();
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await expect(page.locator(".facility-result-card")).toContainText("Cơ sở khoa mới");
  await expect(page.locator(".facility-result-card")).not.toContainText("Bệnh viện kiểm thử");
});
test("specialty nearby permission denial keeps a usable list and permits retry",async({page})=>{
  await openClinical(page);
  await page.addInitScript(()=>{
    let calls=0;
    navigator.geolocation.getCurrentPosition=(success,failure)=>{
      if(calls++===0)failure({code:1});
      else success({coords:{latitude:10.8,longitude:106.65,accuracy:20}});
    };
  });
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await browseClinical(page);
  await findNear(page);
  await expect(page.locator(".discovery-list-head").getByRole("alert")).toContainText("Chưa được phép dùng vị trí");
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await expect(page.locator(".facility-top > span")).toHaveCount(0);
  await findNear(page);
  await expect(page.locator(".discovery-list-head").getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".facility-top > span")).toHaveCount(1);
  await expect(page.locator(".discovery-chips")).toContainText("Trong 10 km");
});
for(const screen of [{width:390,height:660},{width:375,height:600}]){
  test(`nearby mobile prioritizes the first facility and keeps full information available: ${screen.width}`,async({page})=>{
    await openClinical(page);
    await page.setViewportSize(screen);
    await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
    await browseClinical(page); await findNear(page);
    const card=page.locator(".facility-result-card").first();
    await expect(card.locator("strong")).toBeInViewport();
    await card.getByRole("button").scrollIntoViewIfNeeded();
    await expect(card.getByRole("button")).toBeInViewport({ratio:1});
    await expect(page.locator(".discovery-note").first()).toContainText("Khoảng cách đường thẳng");
    await page.getByRole("searchbox",{name:"Tìm cơ sở"}).fill("không tồn tại");
    await expect(page.locator(".facility-result-card")).toHaveCount(0);
    await page.getByRole("searchbox",{name:"Tìm cơ sở"}).fill("");
    await expect(card).toBeVisible();
    await page.getByRole("button",{name:"Bản đồ",exact:true}).click();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.getByRole("button",{name:"Vị trí của tôi",exact:true}).click();
    await page.getByRole("button",{name:"Danh sách",exact:true}).click();
    await expect(page.locator(".discovery-chips")).toContainText("Trong 10 km");
    await page.getByRole("button",{name:"Kết quả tư vấn",exact:true}).click();
    await browseClinical(page);
    await card.getByRole("button").click();
    await expect(page.getByRole("button",{name:"Tiếp tục tư vấn trước khám",exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Quay lại danh sách",exact:true}).click();
    await expect(card.getByRole("button")).toBeFocused();
    const a11y=await new AxeBuilder({page}).include(".clinic-sidebar").withTags(["wcag2a","wcag2aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    expect(await page.locator(".clinic-sidebar").evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);
  });
}
test("failed location refresh keeps prior results with an explicit stale-location notice",async({page})=>{
  await openClinical(page);
  await page.addInitScript(()=>{
    let calls=0;
    navigator.geolocation.getCurrentPosition=(success,failure)=>{
      if(calls++===0)success({coords:{latitude:10.8,longitude:106.65,accuracy:20}});
      else failure({code:3});
    };
  });
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await browseClinical(page); await findNear(page);
  await page.getByRole("button",{name:"Tìm lại gần tôi",exact:true}).click();
  await expect(page.locator(".discovery-list-head").getByRole("alert")).toHaveCount(1);
  await expect(page.locator(".discovery-list-head")).toContainText("Đang dùng vị trí trước đó");
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
});
test("clinical next step is absent when results cannot be restored",async({page})=>{
  await openClinical(page,[facility()],{analysisError:true});
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  await expect(page.locator(".discovery-results").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button",{name:"Tiếp tục tư vấn trước khám",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Xem danh sách cơ sở",exact:true}).click();
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await expect(page.getByRole("button",{name:"Kết quả tư vấn",exact:true})).toBeVisible();
});
test("location controls share progress and mobile map shows permission errors",async({page})=>{
  await preparePage(page);
  await page.addInitScript(()=>{
    navigator.geolocation.getCurrentPosition=(_success,failure)=>setTimeout(()=>failure({code:1}),2000);
  });
  await mockMapApis(page,[facility()]); await mockSuccessfulMapStyle(page);
  await page.goto("/map");
  await expect(page.locator(".locate-button")).toBeVisible();
  await findNear(page);
  await expect(page.locator(".locate-button")).toBeDisabled();
  await expect(page.locator(".discovery-locate")).toHaveAttribute("aria-busy","true");
  await expect(page.locator(".discovery-list-head").getByRole("alert")).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole("button",{name:"Bản đồ",exact:true}).click();
  await expect(page.locator(".discovery-map-location")).toBeVisible();
  await expect(page.locator(".locate-button")).toBeEnabled();
  expect((await page.locator(".locate-button").boundingBox()).height).toBeGreaterThanOrEqual(44);
});
test("the public near-me action prioritizes five highly rated facilities and reveals more in the same radius",async({page})=>{
  await preparePage(page);
  await page.addInitScript(()=>{
    navigator.geolocation.getCurrentPosition=success=>success({coords:{latitude:10.8,longitude:106.65,accuracy:20}});
  });
  const candidates=Array.from({length:8},(_,i)=>facility({
    id:"11111111-1111-4111-8111-"+String(i).padStart(12,"0"),
    facilityName:"Cơ sở kiểm thử "+(i+1),latitude:10.94+i/1000,longitude:106.65,
    averageRating:i===2?5:4.1,reviewCount:10+i
  }));
  await mockMapApis(page,candidates); await mockSuccessfulMapStyle(page);
  await page.goto("/map");
  await findNear(page);
  await expect(page.locator(".discovery-chips")).toContainText("Trong 20 km");
  await expect(page.locator(".facility-result-card")).toHaveCount(5);
  await expect(page.locator(".facility-result-card").first()).toContainText("Cơ sở kiểm thử 3");
  await page.getByRole("button",{name:"Xem thêm 3 cơ sở",exact:true}).click();
  await expect(page.locator(".facility-result-card")).toHaveCount(8);
  await expect(page.locator(".discovery-chips")).toContainText("Trong 20 km");
  await expect(page.locator(".discovery-more")).toHaveCount(0);
});
for(const systemTheme of ["light","dark"]){
  test(`facility details stay light and restore the list with ${systemTheme} system preference`,async({page},testInfo)=>{
    await preparePage(page);
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({colorScheme:systemTheme});
    await mockMapApis(page,[facility({website:"https://example.com"})]); await mockSuccessfulMapStyle(page);
    await page.goto("/map");
    const action=page.getByRole("button",{name:"Xem thông tin Bệnh viện kiểm thử",exact:true});
    await action.click();
    await expect(page.getByRole("heading",{name:"Bệnh viện kiểm thử",exact:true})).toBeVisible();
    for(const name of ["Chỉ đường","Gọi","Chia sẻ"]){
      const quick=page.getByRole("button",{name,exact:true});
      await expect(quick).toBeInViewport({ratio:1});
      expect((await quick.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole("link",{name:"Website",exact:true})).toHaveAttribute("href","https://example.com");
    await expect(page.getByRole("region",{name:"Bệnh viện kiểm thử",exact:true})).toContainText("123 Nguyễn Trãi, TP.HCM");
    await page.screenshot({path:testInfo.outputPath("detail-"+systemTheme+".png")});
    const a11y=await new AxeBuilder({page}).include(".clinic-sidebar").withTags(["wcag2a","wcag2aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    expect(await page.locator(".clinic-sidebar").evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(false);
    await page.getByRole("button",{name:"Quay lại danh sách",exact:true}).click();
    await expect(action).toBeFocused();
    await expect(action).toBeInViewport({ratio:1});
  });
}
