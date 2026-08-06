import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

function request(overrides = {}) {
  return {
    id: REQUEST_ID,
    userId: USER_ID,
    assignedDoctorId: null,
    diseaseGroup: "respiratory",
    treatmentJourneyId: null,
    primaryLabTestSessionId: null,
    status: "waitingForDoctor",
    requestNote: "Tôi muốn kế hoạch phục hồi 14 ngày.",
    requestedAt: "2026-08-02T08:00:00Z",
    acceptedAt: null,
    reviewStartedAt: null,
    assignmentExpiresAt: null,
    rejectedAt: null,
    cancelledAt: null,
    rejectionReasonCode: null,
    rejectionReason: null,
    version: 1,
    ...overrides,
  };
}

function plan(overrides = {}) {
  return {
    id: PLAN_ID,
    recoveryPlanRequestId: REQUEST_ID,
    planName: "Phục hồi hô hấp 14 ngày",
    durationDays: 14,
    status: "readyToStart",
    publishedAt: "2026-08-02T09:00:00Z",
    activatedAt: null,
    startDate: null,
    endDate: null,
    isCurrent: true,
    summary: "Tăng dần vận động và đảm bảo thời gian nghỉ ngơi.",
    completedAt: null,
    recheckInstruction: "Tái khám khi có khó thở tăng.",
    phases: [{
      id: "phase-1",
      phaseName: "Khởi động nhẹ",
      startDay: 1,
      endDay: 7,
      sleepHoursPerDay: 8,
      restHoursPerDay: 2,
      instruction: "Đi bộ nhẹ và theo dõi nhịp thở.",
      sortOrder: 1,
      nutrientTargets: [{
        id: "nutrient-1",
        nutrientName: "Protein",
        amountPerDay: 70,
        unit: "g",
        instruction: "Chia đều trong ngày.",
        sortOrder: 1,
        foodSources: [{ id: "food-1", foodName: "Trứng", suggestedServing: "1 quả", note: null, sortOrder: 1 }],
      }],
    }],
    ...overrides,
  };
}

async function prepareRecoveryPage(page, options = {}) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });

  let requests = [...(options.requests ?? [])];
  let plans = [...(options.plans ?? [])];
  let quota = options.quota ?? {
    quotaCode: "recoveryPlan",
    quotaName: "Kế hoạch phục hồi",
    limitValue: 3,
    usedCount: 1,
    reservedCount: 0,
    remainingCount: 2,
    cycleStart: "2026-08-01",
    cycleEnd: "2026-08-31",
    resetPeriod: "subscriptionCycle",
  };
  const calls = { createBody: null, idempotencyKey: "", provideBody: null, cancelled: false, started: false };

  await page.route("**/hubs/recovery-plans**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { id: USER_ID, displayName: "Nguyễn Minh", roles: ["Patient"] } }) });
    }
    if (path === "/api/me/subscription-usage") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: quota }) });
    }
    if (path === "/api/recovery-plan-requests/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: requests, pageNumber: 1, pageSize: 10, totalCount: requests.length, totalPages: 1 } }) });
    }
    if (path === "/api/recovery-plan-requests" && method === "POST") {
      calls.createBody = route.request().postDataJSON();
      calls.idempotencyKey = route.request().headers()["idempotency-key"];
      const created = request({ diseaseGroup: calls.createBody.diseaseGroup, requestNote: calls.createBody.requestNote });
      requests = [created, ...requests];
      quota = { ...quota, reservedCount: quota.reservedCount + 1, remainingCount: quota.remainingCount - 1 };
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: created }) });
    }
    if (path === `/api/recovery-plan-requests/${REQUEST_ID}`) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: requests.find((item) => item.id === REQUEST_ID) }) });
    }
    if (path === `/api/recovery-plan-requests/${REQUEST_ID}/cancel`) {
      calls.cancelled = true;
      requests = requests.map((item) => item.id === REQUEST_ID ? { ...item, status: "cancelled" } : item);
      quota = { ...quota, reservedCount: 0, remainingCount: quota.remainingCount + 1 };
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: requests[0] }) });
    }
    if (path === `/api/recovery-plan-requests/${REQUEST_ID}/provide-more-information`) {
      calls.provideBody = route.request().postDataJSON();
      requests = requests.map((item) => item.id === REQUEST_ID ? { ...item, status: "inReview", requestNote: calls.provideBody.additionalInformation } : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: requests[0] }) });
    }
    if (path === "/api/recovery-plans/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: plans, pageNumber: 1, pageSize: 10, totalCount: plans.length, totalPages: 1 } }) });
    }
    if (path === `/api/recovery-plans/${PLAN_ID}`) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: plans.find((item) => item.id === PLAN_ID) }) });
    }
    if (path === `/api/recovery-plans/${PLAN_ID}/start`) {
      calls.started = true;
      plans = plans.map((item) => item.id === PLAN_ID ? { ...item, status: "active", startDate: "2026-08-02", endDate: "2026-08-15" } : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: plans[0] }) });
    }

    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.goto("/recovery-plan", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Kế hoạch phục hồi của bạn" })).toBeVisible();
  return calls;
}

test("user creates a recovery request with quota and an idempotency key", async ({ page }) => {
  const calls = await prepareRecoveryPage(page);
  await expect(page.getByRole("heading", { name: "Còn 2 lượt có thể yêu cầu" })).toBeVisible();
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByLabel("Điều bạn muốn bác sĩ lưu ý").fill("Tôi muốn kế hoạch phục hồi 14 ngày.");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await expect(page.getByText("Đang chờ bác sĩ", { exact: true }).first()).toBeVisible();
  expect(calls.createBody).toEqual({
    diseaseGroup: "respiratory",
    treatmentJourneyId: null,
    primaryLabTestSessionId: null,
    requestNote: "Tôi muốn kế hoạch phục hồi 14 ngày.",
  });
  expect(calls.idempotencyKey.length).toBeGreaterThan(0);
  expect(calls.idempotencyKey.length).toBeLessThanOrEqual(100);
});

test("user replaces the current note when more information is requested", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request({ status: "needMoreInformation" })] });
  await expect(page.getByText("Nội dung gửi đi sẽ thay thế phần ghi chú hiện tại")).toBeVisible();
  const field = page.getByLabel(/Thông tin bổ sung/);
  await field.fill("Tôi đã cập nhật kết quả xét nghiệm mới nhất.");
  await page.getByRole("button", { name: "Gửi thông tin bổ sung" }).click();

  await expect(page.getByText("Đang xem xét", { exact: true }).first()).toBeVisible();
  expect(calls.provideBody).toEqual({ additionalInformation: "Tôi đã cập nhật kết quả xét nghiệm mới nhất." });
});

test("user reads and starts a published recovery plan", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan()] });
  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();
  await expect(page.getByRole("heading", { name: "Phục hồi hô hấp 14 ngày" })).toBeVisible();
  await expect(page.getByText("Khởi động nhẹ", { exact: true })).toBeVisible();
  await expect(page.getByText("Trứng", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu kế hoạch" }).click();

  await expect(page.getByText("Đang thực hiện", { exact: true }).first()).toBeVisible();
  expect(calls.started).toBe(true);
});

test("timeline tab paints each phase onto its real calendar dates", async ({ page }) => {
  await prepareRecoveryPage(page, {
    requests: [request({ status: "published" })],
    plans: [plan({
      startDate: "2026-08-05",
      endDate: "2026-08-18",
      phases: [
        {
          id: "phase-1",
          phaseName: "Khởi động nhẹ",
          startDay: 1,
          endDay: 12,
          sleepHoursPerDay: 8,
          restHoursPerDay: 2,
          instruction: "Đi bộ nhẹ và theo dõi nhịp thở.",
          sortOrder: 1,
          nutrientTargets: [],
        },
        {
          id: "phase-2",
          phaseName: "Tăng cường",
          startDay: 13,
          endDay: 14,
          sleepHoursPerDay: 7,
          restHoursPerDay: 1,
          instruction: "Tăng dần cường độ vận động.",
          sortOrder: 2,
          nutrientTargets: [],
        },
      ],
    })],
  });

  await page.getByRole("tab", { name: /Lộ trình của bạn/ }).click();
  await expect(page.getByText("Tháng 8 - 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Giai đoạn 1: Khởi động nhẹ", { exact: true })).toBeVisible();
  await expect(page.getByText("5/8/2026 – 16/8/2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Giai đoạn 2: Tăng cường", { exact: true })).toBeVisible();
  await expect(page.getByText("17/8/2026 – 18/8/2026", { exact: true })).toBeVisible();
});

test("recovery plan page remains accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareRecoveryPage(page, { requests: [request()], plans: [plan({ status: "completed" })] });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
