import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const DEPARTMENT_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const SYMPTOM_SESSION_ID = "66666666-6666-4666-8666-666666666666";
const SUGGESTED_FACILITY_ID = "77777777-7777-4777-8777-777777777777";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function mockPreConsultation(page) {
  const calls = {
    generateBody: null,
    checklist: 0,
    detail: 0,
    detailTimes: [],
    history: 0,
    userMe: 0,
    reminderBody: null,
    summary: 0,
    complete: 0,
    usage: 0,
  };

  const questions = [
    { id: "question-1", category: "Diagnosis", questionText: "Bệnh lý của tôi là cấp tính hay mạn tính?", priority: 1 },
    { id: "question-2", category: "Tests", questionText: "Tôi có cần làm xét nghiệm máu trước buổi khám không?", priority: 2 },
    { id: "question-3", category: "TREATMENT", questionText: "Phương pháp điều trị nào phù hợp với tình trạng hiện tại?", priority: 3 },
    { id: "question-4", category: "lifestyle", questionText: "Tôi cần điều chỉnh sinh hoạt như thế nào?", priority: 4 },
    { id: "question-5", category: "additional-a", questionText: "Khi nào tôi cần tái khám?", priority: 5 },
    { id: "question-6", category: "additional-b", questionText: "Dấu hiệu nào cần được khám sớm?", priority: 6 },
  ];
  const checklist = [{
    id: "checklist-1",
    content: "Mang theo kết quả xét nghiệm gần nhất",
    departmentId: DEPARTMENT_ID,
    facilityId: null,
    isMandatory: true,
  }];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/api/users/me") {
      calls.userMe += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { id: USER_ID, displayName: "Nguyễn Minh", phoneNumber: null, roles: ["Patient"] } }) });
    }
    if (path === "/api/me/subscription-usage") {
      calls.usage += 1;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            quotaCode: "SERVICE_CREDIT",
            grantedCount: 10,
            usedCount: calls.usage > 1 ? 1 : 0,
            reservedCount: calls.usage === 2 ? 1 : 0,
            remainingCount: 9,
          },
        }),
      });
    }
    if (path === "/api/medical-departments") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [{ id: DEPARTMENT_ID, departmentName: "Tim mạch" }] }) });
    }
    if (path === "/api/consultation-sessions/generate-questions-for-consultant-session" && method === "POST") {
      calls.generateBody = route.request().postDataJSON();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, departmentId: DEPARTMENT_ID, departmentName: "Tim mạch", appointmentTime: calls.generateBody.appointmentTime, symptoms: calls.generateBody.symptoms, status: 0, questions: [{ category: "tests", question: questions[0].questionText }] } }) });
    }
    if (path === `/api/checklist-items/by-department/${DEPARTMENT_ID}`) {
      calls.checklist += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: checklist }) });
    }
    if (path === "/api/consultation-sessions/my-sessions" && method === "GET") {
      calls.history += 1;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            pageNumber: 1,
            pageSize: 6,
            totalCount: 1,
            totalPages: 1,
            items: [{
              sessionId: SESSION_ID,
              departmentId: DEPARTMENT_ID,
              departmentName: "Tim mạch",
              facilityId: null,
              facilityName: null,
              appointmentTime: "2027-01-15T02:30:00Z",
              symptoms: "Đau ngực khi vận động",
              status: "processing",
              createdAt: "2027-01-10T02:30:00Z",
            }],
          },
        }),
      });
    }
    if (path === "/api/symptom-analysis/my-sessions" && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            pageNumber: 1,
            pageSize: 50,
            totalCount: 1,
            totalPages: 1,
            items: [{
              sessionId: SYMPTOM_SESSION_ID,
              inputText: "Đau ngực khi vận động",
              status: "completed",
              createdAt: "2027-01-09T02:00:00Z",
            }],
          },
        }),
      });
    }
    if (path === `/api/symptom-analysis/${SYMPTOM_SESSION_ID}` && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: SYMPTOM_SESSION_ID,
            inputText: "Đau ngực khi vận động",
            recommendedDepartments: [{ departmentId: DEPARTMENT_ID, departmentName: "Tim mạch", priorityRank: 1 }],
            recommendedFacilities: [{ id: SUGGESTED_FACILITY_ID, facilityName: "Bệnh viện Tim Tâm Đức", address: "123 Nguyễn Trãi" }],
          },
        }),
      });
    }
    if (path === `/api/consultation-sessions/${SESSION_ID}` && method === "GET") {
      calls.detail += 1;
      calls.detailTimes.push(Date.now());
      const completed = calls.detail >= 3;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, departmentId: DEPARTMENT_ID, departmentName: "Tim mạch", appointmentTime: "2027-01-15T02:30:00Z", symptoms: "Đau ngực khi vận động", status: completed ? 1 : 0, questions: completed ? questions : [] } }) });
    }
    if (path === `/api/consultation-sessions/${SESSION_ID}/register-reminder` && method === "POST") {
      calls.reminderBody = route.request().postDataJSON();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Đăng ký nhắc lịch thành công", data: null }) });
    }
    if (path === `/api/consultation-sessions/${SESSION_ID}/summary` && method === "GET") {
      calls.summary += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, user: { displayName: "Nguyễn Minh", phoneNumber: "0901234567" }, departmentId: DEPARTMENT_ID, departmentName: "Tim mạch", appointmentTime: "2027-01-15T02:30:00Z", symptoms: "Đau ngực khi vận động", status: "processing", isReminderEnabled: true, checklistItems: checklist, questions } }) });
    }
    if (path === `/api/consultation-sessions/${SESSION_ID}/complete` && method === "POST") {
      calls.complete += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, departmentName: "Tim mạch", appointmentTime: "2027-01-15T02:30:00Z", symptoms: "Đau ngực khi vận động", status: "completed", isReminderEnabled: true, checklistItems: checklist, questions } }) });
    }

    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  return calls;
}

async function openPreConsultation(page) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });
  const calls = await mockPreConsultation(page);
  await page.goto("/pre-consultation", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Tư vấn trước khám", exact: true }).first()).toBeVisible();
  return calls;
}

async function pickSuggestedSession(page) {
  await page.getByRole("button", { name: "Danh sách phiên gợi ý chuyên khoa" }).click();
  await page.getByRole("button", { name: /Đau ngực khi vận động/ }).click();
  await page.getByRole("button", { name: /Chọn bệnh viện gợi ý/ }).click();
  await page.getByRole("button", { name: /Bệnh viện Tim Tâm Đức/ }).click();
}

test("user completes the guided pre-consultation flow", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const calls = await openPreConsultation(page);
  const screenshotDirectory = globalThis.process?.env.PRE_CONSULT_SCREENSHOT_DIR;

  if (screenshotDirectory) {
    await page.screenshot({ path: `${screenshotDirectory}/pre-consultation-desktop.png`, fullPage: true });
  }

  const sidebarLink = page.getByRole("link", { name: /Tư vấn trước khám/ }).first();
  await expect(sidebarLink).toHaveAttribute("aria-current", "page");

  await page.getByLabel("Thời gian dự kiến khám (bắt buộc)").fill("2027-01-15T09:30");
  await pickSuggestedSession(page);

  const accessibility = await new AxeBuilder({ page })
    .include(".pre-consultation-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id)).toEqual([]);

  await page.getByRole("button", { name: "Bắt đầu tư vấn" }).click();
  await expect(page.getByRole("heading", { name: "Danh sách chuẩn bị" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByText("Mang theo kết quả xét nghiệm gần nhất", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bệnh lý của tôi là cấp tính hay mạn tính?", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thiết lập nhắc lịch" }).click();
  await page.getByLabel(/Có, nhắc tôi/).check();
  await page.getByLabel("Số điện thoại nhận nhắc lịch (bắt buộc)").fill("0901234567");
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();

  await expect(page.getByRole("heading", { name: "Kiểm tra bản tổng kết" })).toBeVisible();
  await expect(page.getByText("Tim mạch", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận hoàn thành" }).click();
  await expect(page.getByRole("heading", { name: "Đã hoàn thành tư vấn trước khám" })).toBeVisible();

  if (screenshotDirectory) {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `${screenshotDirectory}/pre-consultation-mobile-summary.png`, fullPage: true });
  }

  expect(calls.generateBody).toMatchObject({ departmentId: DEPARTMENT_ID, facilityId: SUGGESTED_FACILITY_ID, symptoms: "Đau ngực khi vận động" });
  expect(calls.checklist).toBe(1);
  expect(calls.detail).toBe(3);
  expect(calls.detailTimes[1] - calls.detailTimes[0]).toBeGreaterThanOrEqual(900);
  expect(calls.detailTimes[2] - calls.detailTimes[1]).toBeGreaterThanOrEqual(900);
  expect(calls.usage).toBeGreaterThanOrEqual(2);
  expect(calls.userMe).toBeGreaterThanOrEqual(2);
  expect(calls.reminderBody).toEqual({ enableReminder: true, phoneNumber: "0901234567" });
  expect(calls.summary).toBe(1);
  expect(calls.complete).toBe(1);
  expect(pageErrors).toEqual([]);
});

test("checklist is read-only and allows the user to continue", async ({ page }) => {
  await openPreConsultation(page);
  await page.getByLabel("Thời gian dự kiến khám (bắt buộc)").fill("2027-01-15T09:30");
  await pickSuggestedSession(page);
  await page.getByRole("button", { name: "Bắt đầu tư vấn" }).click();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByText("Mang theo kết quả xét nghiệm gần nhất", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Bệnh lý của tôi là cấp tính hay mạn tính?", { exact: true })).toBeVisible();
});

test("user reviews a saved consultation in the medical record layout", async ({ page }) => {
  const calls = await openPreConsultation(page);
  const screenshotDirectory = globalThis.process?.env.PRE_CONSULT_SCREENSHOT_DIR;
  const historyTab = page.getByRole("tab", { name: "Lịch sử tư vấn" });

  await historyTab.click();
  await expect(historyTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Lịch sử tư vấn trước khám" })).toBeVisible();
  await expect(page.getByText("Đau ngực khi vận động", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /Tim mạch.*Đau ngực khi vận động/ }).click();
  await expect(page.getByRole("heading", { name: "Tim mạch", level: 3 })).toBeVisible();
  await expect(page.getByText("Bệnh lý của tôi là cấp tính hay mạn tính?", { exact: true })).toBeVisible();
  await expect(page.getByText("Mang theo kết quả xét nghiệm gần nhất", { exact: true })).toBeVisible();
  await expect(page.getByText("6 câu hỏi", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Trao đổi thêm/, level: 5 })).toHaveCount(1);

  const desktopDetailMetrics = await page.locator(".consultation-session-detail").evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  expect(desktopDetailMetrics.clientHeight).toBeLessThanOrEqual(720);
  expect(desktopDetailMetrics.scrollHeight).toBeGreaterThan(desktopDetailMetrics.clientHeight);
  expect(desktopDetailMetrics.overflowY).toBe("auto");

  const detailPanel = page.locator(".consultation-session-detail");
  await detailPanel.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await expect(page.getByText("Dấu hiệu nào cần được khám sớm?", { exact: true })).toBeVisible();
  await detailPanel.evaluate((element) => { element.scrollTop = 0; });

  if (screenshotDirectory) {
    await page.screenshot({ path: `${screenshotDirectory}/pre-consultation-history-desktop.png`, fullPage: false });
    await detailPanel.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await page.screenshot({ path: `${screenshotDirectory}/pre-consultation-history-desktop-end.png`, fullPage: false });
    await detailPanel.evaluate((element) => { element.scrollTop = 0; });
    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".consultation-session-detail")).toHaveCSS("overflow-y", "visible");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${screenshotDirectory}/pre-consultation-history-mobile.png`, fullPage: false });
  }

  const accessibility = await new AxeBuilder({ page })
    .include(".consultation-history")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id)).toEqual([]);

  expect(calls.history).toBe(1);
  expect(calls.checklist).toBe(1);
  expect(calls.detail).toBe(3);
});

test("technical AI wording is replaced with user-facing guidance", async ({ page }) => {
  await openPreConsultation(page);
  await page.route("**/api/consultation-sessions/generate-questions-for-consultant-session", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      errors: ["Không có câu hỏi tư vấn theo khoa để gửi cho AI."],
    }),
  }));

  await page.getByLabel("Thời gian dự kiến khám (bắt buộc)").fill("2027-01-15T09:30");
  await pickSuggestedSession(page);
  await page.getByRole("button", { name: "Bắt đầu tư vấn" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Chuyên khoa này chưa có bộ câu hỏi tư vấn");
  await expect(alert).not.toContainText("AI");
});

test("shared credit exhaustion keeps the stable code and offers a purchase action", async ({ page }) => {
  await openPreConsultation(page);
  await page.route("**/api/consultation-sessions/generate-questions-for-consultant-session", (route) => route.fulfill({
    status: 403,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Không thể tạo phiên tư vấn.",
      errors: ["SERVICE_CREDIT_EXHAUSTED"],
    }),
  }));

  await page.getByLabel("Thời gian dự kiến khám (bắt buộc)").fill("2027-01-15T09:30");
  await pickSuggestedSession(page);
  await page.getByRole("button", { name: "Bắt đầu tư vấn" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Mua thêm lượt để tiếp tục sử dụng");
  await page.getByRole("button", { name: "Mua thêm lượt" }).click();
  await expect(page).toHaveURL(/\/pricing\?view=upgrade&returnTo=%2Fpre-consultation$/);
});
