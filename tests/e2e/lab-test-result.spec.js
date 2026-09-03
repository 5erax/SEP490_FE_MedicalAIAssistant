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

  const state = { calls: 0, requestedAt: [], usageCalls: 0 };

  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === `/api/lab-tests/${SESSION_ID}`) {
      state.calls += 1;
      state.requestedAt.push(Date.now());
      if (responseDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, responseDelay));
      }
      const session = completedSession();
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

  const astCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Chỉ số AST (GOT)" });
  const glucoseCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Glucose huyết" });
  await expect(page.getByRole("button", { name: "Tất cả 2" })).toHaveAttribute("data-active", "true");
  await expect(astCard).toBeVisible();
  await expect(glucoseCard).toBeVisible();
  await expect(page.locator(".lab-test-result__overview-attention")).toHaveAttribute("data-active", "true");
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
