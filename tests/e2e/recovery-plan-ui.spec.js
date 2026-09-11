import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const LAB_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
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
      sleepAndRestHoursPerDay: 10,
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
    quotaCode: "SERVICE_CREDIT",
    grantedCount: 3,
    usedCount: 1,
    reservedCount: 0,
    remainingCount: 2,
  };
  const calls = {
    labSessionsQuery: null,
    readinessBody: null,
    readinessCalls: 0,
    createBody: null,
    createCalls: 0,
    idempotencyKey: "",
    cancelled: false,
    started: false,
    cancelPlanBody: null,
    labTestGets: 0,
  };

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
    if (path === `/api/lab-tests/${LAB_SESSION_ID}`) {
      calls.labTestGets += 1;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: options.labSessionDetail ?? {
            sessionId: LAB_SESSION_ID,
            status: "completed",
            testDate: "2026-08-13",
            processedAt: "2026-08-13T04:59:00Z",
            results: [{
              resultDetailId: "result-chol",
              rawExtractedName: "CHOL",
              userValue: 5.3,
              referenceMinUsed: 3.9,
              referenceMaxUsed: 5.2,
              referenceUnitUsed: "mmol/L",
              status: "high",
              indicator: {
                indicatorId: "indicator-chol",
                symbol: "CHOL",
                fullName: "Cholesterol toàn phần",
                unit: "mmol/L",
              },
              advice: {
                displayTitle: "Cholesterol toàn phần: cao hơn khoảng tham chiếu",
                summary: "Chỉ số cholesterol cần được theo dõi cùng bác sĩ.",
              },
            }],
          },
        }),
      });
    }
    if (path === "/api/lab-tests/my-sessions") {
      calls.labSessionsQuery = Object.fromEntries(url.searchParams.entries());
      const items = options.labSessions ?? [];
      const data = options.labSessionsResponseData ?? { items, pageNumber: 1, pageSize: 20, totalCount: items.length, totalPages: 1 };
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    }
    if (path === "/api/recovery-plan-requests/me") {
      const statusFilter = url.searchParams.get("Status");
      const filtered = statusFilter ? requests.filter((item) => item.status === statusFilter) : requests;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: filtered, pageNumber: 1, pageSize: 10, totalCount: filtered.length, totalPages: 1 } }) });
    }
    if (path === "/api/recovery-plan-requests/readiness" && method === "POST") {
      calls.readinessCalls += 1;
      calls.readinessBody = route.request().postDataJSON();
      const data = options.readinessData ?? { isReady: true, issues: [] };
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    }
    if (path === "/api/recovery-plan-requests" && method === "POST") {
      calls.createCalls += 1;
      calls.createBody = route.request().postDataJSON();
      calls.idempotencyKey = route.request().headers()["idempotency-key"];
      if (options.createError) {
        return route.fulfill({
          status: options.createError.status ?? 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: options.createError.message ?? "Request failed.",
            data: null,
            errors: [options.createError.code],
          }),
        });
      }
      const created = request({
        diseaseGroup: calls.createBody.diseaseGroup,
        primaryLabTestSessionId: calls.createBody.primaryLabTestSessionId,
        requestNote: calls.createBody.requestNote,
      });
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
    if (path === "/api/recovery-plans/me") {
      const statusFilter = url.searchParams.get("Status");
      const filtered = statusFilter ? plans.filter((item) => item.status === statusFilter) : plans;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: filtered, pageNumber: 1, pageSize: 10, totalCount: filtered.length, totalPages: 1 } }) });
    }
    if (/^\/api\/recovery-plans\/[^/]+$/.test(path)) {
      const planId = path.split("/").pop();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: plans.find((item) => item.id === planId) }) });
    }
    if (path === `/api/recovery-plans/${PLAN_ID}/start`) {
      calls.started = true;
      plans = plans.map((item) => item.id === PLAN_ID ? { ...item, status: "active", startDate: "2026-08-02", endDate: "2026-08-15" } : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: plans[0] }) });
    }
    if (path === `/api/recovery-plans/${PLAN_ID}/cancel`) {
      calls.cancelPlanBody = route.request().postDataJSON();
      plans = plans.map((item) => item.id === PLAN_ID ? {
        ...item,
        status: "cancelled",
        cancelledAt: "2026-08-06T14:02:15.123Z",
        cancellationReasonCode: calls.cancelPlanBody.cancellationReasonCode,
        cancellationReason: calls.cancelPlanBody.cancellationReason,
      } : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: plans[0] }) });
    }

    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.goto("/recovery-plan", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".recovery-page-header").getByRole("heading", { name: "Kế hoạch phục hồi", exact: true })).toBeVisible();
  if (options.view === "request" || (options.view !== "tracking" && !(options.requests?.length || options.plans?.length))) {
    await page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gửi yêu cầu cho bác sĩ", exact: true })).toBeVisible();
  }
  return calls;
}

async function attachLab(page) {
  await page.getByRole("button", { name: "Chọn kết quả xét nghiệm", exact: true }).click();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Đính kèm kết quả", exact: true }).click();
}

test("user creates a recovery request with quota and an idempotency key", async ({ page }) => {
  const calls = await prepareRecoveryPage(page);
  await expect(page.getByRole("heading", { name: "Còn 2 lượt có thể yêu cầu" })).toBeVisible();
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý").fill("Tôi muốn kế hoạch phục hồi 14 ngày.");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await expect(page.getByText("Đang chờ bác sĩ", { exact: true }).first()).toBeVisible();
  expect(calls.readinessCalls).toBe(1);
  expect(calls.readinessBody).toEqual({
    diseaseGroup: "respiratory",
    requestNote: "Tôi muốn kế hoạch phục hồi 14 ngày.",
  });
  expect(calls.createCalls).toBe(1);
  expect(calls.createBody).toEqual({
    diseaseGroup: "respiratory",
    treatmentJourneyId: null,
    primaryLabTestSessionId: null,
    requestNote: "Tôi muốn kế hoạch phục hồi 14 ngày.",
    prescriptionImageUrl: null,
  });
  expect(calls.idempotencyKey.length).toBeGreaterThan(0);
  expect(calls.idempotencyKey.length).toBeLessThanOrEqual(100);
});

test("user formats a recovery note with the accessible toolbar", async ({ page }) => {
  const calls = await prepareRecoveryPage(page);
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  const note = page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý");
  await note.fill("Đau khi đi bộ");
  await note.selectText();
  await page.getByRole("button", { name: "In đậm đoạn đã chọn" }).click();
  await expect(note).toHaveValue("**Đau khi đi bộ**");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();
  await expect.poll(() => calls.createBody?.requestNote).toBe("**Đau khi đi bộ**");
});

test("completed lab tests are listed but not attached by default", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, {
    labSessions: [
      {
        sessionId: LAB_SESSION_ID,
        status: "completed",
        testDate: "2026-08-17",
        facilityName: "Phòng xét nghiệm MediLab",
        createdAt: "2026-08-17T01:00:00Z",
      },
      {
        sessionId: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        status: "completed",
        testDate: "2026-08-10",
        facilityName: "Phòng xét nghiệm cũ",
        createdAt: "2026-08-10T01:00:00Z",
      },
    ],
  });

  await expect(page.locator(".recovery-confirm-summary")).toContainText("0 đính kèm");
  expect(calls.labSessionsQuery).toMatchObject({ PageNumber: "1", PageSize: "20", status: "completed" });

  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý").fill("Tôi muốn kế hoạch phục hồi 14 ngày.");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await expect.poll(() => calls.createBody?.primaryLabTestSessionId).toBe(null);
});

test("user previews the selected lab test result before creating a recovery request", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, {
    labSessions: [
      {
        sessionId: LAB_SESSION_ID,
        status: "completed",
        testDate: "2026-08-13",
        facilityName: "Phòng xét nghiệm MediLab",
        createdAt: "2026-08-13T04:59:00Z",
      },
    ],
  });

  await attachLab(page);
  await expect(page.getByRole("button", { name: "Xem lại kết quả" })).toBeVisible();
  await page.getByRole("button", { name: "Xem lại kết quả" }).click();

  const dialog = page.getByRole("dialog", { name: "Kết quả xét nghiệm" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Kết quả ngày 13\/8\/2026/ })).toBeVisible();
  await dialog.getByRole("tab", { name: "Chỉ số xét nghiệm", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Cholesterol toàn phần", exact: true })).toBeVisible();
  expect(calls.labTestGets).toBeGreaterThanOrEqual(1);
});

test("lab test session id variants from the API are attachable", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, {
    labSessions: [
      {
        testSessionId: LAB_SESSION_ID,
        status: "Completed",
        testDate: "2026-07-31",
        facilityName: "Phòng xét nghiệm MediLab",
        createdAt: "2026-08-13T16:39:00Z",
      },
    ],
  });

  await attachLab(page);
  await expect(page.locator(".recovery-confirm-summary")).toContainText("1 đính kèm");

  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý").fill("Tôi cần bác sĩ xem xét kết quả xét nghiệm gần nhất.");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await expect.poll(() => calls.createBody?.primaryLabTestSessionId).toBe(LAB_SESSION_ID);
});

test("user cannot submit a recovery request without a note", async ({ page }) => {
  const calls = await prepareRecoveryPage(page);
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await expect(page.locator("#recovery-requestNote-help")).toHaveText("Nhập thông tin bạn muốn bác sĩ lưu ý.");
  expect(calls.readinessCalls).toBe(0);
  expect(calls.createCalls).toBe(0);
});

test("readiness issues block request creation and link to the medical profile", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, {
    readinessData: {
      isReady: false,
      issues: [{ code: "HEIGHT_REQUIRED", field: "height", message: "Height is required." }],
    },
  });
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý").fill("Tôi muốn kế hoạch phục hồi 14 ngày.");
  await page.getByRole("button", { name: "Gửi yêu cầu" }).click();

  await expect(page.getByText("Vui lòng cập nhật chiều cao trong hồ sơ y tế.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cập nhật hồ sơ y tế" })).toBeVisible();
  expect(calls.readinessCalls).toBe(1);
  expect(calls.createCalls).toBe(0);
});

test("request is a separate screen with desktop confirmation beside the fields", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await prepareRecoveryPage(page);
  await expect(page.locator(".recovery-tracking")).toHaveCount(0);
  const fields = await page.locator(".recovery-compose-fields").boundingBox();
  const confirmation = await page.locator(".recovery-confirmation").boundingBox();
  expect(fields.width).toBeGreaterThan(confirmation.width);
  expect(confirmation.x).toBeGreaterThan(fields.x + fields.width);
  expect(Math.abs(fields.y - confirmation.y)).toBeLessThan(3);
});

test("legacy more-information requests render without the old patient submit form", async ({ page }) => {
  await prepareRecoveryPage(page, { requests: [request({ status: "needMoreInformation" })] });

  await expect(page.getByText("Luồng bổ sung thông tin đã ngừng sử dụng")).toBeVisible();
  await expect(page.getByLabel(/Thông tin bổ sung/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gửi thông tin bổ sung" })).toHaveCount(0);
});

test("new-request form reappears immediately after cancelling an active request", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request()] });
  await expect(page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Hủy yêu cầu" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Hủy yêu cầu kế hoạch?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Hủy yêu cầu" }).click();

  await expect(page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true })).toBeVisible();
  expect(calls.cancelled).toBe(true);
});

test("user reads and starts a published recovery plan", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan()] });
  await page.getByRole("button", { name: "Hướng dẫn phục hồi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Phục hồi hô hấp 14 ngày" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Khởi động nhẹ", exact: true })).toBeVisible();
  await expect(page.getByText("Trứng", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu kế hoạch" }).click();

  await expect(page.getByText("Đang thực hiện", { exact: true }).first()).toBeVisible();
  expect(calls.started).toBe(true);
});

test("user cancels a ready-to-start plan and sees the reason afterwards", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan()] });
  await page.getByRole("button", { name: "Hướng dẫn phục hồi", exact: true }).click();
  await page.getByRole("button", { name: "Hủy kế hoạch" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Lượt kế hoạch đã sử dụng không được hoàn lại")).toBeVisible();
  await dialog.getByLabel("Lý do hủy").selectOption("UNABLE_TO_FOLLOW");
  await dialog.getByRole("button", { name: "Hủy kế hoạch" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeVisible();
  await expect(page.getByText("Không thể tiếp tục thực hiện", { exact: true })).toBeVisible();
  expect(calls.cancelPlanBody).toEqual({ cancellationReasonCode: "UNABLE_TO_FOLLOW", cancellationReason: null });

  await expect(page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true })).toBeVisible();
});

test("cancelling a plan with \"Lý do khác\" requires a note", async ({ page }) => {
  await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan({ status: "active" })] });
  await page.getByRole("button", { name: "Hướng dẫn phục hồi", exact: true }).click();
  await page.getByRole("button", { name: "Hủy kế hoạch" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do hủy").selectOption("OTHER");
  await dialog.getByRole("button", { name: "Hủy kế hoạch" }).click();

  await expect(dialog.getByText("Vui lòng mô tả lý do khi chọn \"Lý do khác\".")).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("cancelled plan keeps its outcome and full instructions available", async ({ page }) => {
  await prepareRecoveryPage(page, { plans: [plan({ status: "cancelled", cancelledAt: "2026-08-01T10:00:00Z", cancellationReasonCode: "NO_LONGER_NEEDED" })] });
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Khởi động nhẹ", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu kế hoạch" })).toHaveCount(0);
});

test("tracking shows only the current plan and older plans remain in history", async ({ page }) => {
  await prepareRecoveryPage(page, { plans: [plan(), plan({ id: "33333333-3333-4333-8333-333333333333", planName: "Kế hoạch cũ", status: "cancelled" })] });
  await expect(page.getByRole("heading", { name: "Phục hồi hô hấp 14 ngày" })).toBeVisible();
  await expect(page.getByText("Kế hoạch cũ", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Lịch sử", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Lịch sử", exact: true });
  await history.getByRole("button", { name: "Kế hoạch của bạn", exact: true }).click();
  await history.getByRole("button", { name: /Kế hoạch cũ/ }).click();
  await expect(history.getByText("Kế hoạch đã được hủy", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(history).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Phục hồi hô hấp 14 ngày" })).toBeVisible();
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
          sleepAndRestHoursPerDay: 10,
          instruction: "Đi bộ nhẹ và theo dõi nhịp thở.",
          sortOrder: 1,
          nutrientTargets: [],
        },
        {
          id: "phase-2",
          phaseName: "Tăng cường",
          startDay: 13,
          endDay: 14,
          sleepAndRestHoursPerDay: 8,
          instruction: "Tăng dần cường độ vận động.",
          sortOrder: 2,
          nutrientTargets: [],
        },
      ],
    })],
  });

  await page.getByRole("button", { name: "Lịch thực hiện", exact: true }).click();
  await expect(page.getByText("Tháng 8 - 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Giai đoạn 1: Khởi động nhẹ", { exact: true })).toBeVisible();
  await expect(page.getByText("5/8/2026 – 16/8/2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Giai đoạn 2: Tăng cường", { exact: true })).toBeVisible();
  await expect(page.getByText("17/8/2026 – 18/8/2026", { exact: true })).toBeVisible();
});

test("cancelling a plan immediately clears its colored roadmap, without a reload", async ({ page }) => {
  await prepareRecoveryPage(page, {
    requests: [request({ status: "published" })],
    plans: [plan({
      status: "active",
      startDate: "2026-08-05",
      endDate: "2026-08-18",
      phases: [{
        id: "phase-1",
        phaseName: "Khởi động nhẹ",
        startDay: 1,
        endDay: 14,
        sleepAndRestHoursPerDay: 10,
        instruction: "Đi bộ nhẹ và theo dõi nhịp thở.",
        sortOrder: 1,
        nutrientTargets: [],
      }],
    })],
  });

  await page.getByRole("button", { name: "Lịch thực hiện", exact: true }).click();
  await expect(page.getByText("Giai đoạn 1: Khởi động nhẹ", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Hướng dẫn phục hồi", exact: true }).click();
  await page.getByRole("button", { name: "Hủy kế hoạch" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do hủy").selectOption("UNABLE_TO_FOLLOW");
  await dialog.getByRole("button", { name: "Hủy kế hoạch" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Lịch thực hiện", exact: true }).click();
  await expect(page.getByText("Lộ trình không còn hiệu lực", { exact: true })).toBeVisible();
  await expect(page.getByText("Giai đoạn 1: Khởi động nhẹ", { exact: true })).toHaveCount(0);
});

test("new-request form is hidden while a plan is active", async ({ page }) => {
  // The request behind an active/readyToStart plan is already published (a
  // terminal, non-blocking request status) - the plan itself is what's
  // still blocking the workflow guard here.
  await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan({ status: "active" })] });
  await page.getByRole("button", { name: "Hướng dẫn phục hồi", exact: true }).click();
  await expect(page.getByText("Đang thực hiện", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true })).toHaveCount(0);
});

test("new-request form is visible again once the plan is no longer active", async ({ page }) => {
  await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan({ status: "completed" })] });
  await expect(page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true })).toBeVisible();
});


const ATTACHMENT_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==", "base64");
const ATTACHABLE_LAB = { sessionId: LAB_SESSION_ID, status: "completed", testDate: "2026-08-13", facilityName: "MediLab", createdAt: "2026-08-13T04:59:00Z" };

for (const width of [1440, 768, 390, 320]) {
  test(`focused request has no overflow and correct confirmation layout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await prepareRecoveryPage(page);
    const fields = await page.locator(".recovery-compose-fields").boundingBox();
    const summary = await page.locator(".recovery-confirmation").boundingBox();
    if (width > 900) expect(summary.x).toBeGreaterThan(fields.x + fields.width);
    else expect(summary.y).toBeGreaterThanOrEqual(fields.y + fields.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("button", { name: "Gửi yêu cầu", exact: true })).toBeVisible();
    await expect(page.locator(".recovery-evidence-row")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lịch sử", exact: true })).toHaveCount(0);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: testInfo.outputPath("request.png"), fullPage: true });
    const results = await new AxeBuilder({ page }).include(".recovery-page").analyze();
    expect(results.violations).toEqual([]);
  });
}

test("draft and attachments survive navigation between tracking and request, including browser back", async ({ page }) => {
  await prepareRecoveryPage(page, { labSessions: [ATTACHABLE_LAB] });
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  await page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý").fill("Nội dung bản nháp cần giữ lại.");
  await attachLab(page);
  await page.locator("#recovery-prescriptionImage").setInputFiles({ name: "don-thuoc.png", mimeType: "image/png", buffer: ATTACHMENT_PNG });
  await page.getByRole("button", { name: "Về theo dõi phục hồi" }).click();
  await expect(page.locator(".recovery-create-card")).toBeHidden();
  await expect(page.locator(".recovery-tracking")).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý")).toHaveValue("Nội dung bản nháp cần giữ lại.");
  await expect(page.locator(".recovery-confirm-summary")).toContainText("2 đính kèm");
  await page.getByRole("button", { name: "Xem ảnh", exact: true }).click();
  await expect(page.getByAltText("Xem trước đơn thuốc")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bỏ đính kèm", exact: true }).click();
  await page.getByRole("button", { name: "Xóa ảnh", exact: true }).click();
  await expect(page.locator(".recovery-confirm-summary")).toContainText("0 đính kèm");
  await page.locator("#recovery-prescriptionImage").setInputFiles({ name: "wrong.pdf", mimeType: "application/pdf", buffer: Buffer.from("test") });
  await expect(page.locator(".recovery-evidence [role=alert]")).toBeVisible();
});

test("lab picker needs confirmation, supports preview and keyboard dismissal", async ({ page }) => {
  await prepareRecoveryPage(page, { labSessions: [ATTACHABLE_LAB] });
  const button = page.getByRole("button", { name: "Chọn kết quả xét nghiệm", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  const picker = page.getByRole("dialog", { name: "Chọn kết quả xét nghiệm", exact: true });
  await picker.getByRole("radio").check();
  await picker.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Kết quả xét nghiệm", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  await expect(page.locator(".recovery-confirm-summary")).toContainText("0 đính kèm");
});

test("upload failure preserves the request and permits retry without duplicate creation", async ({ page }) => {
  await page.addInitScript(() => { window.__MEDIMATE_CLOUDINARY_CONFIG__ = { cloudName: "fixture", uploadPreset: "fixture" }; });
  let uploads = 0;
  await page.route("https://api.cloudinary.com/**", route => {
    uploads += 1;
    return route.fulfill({ status: uploads === 1 ? 503 : 200, contentType: "application/json",
      body: JSON.stringify(uploads === 1 ? { error: { message: "Không thể tải ảnh kiểm thử." } } : { secure_url: "https://example.invalid/prescription.png" }) });
  });
  const calls = await prepareRecoveryPage(page);
  await page.getByLabel(/Nhóm bệnh/).selectOption("respiratory");
  const note = page.getByLabel("Thông tin bạn muốn bác sĩ lưu ý");
  await note.fill("Tôi muốn bác sĩ tham khảo đơn thuốc đính kèm.");
  await page.locator("#recovery-prescriptionImage").setInputFiles({ name: "don-thuoc.png", mimeType: "image/png", buffer: ATTACHMENT_PNG });
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(page.getByText("Không thể tải ảnh kiểm thử.", { exact: true })).toBeVisible();
  await expect(note).toHaveValue("Tôi muốn bác sĩ tham khảo đơn thuốc đính kèm.");
  expect(calls.createCalls).toBe(0);
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect.poll(() => calls.createCalls).toBe(1);
  expect(calls.createBody.prescriptionImageUrl).toBe("https://example.invalid/prescription.png");
  expect(uploads).toBe(2);
  await expect(page).toHaveURL(/\/recovery-plan$/);
});

test("no quota prevents new requests but not tracking or history", async ({ page }) => {
  await prepareRecoveryPage(page, { view: "tracking", quota: { quotaCode: "SERVICE_CREDIT", grantedCount: 1, usedCount: 1, reservedCount: 0, remainingCount: 0 } });
  await expect(page.getByRole("button", { name: "Gửi yêu cầu mới", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bạn đã hết lượt sử dụng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mua thêm lượt", exact: true })).toBeEnabled();
  await expect(page.getByText("Bạn vẫn có thể xem kế hoạch và lịch sử đã có.")).toBeVisible();
  await page.getByRole("button", { name: "Lịch sử", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Lịch sử", exact: true })).toBeVisible();
});

for (const width of [1440, 390, 320]) {
  test(`plan shows current scheduled phase and alternate calendar at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8);
    const dateKey = [start.getFullYear(), String(start.getMonth() + 1).padStart(2, "0"), String(start.getDate()).padStart(2, "0")].join("-");
    await prepareRecoveryPage(page, { plans: [plan({ status: "active", startDate: dateKey, phases: [
      ...plan().phases, { id: "phase-2", phaseName: "Tăng cường", startDay: 8, endDay: 14, instruction: "Hướng dẫn giai đoạn hai không được cắt bớt.", sortOrder: 2, nutrientTargets: [] },
    ] })] });
    await expect(page.getByText("Hướng dẫn giai đoạn hai không được cắt bớt.", { exact: true })).toBeVisible();
    await expect(page.getByText("Đi bộ nhẹ và theo dõi nhịp thở.", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Giai đoạn trước", exact: true }).click();
    await expect(page.getByText("Đi bộ nhẹ và theo dõi nhịp thở.", { exact: true })).toBeVisible();
    await expect(page.getByText("Trứng", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Xem toàn bộ kế hoạch", exact: true }).click();
    await expect(page.locator(".recovery-phase-card")).toHaveCount(2);
    await page.getByRole("button", { name: "Xem từng giai đoạn", exact: true }).click();
    await expect(page.locator(".recovery-phase-card")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: testInfo.outputPath("tracking.png"), fullPage: true });
    const result = await new AxeBuilder({ page }).include(".recovery-page").analyze();
    expect(result.violations).toEqual([]);
    await page.getByRole("button", { name: "Lịch thực hiện", exact: true }).click();
    await expect(page.locator(".recovery-phase-workspace")).toHaveCount(0);
    await expect(page.locator(".recovery-timeline-calendar")).toBeVisible();
  });
}

for (const width of [1440, 390, 320]) {
  test(`zero-credit state is clear above a compact previous request at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await prepareRecoveryPage(page, { view: "tracking", requests: [request({ status: "cancelled" })], quota: { remainingCount: 0 } });
    const notice = page.getByRole("region", { name: "Lượt sử dụng đã hết" });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("button", { name: "Mua thêm lượt" })).toBeInViewport();
    const noticeBox = await notice.boundingBox();
    const previousBox = await page.locator(".recovery-recent-request").boundingBox();
    expect(noticeBox.y + noticeBox.height).toBeLessThanOrEqual(previousBox.y);
    await expect(page.locator(".recovery-tracking .recovery-request-detail")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("no-credits.png"), fullPage: true });
    const result = await new AxeBuilder({ page }).include(".recovery-page").analyze();
    expect(result.violations).toEqual([]);
    await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Lịch sử", exact: true })).toBeVisible();
  });
}

test("direct request link with zero credits shows an actionable explanation, not a disabled form", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { view: "tracking", quota: { remainingCount: 0 } });
  await page.goto("/recovery-plan?view=request");
  await expect(page.getByRole("heading", { name: "Bạn đã hết lượt sử dụng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu", exact: true })).toHaveCount(0);
  await expect(page.getByLabel(/Nhóm bệnh/)).toBeHidden();
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  expect((await new AxeBuilder({ page }).include(".recovery-page").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Mua thêm lượt", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing\?view=upgrade&returnTo=%2Frecovery-plan%3Fview%3Drequest/);
  expect(calls.createCalls).toBe(0);
});

test("focused request and history are accessible in dark mode", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepareRecoveryPage(page, { labSessions: [ATTACHABLE_LAB] });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await attachLab(page);
  const results = await new AxeBuilder({ page }).include(".recovery-page").analyze();
  expect(results.violations).toEqual([]);
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.screenshot({ path: testInfo.outputPath("request-dark.png"), fullPage: true });
  await page.getByRole("button", { name: "Về theo dõi phục hồi" }).click();
  await page.getByRole("button", { name: "Lịch sử", exact: true }).click();
  const historyResult = await new AxeBuilder({ page }).include(".recovery-history-panel").analyze();
  expect(historyResult.violations).toEqual([]);
});
