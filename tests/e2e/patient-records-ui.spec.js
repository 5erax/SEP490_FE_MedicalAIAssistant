import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");
const SESSION_ID = "77777777-7777-4777-8777-777777777777";

function detailSession(overrides = {}) {
  return {
    sessionId: SESSION_ID,
    documentUrl: "https://res.cloudinary.com/demo/image/upload/lab-tests/report.png",
    status: "completed",
    patientGenderAtTest: "male",
    patientAgeAtTest: 35,
    testDate: "2026-08-01",
    processedAt: "2026-08-01T08:30:00Z",
    results: [{
      resultDetailId: "result-hgb",
      rawExtractedName: "HGB",
      rawExtractedValue: "13.8",
      userValue: 13.8,
      status: "normal",
      isMatched: true,
      matchConfidence: 0.98,
      referenceMinUsed: 12,
      referenceMaxUsed: 17,
      referenceUnitUsed: "g/dL",
      comparisonTypeUsed: "between",
      indicator: {
        indicatorId: "indicator-hgb",
        symbol: "HGB",
        fullName: "Hemoglobin",
        category: "Huyết học",
        unit: "g/dL",
      },
      advice: {
        cacheId: "advice-hgb-normal",
        status: "normal",
        displayTitle: "Chỉ số trong ngưỡng tham chiếu",
        summary: "Tiếp tục theo dõi theo hướng dẫn của bác sĩ.",
        severityLevel: "info",
      },
    }],
    ...overrides,
  };
}

async function openPatientRecords(page, options = {}) {
  await page.emulateMedia({ forcedColors: options.forcedColors ?? "none" });
  await preparePage(page);
  await page.addInitScript(({ accessToken, isPremium }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      isPremium,
      isProfileCompleted: true,
    }));
  }, { accessToken: PATIENT_TOKEN, isPremium: options.isPremium ?? true });

  const state = { requests: [], analyzePayload: null };
  const session = detailSession(options.detailOverrides);
  const summaries = options.summaries ?? [];

  await page.route("https://api.cloudinary.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      secure_url: "https://res.cloudinary.com/demo/image/upload/lab-tests/report.png",
      public_id: "lab-tests/report",
      resource_type: "image",
    }),
  }));

  await page.route("**/api/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    state.requests.push({ method: request.method(), pathname });

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Nguyễn Minh",
            email: "patient@example.com",
            gender: "male",
            dateOfBirth: "1990-08-10",
            roles: ["Patient"],
            isProfileCompleted: true,
          },
        }),
      });
    }

    if (pathname === "/api/lab-tests/my-sessions") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: summaries,
            pageNumber: 1,
            pageSize: 8,
            totalCount: summaries.length,
            totalPages: 1,
          },
        }),
      });
    }

    if (pathname === "/api/lab-tests/analyze" && request.method() === "POST") {
      state.analyzePayload = request.postDataJSON();
      return route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: options.analyzeResponse ?? session }),
      });
    }

    if (pathname === `/api/lab-tests/${SESSION_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: session }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/records", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Đọc phiếu xét nghiệm rõ ràng hơn" })).toBeVisible();
  await expect(page.getByLabel("Thông tin từ hồ sơ").getByText("Nguyễn Minh", { exact: true })).toBeVisible();
  return state;
}

test("patient submits the backend lab analysis payload from profile data", async ({ page }) => {
  const state = await openPatientRecords(page);

  await expect(page.getByLabel(/Họ và tên/)).toHaveCount(0);
  await expect(page.getByLabel(/Giới tính/)).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles({
    name: "phieu-xet-nghiem.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock-lab-report"),
  });
  await page.getByLabel(/Ngày xét nghiệm/).fill("2026-08-01");
  await page.getByRole("button", { name: "Phân tích kết quả" }).click();

  await expect.poll(() => state.analyzePayload).toEqual({
    documentUrl: "https://res.cloudinary.com/demo/image/upload/lab-tests/report.png",
    patientGenderAtTest: "male",
    patientAgeAtTest: 35,
    testDate: "2026-08-01",
  });
  await expect(page.getByRole("heading", { name: "Kết quả ngày 1/8/2026" })).toBeVisible();
  await expect(page.getByText("Hemoglobin", { exact: true })).toBeVisible();
  await expect(page.getByText("13,8 g/dL", { exact: true })).toBeVisible();
});

test("free patient can open the temporarily unlocked lab analysis", async ({ page }) => {
  await openPatientRecords(page, { isPremium: false });

  await expect(page).toHaveURL(/\/records$/);
  await expect(page.locator('.user-shell-nav a[href="/records"]')).toBeVisible();
  await expect(page.locator('.user-shell-nav button[aria-label^="Phân tích xét nghiệm"]')).toHaveCount(0);
});

test("patient opens a session detail through the account-owned history endpoint", async ({ page }) => {
  const state = await openPatientRecords(page, {
    summaries: [{
      sessionId: SESSION_ID,
      status: "completed",
      testDate: "2026-08-01",
      patientGenderAtTest: "male",
      patientAgeAtTest: 35,
      processedAt: "2026-08-01T08:30:00Z",
      createdAt: "2026-08-01T08:00:00Z",
    }],
  });

  await page.getByRole("button", { name: /1\/8\/2026/ }).click();
  await expect(page.getByRole("heading", { name: "Kết quả ngày 1/8/2026" })).toBeFocused();
  await expect(page.getByText("Chỉ số trong ngưỡng tham chiếu", { exact: true })).toBeVisible();
  expect(state.requests.some((request) => (
    request.method === "GET" && request.pathname === `/api/lab-tests/${SESSION_ID}`
  ))).toBe(true);
});

test("patient records stays responsive and reports accessible validation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openPatientRecords(page);

  await page.getByRole("button", { name: "Phân tích kết quả" }).click();
  const errorSummary = page.locator(".records-error-summary");
  await expect(errorSummary).toBeFocused();
  await expect(errorSummary).toContainText("Hãy chọn ảnh hoặc PDF phiếu xét nghiệm.");
  await expect(errorSummary).toContainText("Hãy nhập ngày xét nghiệm.");

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

  const results = await new AxeBuilder({ page })
    .include(".lab-records-page")
    .analyze();
  expect(results.violations).toEqual([]);
});

test("patient records remains usable by keyboard in forced colors", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPatientRecords(page, { forcedColors: "active" });

  const dateInput = page.getByLabel(/Ngày xét nghiệm/);
  await dateInput.focus();
  await expect(dateInput).toBeFocused();
  await dateInput.fill("2026-08-01");
  await expect(page.getByRole("button", { name: "Phân tích kết quả" })).toBeVisible();
  await expect(page.locator(".records-upload-card")).toHaveCSS("border-top-style", "solid");
});
