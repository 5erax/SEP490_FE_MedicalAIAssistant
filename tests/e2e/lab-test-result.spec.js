import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");
const SESSION_ID = "53a249cf-df0a-45a0-92e6-1efa3cb15d0b";
const FULL_OVERVIEW_SUMMARY = [
  "## Đánh giá tổng quan",
  "Phần lớn chỉ số đang nằm trong khoảng tham chiếu, riêng AST cao hơn ngưỡng áp dụng.",
  "",
  "## Nội dung cần trao đổi với bác sĩ",
  "- Đối chiếu AST với tiền sử sức khỏe và các thuốc đang sử dụng.",
  "- Bác sĩ có thể cân nhắc thời điểm kiểm tra lại phù hợp.",
].join("\n");

function completedSession() {
  return {
    sessionId: SESSION_ID,
    status: 1,
    patientGenderAtTest: "male",
    patientAgeAtTest: 18,
    testDate: "2026-08-07",
    processedAt: "2026-08-07T15:26:57.485Z",
    results: [
      {
        resultDetailId: "result-ast",
        rawExtractedName: "AST (GOT)",
        rawExtractedValue: "52",
        userValue: 52,
        status: "high",
        isMatched: true,
        matchConfidence: 0.93,
        referenceMinUsed: 0,
        referenceMaxUsed: 37,
        referenceUnitUsed: "U/L",
        comparisonTypeUsed: "between",
        indicator: {
          indicatorId: "indicator-ast",
          symbol: "AST",
          fullName: "Chỉ số AST (GOT)",
          unit: "U/L",
        },
        advice: {
          displayTitle: "Tình trạng men gan",
          summary: "Men gan AST đang cao hơn khoảng tham chiếu và cần được theo dõi.",
          lifestyleAdvice: [
            "Hạn chế rượu bia và các chất kích thích.",
            "Ngủ đủ giấc và tránh thức khuya.",
          ],
          warningSigns: "Đi khám sớm nếu có vàng da, đau bụng hoặc mệt nhiều.",
          followUpSuggestion: "Trao đổi với bác sĩ về thời điểm xét nghiệm lại.",
        },
      },
      {
        resultDetailId: "result-glucose",
        rawExtractedName: "Glucose",
        rawExtractedValue: "5.8",
        userValue: 5.8,
        status: "normal",
        isMatched: true,
        matchConfidence: 0.97,
        referenceMinUsed: 3.9,
        referenceMaxUsed: 6.4,
        referenceUnitUsed: "mmol/L",
        comparisonTypeUsed: "between",
        indicator: {
          indicatorId: "indicator-glucose",
          symbol: "GLU",
          fullName: "Glucose huyết",
          unit: "mmol/L",
        },
        advice: {
          displayTitle: "Đường huyết trong ngưỡng",
          summary: "Chỉ số glucose đang nằm trong khoảng tham chiếu áp dụng.",
        },
      },
    ],
  };
}

async function prepareResultPage(page, {
  completedOnCall = 2,
  forcedColors = "none",
  responseDelay = 0,
  sessionData = completedSession(),
  sessionFailures = 0,
  summaryFailures = 0,
} = {}) {
  await page.emulateMedia({ forcedColors });
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, ACCESS_TOKEN);

  const state = { calls: 0, requestedAt: [], usageCalls: 0, summaryCalls: 0 };

  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === `/api/lab-tests/${SESSION_ID}`) {
      state.calls += 1;
      state.requestedAt.push(Date.now());
      if (responseDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, responseDelay));
      }
      if (state.calls <= sessionFailures) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Chưa thể tải kết quả xét nghiệm. Vui lòng thử lại." }),
        });
      }
      const session = structuredClone(sessionData);
      if (state.calls < completedOnCall) {
        session.status = 0;
        session.processedAt = null;
        session.results = [];
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: session }),
      });
    }

    if (pathname === `/api/lab-tests/${SESSION_ID}/summary`) {
      state.summaryCalls += 1;
      if (state.summaryCalls <= summaryFailures) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Chưa thể tải tóm tắt tự động." }),
        });
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: FULL_OVERVIEW_SUMMARY }),
      });
    }

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Nguyễn Minh",
            roles: ["Patient"],
            isProfileCompleted: true,
          },
        }),
      });
    }

    if (pathname === "/api/me/subscription-usage") {
      state.usageCalls += 1;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            quotaCode: "SERVICE_CREDIT",
            grantedCount: 10,
            usedCount: 1,
            reservedCount: state.calls > 0 && state.calls < completedOnCall ? 1 : 0,
            remainingCount: 9,
          },
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  return state;
}

async function openIndicators(page) {
  await page.getByRole("tab", { name: /Chỉ số xét nghiệm/ }).click();
  await expect(page.getByRole("tab", { name: /Chỉ số xét nghiệm/ })).toHaveAttribute("aria-selected", "true");
}

test("result page polls every second, stops when completed, and displays advice", async ({ page }) => {
  const state = await prepareResultPage(page, { responseDelay: 300 });
  await page.goto(`/records/${SESSION_ID}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Hệ thống đang đọc và đối chiếu các chỉ số" })).toBeVisible();
  await expect.poll(() => state.calls).toBe(1);

  await expect(page.getByRole("heading", { name: "Kết quả ngày 7/8/2026" })).toBeVisible();
  expect(state.calls).toBe(2);
  await expect.poll(() => state.usageCalls).toBeGreaterThanOrEqual(2);
  const pollGap = state.requestedAt[1] - state.requestedAt[0];
  expect(pollGap).toBeGreaterThanOrEqual(850);
  expect(pollGap).toBeLessThan(1200);

  await openIndicators(page);
  const astCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Chỉ số AST (GOT)" });
  const glucoseCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Glucose huyết" });
  await expect(astCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Men gan AST đang cao hơn khoảng tham chiếu và cần được theo dõi.", { exact: true })).toBeVisible();
  await page.locator("#lab-result-advice").getByText("Sinh hoạt", { exact: true }).click();
  await expect(page.getByText("Hạn chế rượu bia và các chất kích thích.", { exact: true })).toBeVisible();

  await glucoseCard.click();
  await expect(glucoseCard).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Chỉ số glucose đang nằm trong khoảng tham chiếu áp dụng.", { exact: true })).toBeVisible();
  await expect(page.locator('.lab-test-result-page [role="status"]')).toContainText("Đã chọn Glucose huyết");

  const callsAfterCompletion = state.calls;
  await page.waitForTimeout(1150);
  expect(state.calls).toBe(callsAfterCompletion);

  const accessibility = await new AxeBuilder({ page })
    .include(".lab-test-result-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test("result page shows all recognized indicators by default", async ({ page }) => {
  await prepareResultPage(page, { completedOnCall: 1 });
  await page.goto(`/records/${SESSION_ID}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("tab", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".lab-test-result__overview-attention")).toHaveAttribute("data-active", "true");
  await expect(page.locator(".lab-test-result__overview-counts > div")).toHaveCount(3);
  await openIndicators(page);
  const astCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Chỉ số AST (GOT)" });
  const glucoseCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Glucose huyết" });
  await expect(page.getByRole("button", { name: "Tất cả 2" })).toHaveAttribute("data-active", "true");
  await expect(astCard).toBeVisible();
  await expect(glucoseCard).toBeVisible();
  await expect(page.getByText("Nguy cấp", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/cần được xem trước/i)).toHaveCount(0);
});

test("result page shows the complete overview directly without duplicated priority sections", async ({ page }) => {
  await prepareResultPage(page, { completedOnCall: 1 });
  await page.goto(`/records/${SESSION_ID}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Đánh giá tổng quan" })).toBeVisible();
  await expect(page.getByText("Phần lớn chỉ số đang nằm trong khoảng tham chiếu, riêng AST cao hơn ngưỡng áp dụng.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nội dung cần trao đổi với bác sĩ" })).toBeVisible();
  await expect(page.getByText("Bác sĩ có thể cân nhắc thời điểm kiểm tra lại phù hợp.", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Điểm cần chú ý trước" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Việc nên làm tiếp theo" })).toHaveCount(0);
  await expect(page.getByText("Xem phân tích tổng quan đầy đủ", { exact: true })).toHaveCount(0);
});

test("result page remains responsive and keyboard usable at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await prepareResultPage(page, { completedOnCall: 1, forcedColors: "active" });
  await page.goto(`/records/${SESSION_ID}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Kết quả ngày 7/8/2026" })).toBeVisible();
  await openIndicators(page);
  const firstCard = page.locator(".lab-test-result__result-card").first();
  await firstCard.focus();
  await expect(firstCard).toBeFocused();
  await expect(firstCard).toHaveCSS("outline-style", "solid");

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

function largeSession() {
  const session = completedSession();
  const normalResult = session.results[1];
  for (let index = 3; index <= 37; index += 1) {
    session.results.push({
      ...normalResult,
      resultDetailId: `result-${index}`,
      rawExtractedName: `M${index}`,
      indicator: {
        indicatorId: `indicator-${index}`,
        symbol: `M${index}`,
        fullName: `Chỉ số thử nghiệm ${index} có tên dài cần đọc đầy đủ khi xem chi tiết`,
        unit: "mmol/L",
      },
      advice: null,
    });
  }
  session.results.push({
    resultDetailId: "result-unknown",
    rawExtractedName: "Chỉ số chưa đối chiếu có tên rất dài từ phiếu xét nghiệm được tải lên",
    rawExtractedValue: "Không rõ",
    status: "unknown",
    isMatched: false,
    advice: null,
  });
  return session;
}

test("overview separates a 38-indicator scan from details and keeps all summary paragraphs visible", async ({ page }, testInfo) => {
  await prepareResultPage(page, { completedOnCall: 1, sessionData: largeSession() });
  await page.goto(`/records/${SESSION_ID}`);

  await expect(page.getByRole("tab", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".lab-test-result__result-card").first()).not.toBeVisible();
  const counts = page.locator(".lab-test-result__overview-counts");
  await expect(counts).toHaveAttribute("aria-label", "Tổng cộng 38 chỉ số");
  await expect(counts.locator("strong")).toHaveText(["1", "36", "1"]);
  await expect(page.getByText("Bác sĩ có thể cân nhắc thời điểm kiểm tra lại phù hợp.", { exact: true })).toBeVisible();
  await expect(page.locator(".lab-test-result__formatted-summary details")).toHaveCount(0);
  const overviewA11y = await new AxeBuilder({ page })
    .include(".lab-test-result-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(overviewA11y.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("desktop-overview.png"), fullPage: true });

  await openIndicators(page);
  await expect(page.getByRole("button", { name: "Tất cả 38", exact: true })).toHaveAttribute("data-active", "true");
  await expect(page.locator(".lab-test-result__overview")).not.toBeVisible();
  await expect(page.locator("#lab-result-advice")).toBeVisible();
  const firstRow = page.locator(".lab-test-result__result-card").first();
  const rowBox = await firstRow.boundingBox();
  expect(rowBox.height).toBeLessThanOrEqual(132);
  await expect(page.locator(".lab-test-result__result-card").nth(2)).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath("desktop-indicators.png"), fullPage: true });
});

test("search and status filters combine without changing reported scan counts", async ({ page }) => {
  await prepareResultPage(page, { completedOnCall: 1, sessionData: largeSession() });
  await page.goto(`/records/${SESSION_ID}`);
  await openIndicators(page);
  const search = page.getByRole("searchbox", { name: "Tìm chỉ số xét nghiệm", exact: true });
  await search.fill("M20");
  await expect(page.locator(".lab-test-result__result-card")).toHaveCount(1);
  await expect(page.locator(".lab-test-result__result-card")).toContainText("Chỉ số thử nghiệm 20");
  await page.getByRole("button", { name: "Cần chú ý 1", exact: true }).click();
  await expect(page.locator(".lab-test-result__result-card")).toHaveCount(0);
  await expect(search).toHaveValue("M20");
  await expect(page.getByRole("button", { name: "Tất cả 38", exact: true })).toBeVisible();
  await expect(page.getByText(/Không tìm thấy chỉ số/).first()).toBeVisible();
  await search.fill("");
  await expect(page.locator(".lab-test-result__result-card")).toHaveCount(1);
  await expect(page.locator(".lab-test-result__result-card")).toContainText("AST");
  await page.getByRole("button", { name: "Chưa xác định 1", exact: true }).click();
  await expect(page.locator(".lab-test-result__result-card")).toHaveCount(1);
  await page.locator(".lab-test-result__result-card").click();
  const detail = page.locator("#lab-result-advice");
  await expect(detail.getByRole("heading", { name: "Chỉ số chưa đối chiếu có tên rất dài từ phiếu xét nghiệm được tải lên", exact: true })).toBeVisible();
  await expect(detail.getByText("Chưa có phân tích chi tiết cho chỉ số này", { exact: true })).toBeVisible();
  await expect(detail.getByText("Chưa có khoảng tham chiếu", { exact: true })).toBeVisible();
  await expect(detail.getByText("Chưa xác định", { exact: true })).toBeVisible();
  await expect(detail).not.toContainText("NaN");
});

for (const width of [320, 390, 768]) {
  test(`mobile ${width}px opens one detail screen and returns to the same filtered list`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await prepareResultPage(page, { completedOnCall: 1, sessionData: largeSession() });
    await page.goto(`/records/${SESSION_ID}`);
    await openIndicators(page);
    await page.getByRole("button", { name: "Bình thường 36", exact: true }).click();
    const search = page.getByRole("searchbox", { name: "Tìm chỉ số xét nghiệm", exact: true });
    await search.fill("M2");
    const rows = page.locator(".lab-test-result__result-card");
    await expect(rows.first()).toContainText("Chỉ số thử nghiệm 20");
    if (width === 390) {
      await page.screenshot({ path: testInfo.outputPath("mobile-list.png"), fullPage: true });
    }
    const selectedRow = rows.nth(4);
    await selectedRow.scrollIntoViewIfNeeded();
    await selectedRow.click();
    const detail = page.locator("#lab-result-advice");
    await expect(detail).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Chỉ số thử nghiệm 24 có tên dài cần đọc đầy đủ khi xem chi tiết", exact: true })).toBeVisible();
    await expect(search).not.toBeVisible();
    await expect(detail.getByText("Chưa có phân tích chi tiết cho chỉ số này", { exact: true })).toBeVisible();
    const detailA11y = await new AxeBuilder({ page })
      .include(".lab-test-result-page")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(detailA11y.violations).toEqual([]);
    if (width === 390) {
      await page.screenshot({ path: testInfo.outputPath("mobile-detail.png"), fullPage: true });
    }

    await page.getByRole("button", { name: "Quay lại các chỉ số", exact: true }).click();
    await expect(search).toHaveValue("M2");
    await expect(page.getByRole("button", { name: "Bình thường 36", exact: true })).toHaveAttribute("data-active", "true");
    await expect(rows.nth(4)).toHaveAttribute("aria-pressed", "true");
    await expect(rows.nth(4)).toBeInViewport();
    await expect(detail).not.toBeVisible();
    const sizes = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(sizes.width).toBeLessThanOrEqual(sizes.viewport);
  });
}

test("resizing preserves the selected result and switches between adjacent and separate detail layouts", async ({ page }) => {
  await prepareResultPage(page, { completedOnCall: 1 });
  await page.goto(`/records/${SESSION_ID}`);
  await openIndicators(page);
  const glucoseRow = page.locator(".lab-test-result__result-card").filter({ hasText: "Glucose huyết" });
  const detail = page.locator("#lab-result-advice");
  await glucoseRow.click();
  await expect(glucoseRow).toHaveAttribute("aria-pressed", "true");
  await expect(detail).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".lab-test-result-page")).toHaveAttribute("data-compact", "true");
  await expect(glucoseRow).toBeVisible();
  await expect(detail).not.toBeVisible();
  await glucoseRow.click();
  await expect(detail).toBeVisible();
  await expect(glucoseRow).not.toBeVisible();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".lab-test-result-page")).toHaveAttribute("data-compact", "false");
  await expect(glucoseRow).toBeVisible();
  await expect(glucoseRow).toHaveAttribute("aria-pressed", "true");
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Đường huyết trong ngưỡng");
  await expect(page.getByRole("button", { name: "Quay lại các chỉ số", exact: true })).toHaveCount(0);
});

test("tab navigation and indicator selection are usable without a mouse", async ({ page }) => {
  await prepareResultPage(page, { completedOnCall: 1 });
  await page.goto(`/records/${SESSION_ID}`);
  const overviewTab = page.getByRole("tab", { name: "Tổng quan", exact: true });
  const indicatorsTab = page.getByRole("tab", { name: /Chỉ số xét nghiệm/ });
  await overviewTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(indicatorsTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(indicatorsTab).toHaveAttribute("aria-selected", "true");
  const glucoseRow = page.locator(".lab-test-result__result-card").filter({ hasText: "Glucose huyết" });
  await glucoseRow.focus();
  await page.keyboard.press("Enter");
  await expect(glucoseRow).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#lab-result-advice")).toContainText("Đường huyết trong ngưỡng");
  await indicatorsTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(overviewTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(overviewTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Đánh giá tổng quan" })).toBeVisible();
});

test("a failed summary preserves results and can be retried without repeating the scan or consuming credits", async ({ page }) => {
  const state = await prepareResultPage(page, { completedOnCall: 1, summaryFailures: 1 });
  await page.goto(`/records/${SESSION_ID}`);
  await expect(page.locator(".lab-test-result__summary-state.is-error")).toBeVisible();
  expect(state.calls).toBe(1);
  const usageCallsBeforeNavigation = state.usageCalls;
  await openIndicators(page);
  await expect(page.locator(".lab-test-result__result-card")).toHaveCount(2);
  await page.getByRole("tab", { name: "Tổng quan", exact: true }).click();
  await page.locator(".lab-test-result__summary-state.is-error").getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đánh giá tổng quan" })).toBeVisible();
  expect(state.calls).toBe(1);
  expect(state.summaryCalls).toBe(2);
  expect(state.usageCalls).toBe(usageCallsBeforeNavigation);
});

test("a failed result request has an actionable retry instead of showing an empty completed scan", async ({ page }) => {
  const state = await prepareResultPage(page, { completedOnCall: 1, sessionFailures: 1 });
  await page.goto(`/records/${SESSION_ID}`);
  await expect(page.getByRole("heading", { name: "Không thể tải kết quả xét nghiệm", exact: true }).last()).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(page.getByText("Đã hoàn tất", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Đánh giá tổng quan" })).toBeVisible();
  expect(state.calls).toBe(2);
});
