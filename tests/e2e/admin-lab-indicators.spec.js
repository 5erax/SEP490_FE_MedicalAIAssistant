import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const INDICATOR_ID = "indicator-hgb";

function paged(items = []) {
  return {
    items,
    pageNumber: 1,
    pageSize: 10,
    totalCount: items.length,
    totalPages: 1,
  };
}

async function mockLabIndicatorAdmin(page, initial = {}) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  const state = {
    indicators: [...(initial.indicators ?? [])],
    aliases: [...(initial.aliases ?? [])],
    ranges: [...(initial.ranges ?? [])],
    advice: [...(initial.advice ?? [])],
    requests: [],
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname;
    const body = ["POST", "PUT", "PATCH"].includes(method) ? request.postDataJSON() : null;

    state.requests.push({ method, pathname, body });

    const fulfill = (data, message) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data, ...(message ? { message } : {}) }),
    });

    if (pathname === "/api/users/me") {
      return fulfill({ name: "Quản trị MediMate", roles: ["Admin"] });
    }

    if (pathname === "/api/lab-indicators" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
      const records = search
        ? state.indicators.filter((indicator) => [indicator.symbol, indicator.fullName, indicator.category]
          .some((value) => String(value ?? "").toLowerCase().includes(search)))
        : state.indicators;
      return fulfill(paged(records));
    }

    if (pathname === "/api/lab-indicators" && method === "POST") {
      const indicator = { indicatorId: "indicator-created", ...body };
      state.indicators = [indicator, ...state.indicators];
      return fulfill(indicator, "Đã tạo chỉ số xét nghiệm.");
    }

    const indicatorPath = `/api/lab-indicators/${INDICATOR_ID}`;
    const aliasesPath = `${indicatorPath}/aliases`;
    const rangesPath = `${indicatorPath}/reference-ranges`;
    const advicePath = `${indicatorPath}/advice`;

    if (pathname === aliasesPath && method === "GET") return fulfill(state.aliases);
    if (pathname === aliasesPath && method === "POST") {
      const alias = { aliasId: "alias-created", indicatorId: INDICATOR_ID, ...body };
      state.aliases = [...state.aliases, alias];
      return fulfill(alias, "Đã tạo bí danh.");
    }
    if (pathname.startsWith(`${aliasesPath}/`) && method === "PUT") {
      const aliasId = decodeURIComponent(pathname.split("/").at(-1));
      state.aliases = state.aliases.map((alias) => alias.aliasId === aliasId ? { ...alias, ...body } : alias);
      return fulfill(state.aliases.find((alias) => alias.aliasId === aliasId), "Đã cập nhật bí danh.");
    }
    if (pathname.startsWith(`${aliasesPath}/`) && method === "DELETE") {
      const aliasId = decodeURIComponent(pathname.split("/").at(-1));
      state.aliases = state.aliases.filter((alias) => alias.aliasId !== aliasId);
      return fulfill(null, "Đã xóa bí danh.");
    }

    if (pathname === rangesPath && method === "GET") return fulfill(state.ranges);
    if (pathname === rangesPath && method === "POST") {
      const range = { referenceRangeId: "range-created", indicatorId: INDICATOR_ID, ...body };
      state.ranges = [...state.ranges, range];
      return fulfill(range, "Đã tạo khoảng tham chiếu.");
    }
    if (pathname.startsWith(`${rangesPath}/`) && method === "PUT") {
      const rangeId = decodeURIComponent(pathname.split("/").at(-1));
      state.ranges = state.ranges.map((range) => range.referenceRangeId === rangeId ? { ...range, ...body } : range);
      return fulfill(state.ranges.find((range) => range.referenceRangeId === rangeId), "Đã cập nhật khoảng tham chiếu.");
    }
    if (pathname.startsWith(`${rangesPath}/`) && method === "DELETE") {
      const rangeId = decodeURIComponent(pathname.split("/").at(-1));
      state.ranges = state.ranges.filter((range) => range.referenceRangeId !== rangeId);
      return fulfill(null, "Đã xóa khoảng tham chiếu.");
    }

    if (pathname === advicePath && method === "GET") return fulfill(state.advice);
    if (pathname === advicePath && method === "POST") {
      const advice = { cacheId: "advice-created", indicatorId: INDICATOR_ID, ...body };
      state.advice = [...state.advice, advice];
      return fulfill(advice, "Đã tạo lời khuyên.");
    }
    if (pathname.startsWith(`${advicePath}/`) && method === "PUT") {
      const cacheId = decodeURIComponent(pathname.split("/").at(-1));
      state.advice = state.advice.map((item) => item.cacheId === cacheId ? { ...item, ...body } : item);
      return fulfill(state.advice.find((item) => item.cacheId === cacheId), "Đã cập nhật lời khuyên.");
    }
    if (pathname.startsWith(`${advicePath}/`) && method === "DELETE") {
      const cacheId = decodeURIComponent(pathname.split("/").at(-1));
      state.advice = state.advice.filter((item) => item.cacheId !== cacheId);
      return fulfill(null, "Đã xóa lời khuyên.");
    }

    if (pathname === indicatorPath && method === "GET") {
      return fulfill(state.indicators.find((indicator) => indicator.indicatorId === INDICATOR_ID));
    }
    if (pathname === indicatorPath && method === "PUT") {
      state.indicators = state.indicators.map((indicator) => indicator.indicatorId === INDICATOR_ID
        ? { ...indicator, ...body }
        : indicator);
      return fulfill(state.indicators.find((indicator) => indicator.indicatorId === INDICATOR_ID), "Đã cập nhật chỉ số.");
    }
    if (pathname === indicatorPath && method === "DELETE") {
      state.indicators = state.indicators.filter((indicator) => indicator.indicatorId !== INDICATOR_ID);
      return fulfill(null, "Đã xóa chỉ số.");
    }

    if (pathname.startsWith("/api/lab-indicators/") && !pathname.includes("/aliases")
      && !pathname.includes("/reference-ranges") && !pathname.includes("/advice")) {
      const indicatorId = decodeURIComponent(pathname.split("/").at(-1));
      if (method === "GET") return fulfill(state.indicators.find((indicator) => indicator.indicatorId === indicatorId));
      if (method === "PUT") {
        state.indicators = state.indicators.map((indicator) => indicator.indicatorId === indicatorId
          ? { ...indicator, ...body }
          : indicator);
        return fulfill(state.indicators.find((indicator) => indicator.indicatorId === indicatorId), "Đã cập nhật chỉ số.");
      }
      if (method === "DELETE") {
        state.indicators = state.indicators.filter((indicator) => indicator.indicatorId !== indicatorId);
        return fulfill(null, "Đã xóa chỉ số.");
      }
    }

    const pagedPaths = [
      "/api/users",
      "/api/doctors",
      "/api/ai-configs",
      "/api/medical-facilities",
      "/api/patient-profiles",
    ];
    return fulfill(pagedPaths.includes(pathname) ? paged() : []);
  });

  return state;
}

function requestFor(state, method, pathname) {
  return state.requests.findLast((request) => request.method === method && request.pathname === pathname);
}

async function confirmDelete(page, buttonName) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: buttonName, exact: true }).click();
}

test("admin creates, opens, edits, and deletes a lab indicator", async ({ page }) => {
  await preparePage(page);
  const state = await mockLabIndicatorAdmin(page);
  await page.goto("/app/admin/lab-indicators", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Chỉ số xét nghiệm trong hệ thống" })).toBeVisible();
  await expect(page.getByText("Chưa có chỉ số phù hợp", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tạo chỉ số", exact: true }).first().click();

  let dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Tạo chỉ số", exact: true }).click();
  await expect(dialog.locator(".lab-form-error-summary")).toBeFocused();
  await expect(dialog.getByLabel(/Ký hiệu/)).toHaveAttribute("aria-invalid", "true");
  await dialog.getByLabel(/Ký hiệu/).fill("WBC");
  await dialog.getByLabel(/Tên đầy đủ/).fill("Bạch cầu");
  await dialog.getByLabel(/Nhóm chỉ số/).fill("Huyết học");
  await dialog.getByLabel(/Đơn vị mặc định/).fill("G/L");
  await dialog.getByLabel(/Tham chiếu tối thiểu/).fill("4");
  await dialog.getByLabel(/Tham chiếu tối đa/).fill("10");
  await dialog.getByRole("button", { name: "Tạo chỉ số", exact: true }).click();

  await expect(page.getByRole("link", { name: /WBC Bạch cầu/ })).toBeVisible();
  await expect(page.locator(".lab-indicator-table tbody th").first()).toHaveCSS("position", "static");
  await expect(page.locator(".lab-indicator-table tbody th").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(requestFor(state, "POST", "/api/lab-indicators")?.body).toMatchObject({
    symbol: "WBC",
    fullName: "Bạch cầu",
    unit: "G/L",
    minReference: 4,
    maxReference: 10,
    category: "Huyết học",
    isActive: true,
  });

  await page.getByRole("button", { name: "Sửa Bạch cầu" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Tên đầy đủ/).fill("Bạch cầu toàn phần");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Bạch cầu toàn phần", { exact: true })).toBeVisible();
  expect(requestFor(state, "PUT", "/api/lab-indicators/indicator-created")?.body.fullName).toBe("Bạch cầu toàn phần");

  await page.getByRole("link", { name: /WBC Bạch cầu toàn phần/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/app/admin/lab-indicators/indicator-created");

  await page.getByRole("link", { name: "Quay lại danh sách chỉ số" }).click();
  await page.getByRole("button", { name: "Xóa Bạch cầu toàn phần" }).click();
  await confirmDelete(page, "Xóa chỉ số");
  await expect(page.getByText("Chưa có chỉ số phù hợp", { exact: true })).toBeVisible();
  expect(requestFor(state, "DELETE", "/api/lab-indicators/indicator-created")).toBeTruthy();
});

test("indicator detail CRUD keeps the indicator id in every child endpoint", async ({ page }) => {
  await preparePage(page);
  const state = await mockLabIndicatorAdmin(page, {
    indicators: [{
      indicatorId: INDICATOR_ID,
      symbol: "HGB",
      fullName: "Hemoglobin",
      unit: "g/dL",
      minReference: 12,
      maxReference: 17,
      category: "Huyết học",
      description: "Nồng độ hemoglobin trong máu.",
      isActive: true,
    }],
  });

  await page.goto(`/app/admin/lab-indicators/${INDICATOR_ID}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "HGB Hemoglobin" })).toBeVisible();

  const root = `/api/lab-indicators/${INDICATOR_ID}`;
  for (const path of [root, `${root}/aliases`, `${root}/reference-ranges`, `${root}/advice`]) {
    expect(requestFor(state, "GET", path)).toBeTruthy();
  }

  await page.getByRole("button", { name: "Tạo bí danh" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Tên bí danh/).fill("Huyết sắc tố");
  await dialog.getByLabel(/Ngôn ngữ/).fill("vi");
  await dialog.getByLabel("Bí danh chính").check();
  await dialog.getByRole("button", { name: "Tạo bí danh" }).click();
  expect(requestFor(state, "POST", `${root}/aliases`)?.body).toEqual({ aliasText: "Huyết sắc tố", language: "vi", isPrimary: true });

  await page.getByRole("button", { name: "Sửa Huyết sắc tố" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Tên bí danh/).fill("Huyết sắc tố cập nhật");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  expect(requestFor(state, "PUT", `${root}/aliases/alias-created`)?.body.aliasText).toBe("Huyết sắc tố cập nhật");
  await page.getByRole("button", { name: "Xóa Huyết sắc tố cập nhật" }).click();
  await confirmDelete(page, "Xóa");
  expect(requestFor(state, "DELETE", `${root}/aliases/alias-created`)).toBeTruthy();

  await page.getByRole("button", { name: "Tạo khoảng" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Giới tính/).selectOption("female");
  await dialog.getByLabel(/Nhóm tuổi/).selectOption("adult");
  await dialog.getByLabel(/Kiểu so sánh/).selectOption("between");
  await dialog.getByLabel(/Giá trị tối thiểu/).fill("12");
  await dialog.getByLabel(/Giá trị tối đa/).fill("16");
  await dialog.getByLabel(/^Đơn vị/).fill("g/dL");
  await dialog.getByRole("button", { name: "Tạo khoảng tham chiếu" }).click();
  expect(requestFor(state, "POST", `${root}/reference-ranges`)?.body).toMatchObject({
    gender: "female",
    ageGroup: "adult",
    comparisonType: "between",
    minValue: 12,
    maxValue: 16,
    unit: "g/dL",
  });

  await page.getByRole("button", { name: "Sửa khoảng tham chiếu" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Giá trị tối đa/).fill("15.5");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  expect(requestFor(state, "PUT", `${root}/reference-ranges/range-created`)?.body.maxValue).toBe(15.5);
  await page.getByRole("button", { name: "Xóa khoảng tham chiếu" }).click();
  await confirmDelete(page, "Xóa");
  expect(requestFor(state, "DELETE", `${root}/reference-ranges/range-created`)).toBeTruthy();

  await page.getByRole("button", { name: "Tạo lời khuyên" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Trạng thái kết quả/).selectOption("low");
  await dialog.getByLabel(/^Mức độ\s*\*/).selectOption("warning");
  await dialog.getByLabel(/Tiêu đề hiển thị/).fill("Hemoglobin thấp");
  await dialog.getByLabel(/Tóm tắt/).fill("Theo dõi chỉ số và trao đổi với bác sĩ.");
  await dialog.getByRole("button", { name: "Tạo lời khuyên" }).click();
  expect(requestFor(state, "POST", `${root}/advice`)?.body).toMatchObject({
    status: "low",
    severityLevel: "warning",
    displayTitle: "Hemoglobin thấp",
  });

  await page.getByRole("button", { name: "Sửa Hemoglobin thấp" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Tiêu đề hiển thị/).fill("Hemoglobin thấp cần theo dõi");
  await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();
  expect(requestFor(state, "PUT", `${root}/advice/advice-created`)?.body.displayTitle).toBe("Hemoglobin thấp cần theo dõi");
  await page.getByRole("button", { name: "Xóa Hemoglobin thấp cần theo dõi" }).click();
  await confirmDelete(page, "Xóa");
  expect(requestFor(state, "DELETE", `${root}/advice/advice-created`)).toBeTruthy();

  const accessibility = await new AxeBuilder({ page })
    .include(".lab-indicator-detail")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    }));
  expect(seriousViolations).toEqual([]);
});

test("indicator detail remains usable by keyboard on mobile and in forced colors", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await mockLabIndicatorAdmin(page, {
    indicators: [{
      indicatorId: INDICATOR_ID,
      symbol: "HGB",
      fullName: "Hemoglobin",
      unit: "g/dL",
      category: "Huyết học",
      isActive: true,
    }],
  });

  await page.goto(`/app/admin/lab-indicators/${INDICATOR_ID}`, { waitUntil: "domcontentloaded" });
  const createAliasButton = page.getByRole("button", { name: "Tạo bí danh" });
  await createAliasButton.focus();
  await expect(createAliasButton).toBeFocused();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel(/Tên bí danh/)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel(/Ngôn ngữ/)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(createAliasButton).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await expect(page.getByRole("button", { name: "Sửa chỉ số" })).toBeVisible();
  await expect(page.locator(".lab-detail-symbol")).toHaveCSS("border-top-style", "solid");
});
