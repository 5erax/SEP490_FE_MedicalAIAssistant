import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const PATIENT_ID = "55555555-5555-4555-8555-555555555555";
const ASSESSMENT_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";
const PAYMENT_ID = "99999999-9999-4999-8999-999999999999";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");
const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const MAP_STYLE = {
  version: 8,
  name: "Authenticated quality gate map",
  sources: {},
  layers: [],
};

const RECOMMENDED_FACILITY = {
  id: FACILITY_ID,
  facilityName: "Bệnh viện Tim kiểm thử",
  address: "123 Nguyễn Trãi, TP.HCM",
  latitude: 10.77,
  longitude: 106.69,
  phone: "0123456789",
  facilityType: "hospital",
  isActive: true,
  departments: [{
    departmentId: DEPARTMENT_ID,
    departmentName: "Khoa Tim mạch",
  }],
};

async function authenticate(page, {
  accessToken = PATIENT_TOKEN,
  roles = ["Patient"],
  isPremium = true,
} = {}) {
  await page.addInitScript(({ token, authRoles, premium, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken: token,
      userId,
      email: authRoles.includes("Admin") ? "admin@example.com" : "patient@example.com",
      roles: authRoles,
      isPremium: premium,
      isFirstLogin: false,
      isProfileCompleted: true,
    }));
  }, {
    token: accessToken,
    authRoles: roles,
    premium: isPremium,
    userId: PATIENT_ID,
  });
}

async function expectNoReleaseBlockingAxeViolations(page, selector) {
  const builder = new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
  if (selector) builder.include(selector);

  const results = await builder.analyze();
  const releaseBlockingViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));

  expect(releaseBlockingViolations).toEqual([]);
}

function patientProfileResponse() {
  return {
    id: PATIENT_ID,
    displayName: "Nguyễn Minh",
    email: "patient@example.com",
    gender: 1,
    dateOfBirth: "1990-01-01",
    phoneNumber: "0900000000",
    address: "TP.HCM",
  };
}

test("authenticated assessment question and result pass keyboard and axe gates", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await authenticate(page);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: patientProfileResponse() }),
      });
    }

    if (url.pathname === "/api/symptom-analysis/suggest-clinical-questions") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: ASSESSMENT_SESSION_ID,
            questions: [{
              questionId: QUESTION_ID,
              questionVi: "Bạn có đau ngực khi gắng sức không?",
              answers: { yes: "Có", no: "Không" },
            }],
          },
        }),
      });
    }

    if (url.pathname === "/api/symptom-analysis/submit-diagnosis") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: ASSESSMENT_SESSION_ID,
            diagnoses: [{
              rank: 1,
              diseaseName: "Đau thắt ngực",
              icd10Code: "I20",
              paGivenB: 0.86,
              clinicalReasoning: "Thông tin phù hợp để bác sĩ tim mạch đánh giá thêm.",
            }],
            recommendedDepartment: {
              departmentId: DEPARTMENT_ID,
              departmentName: "Khoa Tim mạch",
              confidenceScore: 0.86,
              isEmergencySuggested: false,
            },
          },
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.locator("#clinical-user-input").fill("Đau ngực nhẹ khi đi bộ nhanh");
  await page.getByRole("button", { name: "Tiếp tục phân tích lâm sàng" }).click();

  await expect(page).toHaveURL(new RegExp(`/assessment/${ASSESSMENT_SESSION_ID}$`));
  await expect(page.getByRole("heading", { name: "Câu hỏi lâm sàng" })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

  const yesAnswer = page.getByRole("radio", { name: "Có" });
  await yesAnswer.focus();
  await page.keyboard.press("Space");
  await expect(yesAnswer).toBeChecked();
  await expectNoReleaseBlockingAxeViolations(page, ".assessment-page");

  await page.getByRole("button", { name: "Xem gợi ý" }).click();
  await expect(page).toHaveURL(new RegExp(`/assessment/${ASSESSMENT_SESSION_ID}/result$`));
  await expect(page.getByText("Đau thắt ngực", { exact: true }).first()).toBeVisible();
  await expect(page.locator("ol.diagnosis-bar-chart li")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expectNoReleaseBlockingAxeViolations(page, ".assessment-page");

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});

test("profile transactions and security remain accessible at 200 percent zoom", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await authenticate(page);
  const devtools = await page.context().newCDPSession(page);
  await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });

  const payment = {
    id: PAYMENT_ID,
    planName: "MediMate+ Tháng",
    amount: 149000,
    currency: "VND",
    status: "Paid",
    statusName: "Paid",
    provider: "payOS",
    transactionReference: "QUALITY_GATE_PAYMENT",
    createdAt: "2026-07-28T08:00:00Z",
    paidAt: "2026-07-28T08:05:00Z",
    updatedAt: "2026-07-28T08:05:00Z",
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: patientProfileResponse() }),
      });
    }

    if (url.pathname === "/api/patient-profiles") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            pageNumber: 1,
            pageSize: 100,
            totalCount: 0,
            totalPages: 0,
          },
        }),
      });
    }

    if (url.pathname === "/api/user-subscriptions/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    if (url.pathname === "/api/payments/me") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [payment],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
          },
        }),
      });
    }

    if (url.pathname === `/api/payments/me/${PAYMENT_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: payment }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/profile?tab=transactions", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Đang tải lịch sử thanh toán", { exact: true })).toBeVisible();
  await expect(page.getByText("MediMate+ Tháng", { exact: true })).toBeVisible();
  await expectNoReleaseBlockingAxeViolations(page, "#profile-panel-transactions");

  const detailTrigger = page.getByRole("button", { name: "Xem chi tiết" });
  await detailTrigger.click();
  const paymentDialog = page.getByRole("dialog", { name: "MediMate+ Tháng" });
  await expect(paymentDialog).toBeVisible();
  await expect(paymentDialog.getByRole("button", { name: "Đóng chi tiết giao dịch" })).toBeFocused();
  await expectNoReleaseBlockingAxeViolations(page, ".payment-detail-dialog");
  await page.keyboard.press("Escape");
  await expect(paymentDialog).toHaveCount(0);
  await expect(detailTrigger).toBeFocused();

  await page.getByRole("tab", { name: "Bảo mật" }).first().click();
  const securityPanel = page.locator("#profile-panel-security");
  await expect(securityPanel).toBeVisible();
  await expectNoReleaseBlockingAxeViolations(page, "#profile-panel-security");

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  const passwordAction = securityPanel.getByRole("button", { name: "Gửi mã đổi mật khẩu" });
  await passwordAction.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(passwordAction).toBeFocused();
  const focusStyle = await passwordAction.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      outlineStyle: styles.outlineStyle,
      outlineWidth: Number.parseFloat(styles.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  await devtools.detach();
});

test("clinical map renders only cached recommendations with deterministic map data", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await authenticate(page);
  await page.addInitScript((snapshot) => {
    sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
  }, {
    sessionId: ASSESSMENT_SESSION_ID,
    recommendedDepartment: {
      departmentId: DEPARTMENT_ID,
      departmentName: "Khoa Tim mạch",
      confidenceScore: 0.86,
      isEmergencySuggested: false,
    },
    recommendedFacilities: [{
      ...RECOMMENDED_FACILITY,
      facilityId: FACILITY_ID,
    }],
  });

  await page.route("https://basemaps.cartocdn.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(MAP_STYLE),
  }));
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: patientProfileResponse() }),
      });
    }

    if (url.pathname === "/api/medical-facilities/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            RECOMMENDED_FACILITY,
            {
              ...RECOMMENDED_FACILITY,
              id: "88888888-8888-4888-8888-888888888888",
              facilityName: "Cơ sở không được gợi ý",
              longitude: 106.71,
            },
          ],
        }),
      });
    }

    if (url.pathname === "/api/facility-departments/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto(
    `/map?source=clinical&sessionId=${ASSESSMENT_SESSION_ID}&facilityId=${FACILITY_ID}&departmentId=${DEPARTMENT_ID}`,
    { waitUntil: "domcontentloaded" },
  );

  const clinicalSummary = page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" });
  await expect(clinicalSummary.getByText("Khoa Tim mạch", { exact: true })).toBeVisible();
  const facilityCards = page.locator(".facility-result-card");
  await expect(facilityCards).toHaveCount(1);
  await expect(facilityCards.first()).toContainText("Bệnh viện Tim kiểm thử");
  await expect(page.getByText("Cơ sở không được gợi ý", { exact: true })).toHaveCount(0);
  await expect(page.locator(".clinic-marker")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" })).toBeVisible();

  const marker = page.locator(".clinic-marker");
  await marker.focus();
  await marker.press("Enter");
  await expect(marker).toHaveAttribute("aria-pressed", "true");

  await expectNoReleaseBlockingAxeViolations(page, ".map-clinical-summary");
  await expectNoReleaseBlockingAxeViolations(page, ".clinic-sidebar");
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});

test("admin mobile navigation, empty state and modal pass the release gate", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await authenticate(page, { accessToken: ADMIN_TOKEN, roles: ["Admin"], isPremium: false });

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pagedPaths = new Set([
      "/api/users",
      "/api/doctors",
      "/api/ai-configs",
      "/api/medical-facilities",
      "/api/clinical-questions",
      "/api/icd-chapters",
      "/api/patient-profiles",
    ]);

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Admin Test", email: "admin@example.com", roles: ["Admin"] },
        }),
      });
    }

    if (url.pathname === "/api/subscription-plans") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    if (pagedPaths.has(url.pathname)) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 0,
            totalPages: 1,
          },
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/app/admin/subscriptions", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Đang tải danh sách gói dịch vụ...", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có gói dịch vụ", { exact: true })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expectNoReleaseBlockingAxeViolations(page, ".subscription-plan-admin-panel");

  const createTrigger = page.getByRole("button", { name: "Tạo gói dịch vụ", exact: true });
  await createTrigger.click();
  const createDialog = page.getByRole("dialog", { name: "Tạo gói dịch vụ" });
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByRole("button", { name: "Đóng form" })).toBeFocused();
  await expectNoReleaseBlockingAxeViolations(page, ".subscription-modal");
  await page.keyboard.press("Escape");
  await expect(createDialog).toHaveCount(0);
  await expect(createTrigger).toBeFocused();

  const navigationToggle = page.locator(".admin-mobile-nav-toggle");
  await navigationToggle.click();
  await expect(navigationToggle).toHaveAttribute("aria-expanded", "true");
  const adminNavigation = page.getByRole("navigation", { name: "Điều hướng admin" });
  await adminNavigation.getByRole("button", { name: "Câu hỏi lâm sàng" }).click();
  await expect(page).toHaveURL(/\/app\/admin\/clinical-questions$/);
  await expect(page.getByText("Chưa có câu hỏi lâm sàng phù hợp", { exact: true })).toBeVisible();

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await navigationToggle.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(navigationToggle).toBeFocused();
  const focusStyle = await navigationToggle.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      outlineStyle: styles.outlineStyle,
      outlineWidth: Number.parseFloat(styles.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);
  await expectNoReleaseBlockingAxeViolations(page, ".admin-panel");

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});
