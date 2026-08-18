import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const DOCTOR_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "22222222-2222-4222-8222-222222222222";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJEb2N0b3IiLCJ1c2VySWQiOiJkZGRkZGRkZC1kZGRkLTRkZGQtOGRkZC1kZGRkZGRkZGRkZGQifQ",
  "",
].join(".");

function openRequest(overrides = {}) {
  return {
    id: REQUEST_ID,
    diseaseGroup: "respiratory",
    status: "waitingForDoctor",
    requestNote: "Ho nhiều về đêm.",
    requestedAt: "2026-08-04T08:00:00Z",
    ...overrides,
  };
}

function myRequest(overrides = {}) {
  return {
    id: REQUEST_ID,
    diseaseGroup: "respiratory",
    status: "assigned",
    requestNote: "Ho nhiều về đêm.",
    requestedAt: "2026-08-04T08:00:00Z",
    acceptedAt: "2026-08-04T09:00:00Z",
    reviewStartedAt: null,
    assignmentExpiresAt: "2026-08-05T09:00:00Z",
    version: 1,
    recoveryPlanId: null,
    recoveryPlanStatus: null,
    rejectionReasonCode: null,
    rejectionReason: null,
    ...overrides,
  };
}

async function prepareDoctorPage(page, options = {}) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, doctorId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: doctorId,
      roles: ["Doctor"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, doctorId: DOCTOR_ID });

  let openItems = [...(options.openItems ?? [])];
  let mineItems = [...(options.mineItems ?? [])];
  let plan = options.plan ?? null;
  const calls = { requestDetailGets: 0 };

  function ok(data, status = 200) {
    return { status, contentType: "application/json", body: JSON.stringify({ success: true, message: "OK", data, errors: [] }) };
  }

  function fail(status, code, message = "Request failed.") {
    return { status, contentType: "application/json", body: JSON.stringify({ success: false, message, data: null, errors: [code] }) };
  }

  await page.route("**/hubs/recovery-plans**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === "/api/users/me") {
      return route.fulfill(ok({ id: DOCTOR_ID, displayName: "BS. Lan", roles: ["Doctor"] }));
    }
    if (path === "/api/doctor/recovery-plan-requests/open") {
      return route.fulfill(ok({ items: openItems, pageNumber: 1, pageSize: 10, totalCount: openItems.length, totalPages: 1 }));
    }
    if (path === "/api/doctor/recovery-plan-requests/mine") {
      const requestedPage = Number(url.searchParams.get("pageNumber")) || 1;
      const requestedPageSize = Number(url.searchParams.get("pageSize")) || 10;
      const statusFilter = url.searchParams.get("status") || "";
      const filtered = statusFilter ? mineItems.filter((item) => item.status === statusFilter) : mineItems;
      const start = (requestedPage - 1) * requestedPageSize;
      return route.fulfill(ok({
        items: filtered.slice(start, start + requestedPageSize),
        pageNumber: requestedPage,
        pageSize: requestedPageSize,
        totalCount: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / requestedPageSize)),
      }));
    }

    const requestMatch = path.match(/^\/api\/doctor\/recovery-plan-requests\/([^/]+)(\/.*)?$/);
    if (requestMatch) {
      const id = decodeURIComponent(requestMatch[1]);
      const sub = requestMatch[2] || "";
      const current = mineItems.find((item) => item.id === id) ?? openItems.find((item) => item.id === id);

      if (!sub) {
        if (method === "GET") calls.requestDetailGets += 1;
        if (!current) return route.fulfill(fail(404, "NOT_FOUND"));
        return route.fulfill(ok(current));
      }
      if (sub === "/clinical-context") {
        return route.fulfill(ok({ patientProfile: null, medications: [], labSessions: [], chronicDiseases: [] }));
      }
      if (sub === "/accept" && method === "POST") {
        if (options.acceptError) {
          return route.fulfill(fail(options.acceptError.status, options.acceptError.code, options.acceptError.message));
        }
        openItems = openItems.filter((item) => item.id !== id);
        const accepted = { ...(current ?? myRequest({ id })), status: "assigned" };
        mineItems = [accepted, ...mineItems];
        return route.fulfill(ok(accepted));
      }
      if (sub === "/start-review" && method === "POST") {
        if (options.startReviewError) {
          if (options.startReviewError.code === "ASSIGNMENT_EXPIRED") {
            mineItems = mineItems.filter((item) => item.id !== id);
          }
          return route.fulfill(fail(options.startReviewError.status, options.startReviewError.code, options.startReviewError.message));
        }
        mineItems = mineItems.map((item) => (item.id === id ? { ...item, status: "inReview", reviewStartedAt: "2026-08-04T10:00:00Z" } : item));
        return route.fulfill(ok(mineItems.find((item) => item.id === id)));
      }
      if (sub === "/release" && method === "POST") {
        calls.releaseBody = route.request().postDataJSON();
        mineItems = mineItems.filter((item) => item.id !== id);
        return route.fulfill(ok(true));
      }
      if (sub === "/reject" && method === "POST") {
        calls.rejectBody = route.request().postDataJSON();
        mineItems = mineItems.map((item) => (item.id === id ? { ...item, status: "rejected", ...calls.rejectBody } : item));
        return route.fulfill(ok(mineItems.find((item) => item.id === id)));
      }
      if (sub === "/plan" && method === "POST") {
        calls.createDraftBody = route.request().postDataJSON();
        plan = {
          id: PLAN_ID,
          status: "draft",
          phases: [],
          ...calls.createDraftBody,
        };
        mineItems = mineItems.map((item) => (item.id === id ? { ...item, recoveryPlanId: PLAN_ID, recoveryPlanStatus: "draft" } : item));
        return route.fulfill(ok(plan, 201));
      }
    }

    const planMatch = path.match(/^\/api\/doctor\/recovery-plans\/([^/]+)(\/.*)?$/);
    if (planMatch) {
      const id = decodeURIComponent(planMatch[1]);
      const sub = planMatch[2] || "";
      if (id !== PLAN_ID || !plan) return route.fulfill(fail(404, "NOT_FOUND"));

      if (!sub && method === "GET") {
        return route.fulfill(ok({ plan, requestId: REQUEST_ID, diseaseGroup: "respiratory", doctorId: DOCTOR_ID, clinicalSnapshot: null }));
      }
      if (!sub && method === "PUT") {
        plan = { ...plan, ...route.request().postDataJSON() };
        return route.fulfill(ok(plan));
      }
      if (sub === "/phases" && method === "POST") {
        const body = route.request().postDataJSON();
        const phase = { id: `phase-${plan.phases.length + 1}`, nutrientTargets: [], ...body };
        plan = { ...plan, phases: [...plan.phases, phase] };
        return route.fulfill(ok(phase, 201));
      }
      const nutrientMatch = sub.match(/^\/phases\/([^/]+)\/nutrients$/);
      if (nutrientMatch && method === "POST") {
        const [, phaseId] = nutrientMatch;
        const body = route.request().postDataJSON();
        const nutrient = { id: `nutrient-${phaseId}-${Date.now()}`, foodSources: [], ...body };
        plan = {
          ...plan,
          phases: plan.phases.map((item) => (item.id === phaseId ? { ...item, nutrientTargets: [...item.nutrientTargets, nutrient] } : item)),
        };
        return route.fulfill(ok(nutrient, 201));
      }
      const foodMatch = sub.match(/^\/phases\/([^/]+)\/nutrients\/([^/]+)\/foods$/);
      if (foodMatch && method === "POST") {
        const [, phaseId, nutrientId] = foodMatch;
        const body = route.request().postDataJSON();
        const food = { id: `food-${nutrientId}-${Date.now()}`, ...body };
        plan = {
          ...plan,
          phases: plan.phases.map((phaseItem) => (phaseItem.id === phaseId ? {
            ...phaseItem,
            nutrientTargets: phaseItem.nutrientTargets.map((nutrientItem) => (nutrientItem.id === nutrientId
              ? { ...nutrientItem, foodSources: [...nutrientItem.foodSources, food] }
              : nutrientItem)),
          } : phaseItem)),
        };
        return route.fulfill(ok(food, 201));
      }
      if (sub === "/publish" && method === "POST") {
        plan = { ...plan, status: "readyToStart" };
        mineItems = mineItems.map((item) => (item.recoveryPlanId === PLAN_ID ? { ...item, status: "published", recoveryPlanStatus: "readyToStart" } : item));
        return route.fulfill(ok(plan));
      }
    }

    return route.fulfill(ok([]));
  });

  return calls;
}

test.describe("doctor recovery plan workflow", () => {
  test("doctor accepts a request from the open queue", async ({ page }) => {
    await prepareDoctorPage(page, { openItems: [openRequest()] });
    await page.goto("/app/staff/recovery-plans/queue", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Yêu cầu Kế hoạch phục hồi" })).toBeVisible();
    await expect(page.getByRole("article").getByText("Hô hấp")).toBeVisible();

    await page.getByRole("button", { name: "Nhận yêu cầu" }).click();
    await expect(page.getByText("Không có yêu cầu đang chờ")).toBeVisible();
  });

  test("clicking a queue card opens a preview with the patient's note and can accept from there", async ({ page }) => {
    await prepareDoctorPage(page, { openItems: [openRequest()] });
    await page.goto("/app/staff/recovery-plans/queue", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /Xem chi tiết yêu cầu/ }).click();
    const dialog = page.getByRole("dialog", { name: "Hô hấp" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Ho nhiều về đêm.")).toBeVisible();

    await dialog.getByRole("button", { name: "Nhận yêu cầu" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Không có yêu cầu đang chờ")).toBeVisible();
  });

  test("the preview uses requestNote from the open queue without fetching request detail", async ({ page }) => {
    const request = openRequest();
    const calls = await prepareDoctorPage(page, { openItems: [request] });
    await page.goto("/app/staff/recovery-plans/queue", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("article").getByText(request.requestNote)).toBeVisible();

    await page.getByRole("button", { name: /Xem chi tiết yêu cầu/ }).click();
    const dialog = page.getByRole("dialog", { name: "Hô hấp" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(request.requestNote)).toBeVisible();
    await expect(dialog.getByText("Không có ghi chú.")).toHaveCount(0);
    expect(calls.requestDetailGets).toBe(0);
  });

  test("a doctor with an unresolved request is warned and blocked from accepting another", async ({ page }) => {
    await prepareDoctorPage(page, {
      openItems: [openRequest()],
      mineItems: [myRequest({ id: "33333333-3333-4333-8333-333333333333", status: "assigned" })],
    });
    await page.goto("/app/staff/recovery-plans/queue", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Bạn đang có yêu cầu chưa hoàn tất")).toBeVisible();
    await expect(page.getByRole("link", { name: "Xem yêu cầu của tôi" })).toHaveAttribute("href", "/app/staff/recovery-plans/mine");

    await page.getByRole("button", { name: "Nhận yêu cầu" }).click();
    await expect(page.locator(".toast-region").getByText("Bạn đang có yêu cầu chưa hoàn tất")).toBeVisible();
    // Still in the queue - the accept call never went through.
    await expect(page.getByRole("article").getByText("Hô hấp")).toBeVisible();
  });

  test("accepting an already-claimed request removes it from the queue with an error", async ({ page }) => {
    await prepareDoctorPage(page, {
      openItems: [openRequest()],
      acceptError: { status: 409, code: "RECOVERY_PLAN_REQUEST_ALREADY_CLAIMED", message: "Yêu cầu này đã được bác sĩ khác nhận." },
    });
    await page.goto("/app/staff/recovery-plans/queue", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Nhận yêu cầu" }).click();

    await expect(page.getByText("Không thể nhận yêu cầu")).toBeVisible();
    await expect(page.getByText("Không có yêu cầu đang chờ")).toBeVisible();
  });

  test("starting review after the assignment expired reloads the request out of view", async ({ page }) => {
    await prepareDoctorPage(page, {
      mineItems: [myRequest({ status: "assigned" })],
      startReviewError: { status: 409, code: "ASSIGNMENT_EXPIRED", message: "Thời hạn xử lý đã hết." },
    });
    await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Bắt đầu xem xét" })).toBeVisible();

    await page.getByRole("button", { name: "Bắt đầu xem xét" }).click();
    await expect(page.getByText("Không thể bắt đầu xem xét")).toBeVisible();
    await expect(page.getByText("Không tìm thấy yêu cầu này")).toBeVisible();
  });

  test("releasing a request navigates back to \"Yêu cầu của tôi\"", async ({ page }) => {
    const calls = await prepareDoctorPage(page, { mineItems: [myRequest({ status: "assigned" })] });
    await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Trả lại hàng đợi", exact: false }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Trả lại hàng đợi" }).click();

    await expect(page).toHaveURL(/\/app\/staff\/recovery-plans\/mine$/);
    expect(calls.releaseBody).toEqual({});
  });

  test("rejecting a request requires both a reason code and a description", async ({ page }) => {
    const calls = await prepareDoctorPage(page, { mineItems: [myRequest({ status: "assigned" })] });
    await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Từ chối yêu cầu", exact: false }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Từ chối yêu cầu" }).click();
    await expect(dialog.getByText("Vui lòng chọn mã lý do.")).toBeVisible();
    await expect(dialog.getByText("Mô tả lý do là bắt buộc.")).toBeVisible();

    await dialog.getByLabel("Mã lý do").selectOption("NOT_ELIGIBLE");
    await dialog.getByLabel("Mô tả chi tiết").fill("Bệnh nhân không phù hợp phác đồ hiện có.");
    await dialog.getByRole("button", { name: "Từ chối yêu cầu" }).click();

    await expect(page.getByText("Đã từ chối", { exact: true }).first()).toBeVisible();
    expect(calls.rejectBody).toEqual({
      rejectionReasonCode: "NOT_ELIGIBLE",
      rejectionReason: "Bệnh nhân không phù hợp phác đồ hiện có.",
    });

    // The reason code shown back to the doctor must be the Vietnamese
    // label, not the raw backend enum value.
    await expect(page.getByText("Không đủ điều kiện tạo kế hoạch", { exact: true })).toBeVisible();
    await expect(page.getByText("NOT_ELIGIBLE", { exact: true })).toHaveCount(0);
  });

  test("in-review requests no longer show the more information action", async ({ page }) => {
    await prepareDoctorPage(page, { mineItems: [myRequest({ status: "inReview", reviewStartedAt: "2026-08-04T10:00:00Z" })] });
    await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Đang xem xét", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Yêu cầu bổ sung thông tin" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Tạo kế hoạch", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trả lại hàng đợi", exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Từ chối yêu cầu", exact: false })).toBeVisible();
  });

  test("legacy more-information requests render without the old doctor request action", async ({ page }) => {
    await prepareDoctorPage(page, { mineItems: [myRequest({ status: "needMoreInformation" })] });
    await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Luồng bổ sung thông tin đã ngừng sử dụng")).toBeVisible();
    await expect(page.getByRole("button", { name: "Yêu cầu bổ sung thông tin" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Trả lại hàng đợi", exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Từ chối yêu cầu", exact: false })).toBeVisible();
  });

  test("my requests are sorted newest first across backend pages", async ({ page }) => {
    const olderRequests = Array.from({ length: 10 }, (_, index) => myRequest({
      id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, "0")}`,
      diseaseGroup: "musculoskeletal",
      requestedAt: `2026-08-${String(index + 1).padStart(2, "0")}T08:00:00Z`,
    }));
    const newestRequest = myRequest({
      id: "11111111-1111-4111-8111-999999999999",
      diseaseGroup: "infectiousDisease",
      requestedAt: "2026-08-18T10:00:00Z",
    });
    await prepareDoctorPage(page, { mineItems: [...olderRequests, newestRequest] });
    await page.goto("/app/staff/recovery-plans/mine", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".doctor-mine-card").first().getByText("Bệnh truyền nhiễm")).toBeVisible();
    await expect(page.getByText("Trang 1/2")).toBeVisible();
  });

  test("doctor reviews a request, drafts a plan, and publishes it", async ({ page }) => {
    await prepareDoctorPage(page, { mineItems: [myRequest({ status: "assigned" })] });
    await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Bắt đầu xem xét" }).click();
    await expect(page.getByText("Đang xem xét", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Tạo kế hoạch", exact: true }).click();
    const planDialog = page.getByRole("dialog");
    await planDialog.getByLabel("Tên kế hoạch").fill("Phục hồi hô hấp 7 ngày");
    await planDialog.getByLabel("Tóm tắt").fill("Tăng dần vận động, theo dõi nhịp thở.");
    await planDialog.getByLabel("Số ngày thực hiện").fill("7");
    await planDialog.getByLabel("Hướng dẫn tái khám").fill("Tái khám nếu khó thở tăng.");
    await planDialog.getByRole("button", { name: "Tạo kế hoạch" }).click();

    await expect(page).toHaveURL(new RegExp(`/app/staff/recovery-plans/${PLAN_ID}$`));
    await expect(page.getByRole("heading", { name: "Phục hồi hô hấp 7 ngày" })).toBeVisible();

    await page.getByRole("button", { name: "Thêm giai đoạn" }).first().click();
    const phaseDialog = page.getByRole("dialog");
    await phaseDialog.getByLabel("Tên giai đoạn").fill("Giai đoạn 1");
    await phaseDialog.getByLabel("Ngày bắt đầu").fill("1");
    await phaseDialog.getByLabel("Ngày kết thúc").fill("7");
    await phaseDialog.getByLabel("Tổng giờ ngủ nghỉ / ngày").fill("10");
    await phaseDialog.getByRole("button", { name: "Thêm giai đoạn" }).click();
    await expect(page.getByText("Giai đoạn 1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Thêm dưỡng chất" }).click();
    const nutrientDialog = page.getByRole("dialog");
    await nutrientDialog.getByLabel("Tên dưỡng chất").fill("Protein");
    await nutrientDialog.getByLabel("Định lượng / ngày").fill("70");
    await nutrientDialog.getByLabel("Đơn vị").fill("g");
    await nutrientDialog.getByRole("button", { name: "Thêm dưỡng chất" }).click();
    await expect(page.getByText("Protein", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Thêm thực phẩm" }).click();
    const foodDialog = page.getByRole("dialog");
    await foodDialog.getByLabel("Tên thực phẩm").fill("Trứng gà");
    await foodDialog.getByRole("button", { name: "Thêm thực phẩm" }).click();
    await expect(page.getByText("Trứng gà", { exact: true })).toBeVisible();

    const publishButton = page.getByRole("button", { name: "Xuất bản kế hoạch" });
    await expect(publishButton).toBeEnabled();
    await publishButton.click();

    await expect(page).toHaveURL(new RegExp(`/app/staff/recovery-plan-requests/${REQUEST_ID}$`));
    await expect(page.getByText("Đã xuất bản thành công")).toBeVisible();
    await expect(page.getByText("Sẵn sàng bắt đầu", { exact: true })).toBeVisible();
  });
});
