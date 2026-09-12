import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
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
  return calls;
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

  const labSelect = page.getByLabel(/Xét nghiệm đính kèm/);
  await expect(labSelect).toHaveValue("");
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

  await page.getByLabel(/Xét nghiệm đính kèm/).selectOption(LAB_SESSION_ID);
  await expect(page.getByRole("button", { name: "Xem lại kết quả" })).toBeVisible();
  await page.getByRole("button", { name: "Xem lại kết quả" }).click();

  const dialog = page.getByRole("dialog", { name: "Kết quả xét nghiệm" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Kết quả ngày 13\/8\/2026/ })).toBeVisible();
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

  await page.getByLabel(/Xét nghiệm đính kèm/).selectOption(LAB_SESSION_ID);
  await expect(page.getByLabel(/Xét nghiệm đính kèm/)).toHaveValue(LAB_SESSION_ID);

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

test("recovery request form stays full-width above the workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await prepareRecoveryPage(page);

  const pageBox = await page.locator(".recovery-page").boundingBox();
  const formBox = await page.locator(".recovery-create-card").boundingBox();
  const mainBox = await page.locator(".recovery-workspace-main").boundingBox();
  const diseaseBox = await page.locator(".recovery-disease-field").boundingBox();
  const noteBox = await page.locator(".recovery-note-field").boundingBox();

  expect(pageBox.width).toBeGreaterThan(1100);
  expect(formBox.y).toBeLessThan(mainBox.y);
  expect(formBox.x).toBeCloseTo(mainBox.x, 0);
  expect(formBox.width).toBeCloseTo(mainBox.width, 0);
  expect(diseaseBox.x).toBeCloseTo(noteBox.x, 0);
  expect(diseaseBox.y).toBeLessThan(noteBox.y);
  await expect(page.getByRole("list", { name: "Quy trình nhận kế hoạch phục hồi" })).toBeVisible();
});

test("legacy more-information requests render without the old patient submit form", async ({ page }) => {
  await prepareRecoveryPage(page, { requests: [request({ status: "needMoreInformation" })] });

  await expect(page.getByText("Luồng bổ sung thông tin đã ngừng sử dụng")).toBeVisible();
  await expect(page.getByLabel(/Thông tin bổ sung/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gửi thông tin bổ sung" })).toHaveCount(0);
});

test("new-request form reappears immediately after cancelling an active request", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request()] });
  await expect(page.getByRole("heading", { name: "Gửi thông tin cho bác sĩ" })).toHaveCount(0);

  await page.getByRole("button", { name: "Hủy yêu cầu" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Hủy yêu cầu" }).click();

  await expect(page.getByRole("heading", { name: "Gửi thông tin cho bác sĩ" })).toBeVisible();
  expect(calls.cancelled).toBe(true);
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

test("user cancels a ready-to-start plan and sees the reason afterwards", async ({ page }) => {
  const calls = await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan()] });
  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();
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

  await expect(page.getByRole("heading", { name: "Gửi thông tin cho bác sĩ" })).toBeVisible();
});

test("cancelling a plan with \"Lý do khác\" requires a note", async ({ page }) => {
  await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan({ status: "active" })] });
  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();
  await page.getByRole("button", { name: "Hủy kế hoạch" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do hủy").selectOption("OTHER");
  await dialog.getByRole("button", { name: "Hủy kế hoạch" }).click();

  await expect(dialog.getByText("Vui lòng mô tả lý do khi chọn \"Lý do khác\".")).toBeVisible();
  await expect(dialog).toBeVisible();
});

test("a cancelled plan is collapsed by default and can be expanded", async ({ page }) => {
  await prepareRecoveryPage(page, {
    requests: [request({ status: "published" })],
    plans: [plan({
      status: "cancelled",
      cancelledAt: "2026-08-01T10:00:00Z",
      cancellationReasonCode: "NO_LONGER_NEEDED",
      cancellationReason: null,
    })],
  });
  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();

  await expect(page.getByRole("heading", { name: "Phục hồi hô hấp 14 ngày" })).toBeVisible();
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeHidden();
  await expect(page.getByText("Khởi động nhẹ", { exact: true })).toBeHidden();

  await page.getByRole("button", { name: "Mở rộng kế hoạch" }).click();
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeVisible();
  await expect(page.getByText("Khởi động nhẹ", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Thu gọn kế hoạch" }).click();
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeHidden();
});

test("plans tab never repeats the plan name/status when there are multiple plans", async ({ page }) => {
  await prepareRecoveryPage(page, {
    requests: [request({ status: "published" })],
    plans: [
      plan(),
      plan({ id: "33333333-3333-4333-8333-333333333333", planName: "Kế hoạch cũ", status: "cancelled", cancelledAt: "2026-07-01T10:00:00Z" }),
    ],
  });
  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();
  await expect(page.getByRole("tab", { name: /Kế hoạch của bạn/ })).toContainText("2");
  await expect(page.getByText("Phục hồi hô hấp 14 ngày", { exact: true })).toHaveCount(1);
  await expect(page.locator(".recovery-plan-bar")).toHaveCount(0);

  // The historical (cancelled) plan must still be reachable - just
  // collapsed by default, not gone from the page entirely.
  await expect(page.getByText("Kế hoạch cũ", { exact: true })).toBeVisible();
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Mở rộng kế hoạch" }).click();
  await expect(page.getByText("Kế hoạch đã được hủy", { exact: true })).toBeVisible();
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

  await page.getByRole("tab", { name: /Lộ trình của bạn/ }).click();
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

  await page.getByRole("tab", { name: /Lộ trình của bạn/ }).click();
  await expect(page.getByText("Giai đoạn 1: Khởi động nhẹ", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();
  await page.getByRole("button", { name: "Hủy kế hoạch" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do hủy").selectOption("UNABLE_TO_FOLLOW");
  await dialog.getByRole("button", { name: "Hủy kế hoạch" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("tab", { name: /Lộ trình của bạn/ }).click();
  await expect(page.getByText("Lộ trình không còn hiệu lực", { exact: true })).toBeVisible();
  await expect(page.getByText("Giai đoạn 1: Khởi động nhẹ", { exact: true })).toHaveCount(0);
});

test("new-request form is hidden while a plan is active", async ({ page }) => {
  // The request behind an active/readyToStart plan is already published (a
  // terminal, non-blocking request status) - the plan itself is what's
  // still blocking the workflow guard here.
  await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan({ status: "active" })] });
  await page.getByRole("tab", { name: /Kế hoạch của bạn/ }).click();
  await expect(page.getByText("Đang thực hiện", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gửi thông tin cho bác sĩ" })).toHaveCount(0);
});

test("new-request form is visible again once the plan is no longer active", async ({ page }) => {
  await prepareRecoveryPage(page, { requests: [request({ status: "published" })], plans: [plan({ status: "completed" })] });
  await expect(page.getByRole("heading", { name: "Gửi thông tin cho bác sĩ" })).toBeVisible();
});

test("recovery plan page remains accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareRecoveryPage(page, { requests: [], plans: [plan({ status: "completed" })] });
  const formBox = await page.locator(".recovery-create-card").boundingBox();
  const tabsBox = await page.locator(".recovery-workspace-tabs").boundingBox();
  expect(formBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  expect(formBox.y).toBeLessThan(tabsBox.y);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
