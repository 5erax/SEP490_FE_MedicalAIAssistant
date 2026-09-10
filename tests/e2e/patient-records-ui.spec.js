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
  await page.clock.setFixedTime(new Date("2026-08-03T09:00:00+07:00"));
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

  const state = { requests: [], analyzePayload: null, usageCalls: 0 };
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
            ...options.profileOverrides,
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
            usedCount: state.analyzePayload ? 1 : 0,
            reservedCount: state.analyzePayload ? 1 : 0,
            remainingCount: state.analyzePayload ? 8 : 10,
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
      if (options.analyzeError) {
        return route.fulfill({
          status: options.analyzeError.status ?? 400,
          contentType: "application/json",
          body: JSON.stringify(options.analyzeError.payload),
        });
      }
      return route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: options.analyzeMessage ?? "Đã xếp hàng OCR xét nghiệm",
          data: options.analyzeResponse ?? {
            ...session,
            status: 0,
            processedAt: null,
            results: [],
          },
        }),
      });
    }

    if (pathname === `/api/lab-tests/${SESSION_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: options.detailMessage ?? "OK",
          data: session,
        }),
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

async function openHistory(page) {
  await page.getByRole("button", { name: "Lịch sử xét nghiệm", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Lịch sử xét nghiệm", exact: true });
  await expect(drawer).toBeVisible();
  return drawer;
}

async function openHistoryResult(page) {
  const drawer = await openHistory(page);
  await drawer.locator("article").filter({ hasText: "1/8/2026" }).getByRole("button", { name: "Chi tiết", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/records/" + SESSION_ID + "$"));
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
  await page.getByRole("button", { name: "Phân tích kết quả" }).click();

  await expect.poll(() => state.analyzePayload).toEqual({
    documentUrl: "https://res.cloudinary.com/demo/image/upload/lab-tests/report.png",
    patientGenderAtTest: "male",
    patientAgeAtTest: 35,
  });
  await expect(page).toHaveURL(new RegExp(`/records/${SESSION_ID}$`));
  await expect(page.getByRole("heading", { name: "Kết quả ngày 1/8/2026" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Chỉ số xét nghiệm", exact: true }).click();
  const hemoglobinCard = page.locator(".lab-test-result__result-card").filter({ hasText: "Hemoglobin" });
  await expect(hemoglobinCard).toBeVisible();
  await expect(hemoglobinCard).toContainText("13,8 g/dL");
  await expect(page.locator(".toast-success")).toContainText("Đã xếp hàng OCR xét nghiệm");
  await expect.poll(() => state.usageCalls).toBeGreaterThanOrEqual(2);
});

test("patient sees the standardized analyze error message in a toast", async ({ page }) => {
  await openPatientRecords(page, {
    analyzeError: {
      status: 400,
      payload: {
        success: false,
        message: "DocumentUrl không hợp lệ",
        errors: [
          "DocumentUrl không hợp lệ",
          "Yêu cầu phân tích xét nghiệm thất bại",
        ],
      },
    },
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: "phieu-xet-nghiem.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock-lab-report"),
  });
  await page.getByRole("button", { name: "Phân tích kết quả" }).click();

  const errorToast = page.locator(".toast-error");
  await expect(errorToast).toContainText("Không thể phân tích phiếu xét nghiệm");
  await expect(errorToast).toContainText("DocumentUrl không hợp lệ");
  await expect(errorToast).not.toContainText("Yêu cầu phân tích xét nghiệm thất bại");
});

test("lab analysis preserves shared credit errors and offers a purchase action", async ({ page }) => {
  await openPatientRecords(page, {
    analyzeError: {
      status: 400,
      payload: {
        success: false,
        message: "Lab test analysis failed.",
        errors: ["SERVICE_CREDIT_EXHAUSTED"],
      },
    },
  });

  await page.locator('input[type="file"]').setInputFiles({
    name: "phieu-xet-nghiem.png",
    mimeType: "image/png",
    buffer: Buffer.from("mock-lab-report"),
  });
  await page.getByRole("button", { name: "Phân tích kết quả" }).click();

  const errorToast = page.locator(".toast-error");
  await expect(errorToast).toContainText("Bạn đã dùng hết lượt");
  await expect(errorToast).toContainText("Mua thêm lượt để tiếp tục sử dụng");
  await page.locator(".records-actions").getByRole("button", { name: "Mua thêm lượt" }).click();
  await expect(page).toHaveURL(/\/pricing\?view=upgrade&returnTo=%2Frecords$/);
});

test("patient age is derived from the profile birth date and current date, including birthday boundaries", async ({ page }) => {
  await openPatientRecords(page, {
    profileOverrides: { dateOfBirth: "2003-10-17" },
  });

  await expect(page.getByText("Tuổi hiện tại", { exact: true })).toBeVisible();
  await expect(page.getByText("22 tuổi", { exact: true })).toBeVisible();

  await page.clock.setFixedTime(new Date("2025-10-16T09:00:00+07:00"));
  await page.reload();
  await expect(page.getByText("21 tuổi", { exact: true })).toBeVisible();

  await page.clock.setFixedTime(new Date("2025-10-17T09:00:00+07:00"));
  await page.reload();
  await expect(page.getByText("22 tuổi", { exact: true })).toBeVisible();
});

test("free patient can open the temporarily unlocked lab analysis", async ({ page }) => {
  await openPatientRecords(page, { isPremium: false });

  await expect(page).toHaveURL(/\/records$/);
  await expect(page.locator('.user-shell-nav a[href="/records"]')).toBeVisible();
  await expect(page.locator('.user-shell-nav button[aria-label^="Phân tích xét nghiệm"]')).toHaveCount(0);
});

test("patient-facing lab states avoid technical implementation terms", async ({ page }) => {
  await openPatientRecords(page, {
    summaries: [{
      sessionId: SESSION_ID,
      status: "processing",
      testDate: "2026-08-01",
      patientGenderAtTest: "male",
      patientAgeAtTest: 35,
      createdAt: "2026-08-01T08:00:00Z",
    }],
    detailOverrides: { status: "processing", results: [] },
  });

  const drawer = await openHistory(page);
  await expect(drawer.locator("article").filter({ hasText: "1/8/2026" })).toBeVisible();
  await expect(page.getByText(/backend|schema|API trả về/i)).toHaveCount(0);

  await drawer.locator("article").filter({ hasText: "1/8/2026" }).getByRole("button", { name: "Chi tiết", exact: true }).click();
  await expect(page.getByText("Kết quả được kiểm tra tự động mỗi giây và sẽ xuất hiện ngay khi hoàn tất.")).toBeVisible();
  await expect(page.getByText(/backend|schema|API trả về/i)).toHaveCount(0);
});

test("patient opens a session detail through the account-owned history endpoint", async ({ page }) => {
  const state = await openPatientRecords(page, {
    detailMessage: "OCR xét nghiệm hoàn tất",
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

  const historyTrigger = page.getByRole("button", { name: "Lịch sử xét nghiệm", exact: true });
  const drawer = await openHistory(page);
  await expect(drawer.getByRole("button", { name: "Đóng lịch sử xét nghiệm", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(historyTrigger).toBeFocused();
  await openHistoryResult(page);
  const dialog = page.locator(".lab-test-result-page");
  await expect(dialog.getByRole("heading", { name: "Kết quả ngày 1/8/2026" })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.locator(".lab-test-result__overview-counts")).toBeVisible();
  await dialog.getByRole("tab", { name: "Chỉ số xét nghiệm", exact: true }).click();
  await expect(dialog.locator(".lab-test-result__result-card").filter({ hasText: "Hemoglobin" })).toBeVisible();
  await dialog.locator(".lab-test-result__result-card").filter({ hasText: "Hemoglobin" }).click();
  await expect(dialog.getByText("Chỉ số trong ngưỡng tham chiếu", { exact: true })).toBeVisible();
  expect(state.requests.some((request) => (
    request.method === "GET" && request.pathname === `/api/lab-tests/${SESSION_ID}`
  ))).toBe(true);

  const accessibility = await new AxeBuilder({ page })
    .include(".lab-test-result-page")
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "Phân tích xét nghiệm", exact: true }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(historyTrigger).toBeVisible();
});

test("patient records stays responsive and reports accessible validation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openPatientRecords(page);

  await page.getByRole("button", { name: "Phân tích kết quả" }).click();
  const errorSummary = page.locator(".records-error-summary");
  await expect(errorSummary).toBeFocused();
  await expect(errorSummary).toContainText("Hãy chọn ảnh hoặc PDF phiếu xét nghiệm.");
  await expect(errorSummary.locator("li")).toHaveCount(1);

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

test("patient history keeps overview, list and detail readable on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPatientRecords(page, {
    detailOverrides: {
      aiSummary: "## Tổng hợp lần quét\nĐã đối chiếu hemoglobin với khoảng tham chiếu trên phiếu.\n\n## Trao đổi thêm\nMang phiếu gốc khi trao đổi với bác sĩ.",
    },
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
  await openHistoryResult(page);
  const dialog = page.locator(".lab-test-result-page");
  await expect(dialog.getByRole("tab", { name: "Tổng quan", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByText("Mang phiếu gốc khi trao đổi với bác sĩ.", { exact: true })).toBeVisible();
  await dialog.getByRole("tab", { name: "Chỉ số xét nghiệm", exact: true }).click();
  const row = dialog.locator(".lab-test-result__result-card").filter({ hasText: "Hemoglobin" });
  await row.click();
  await expect(dialog.locator("#lab-result-advice").getByRole("heading", { name: "Hemoglobin", exact: true })).toBeVisible();
  await expect(dialog.getByRole("searchbox", { name: "Tìm chỉ số xét nghiệm", exact: true })).not.toBeVisible();
  await dialog.getByRole("button", { name: "Quay lại các chỉ số", exact: true }).click();
  await expect(row).toHaveAttribute("aria-pressed", "true");
  await expect(row).toBeInViewport();
  const dimensions = await dialog.evaluate((element) => ({ width: element.scrollWidth, client: element.clientWidth }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.client);
  const accessibility = await new AxeBuilder({ page }).include(".lab-test-result-page").analyze();
  expect(accessibility.violations).toEqual([]);
  await row.click();
  await page.keyboard.press("Escape");
  await expect(row).toBeFocused();
  await expect(dialog.locator("#lab-result-advice")).not.toBeVisible();
});

test("patient records remains usable by keyboard in forced colors", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPatientRecords(page, { forcedColors: "active" });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.focus();
  await expect(fileInput).toBeFocused();
  await fileInput.setInputFiles({ name: "phieu.pdf", mimeType: "application/pdf", buffer: Buffer.from("mock-report") });
  await expect(page.getByRole("button", { name: "Phân tích kết quả" })).toBeVisible();
  await expect(page.locator(".records-upload-card")).toHaveCSS("border-top-style", "solid");
});
