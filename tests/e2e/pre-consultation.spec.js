import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const DEPARTMENT_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
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
    userMe: 0,
    reminderBody: null,
    summary: 0,
    complete: 0,
  };

  const questions = [{
    id: "question-1",
    category: "tests",
    questionText: "Tôi có cần làm xét nghiệm máu trước buổi khám không?",
    priority: 1,
  }];
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
    if (path === "/api/medical-departments") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [{ id: DEPARTMENT_ID, departmentName: "Tim mạch" }] }) });
    }
    if (path === "/api/consultation-sessions/generate-questions-for-consultant-session" && method === "POST") {
      calls.generateBody = route.request().postDataJSON();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, departmentId: DEPARTMENT_ID, departmentName: "Tim mạch", appointmentTime: calls.generateBody.appointmentTime, symptoms: calls.generateBody.symptoms, status: "processing", questions: [{ category: "tests", question: questions[0].questionText }] } }) });
    }
    if (path === `/api/checklist-items/by-department/${DEPARTMENT_ID}`) {
      calls.checklist += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: checklist }) });
    }
    if (path === `/api/consultation-sessions/${SESSION_ID}` && method === "GET") {
      calls.detail += 1;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, departmentId: DEPARTMENT_ID, departmentName: "Tim mạch", appointmentTime: "2027-01-15T02:30:00Z", symptoms: "Đau ngực khi vận động", status: "completed", questions } }) });
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

  await page.getByLabel("Chuyên khoa (bắt buộc)").selectOption(DEPARTMENT_ID);
  await page.getByLabel("Thời gian dự kiến khám (bắt buộc)").fill("2027-01-15T09:30");
  await page.getByLabel("Triệu chứng hoặc điều cần tư vấn (bắt buộc)").fill("Đau ngực khi vận động");

  const accessibility = await new AxeBuilder({ page })
    .include(".pre-consultation-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id)).toEqual([]);

  await page.getByRole("button", { name: "Bắt đầu tư vấn" }).click();
  await expect(page.getByRole("heading", { name: "Checklist chuẩn bị" })).toBeVisible();
  await page.getByLabel("Mang theo kết quả xét nghiệm gần nhất").check();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Tôi có cần làm xét nghiệm máu trước buổi khám không?", { exact: true })).toBeVisible();
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

  expect(calls.generateBody).toMatchObject({ departmentId: DEPARTMENT_ID, facilityId: null, symptoms: "Đau ngực khi vận động" });
  expect(calls.checklist).toBe(1);
  expect(calls.detail).toBe(1);
  expect(calls.userMe).toBeGreaterThanOrEqual(2);
  expect(calls.reminderBody).toEqual({ enableReminder: true, phoneNumber: "0901234567" });
  expect(calls.summary).toBe(1);
  expect(calls.complete).toBe(1);
  expect(pageErrors).toEqual([]);
});

test("required checklist items block the next step", async ({ page }) => {
  await openPreConsultation(page);
  await page.getByLabel("Chuyên khoa (bắt buộc)").selectOption(DEPARTMENT_ID);
  await page.getByLabel("Thời gian dự kiến khám (bắt buộc)").fill("2027-01-15T09:30");
  await page.getByLabel("Triệu chứng hoặc điều cần tư vấn (bắt buộc)").fill("Đau ngực khi vận động");
  await page.getByRole("button", { name: "Bắt đầu tư vấn" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByRole("alert")).toContainText("1 mục bắt buộc");
  await expect(page.getByRole("heading", { name: "Checklist chuẩn bị" })).toBeVisible();
});
