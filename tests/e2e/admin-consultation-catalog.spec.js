import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const department = { id: "department-1", departmentName: "Tim mạch" };
const facility = { id: "facility-1", facilityName: "Bệnh viện MediMate" };

async function mockConsultationCatalog(page) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  const state = {
    questions: [{
      id: "question-1",
      departmentId: department.id,
      category: "diagnosis",
      questionText: "Bạn có đau ngực khi vận động không?",
      sortOrder: 1,
      isActive: true,
      createdAt: "2026-08-09T08:00:00Z",
    }],
    checklist: [{
      id: "checklist-1",
      content: "Chuẩn bị danh sách thuốc đang sử dụng",
      departmentId: department.id,
      facilityId: facility.id,
      isMandatory: true,
      createdAt: "2026-08-09T08:00:00Z",
    }],
    questionCreates: [],
    questionUpdates: [],
    questionDeletes: [],
    checklistCreates: [],
    checklistUpdates: [],
    checklistDeletes: [],
  };

  function paged(items, url) {
    return {
      success: true,
      data: {
        items,
        pageNumber: Number(url.searchParams.get("PageNumber") ?? 1),
        pageSize: Number(url.searchParams.get("PageSize") ?? 10),
        totalCount: items.length,
        totalPages: 1,
      },
    };
  }

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }) });
    }

    if (pathname === "/api/medical-departments") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(paged([department], url)) });
    }

    if (pathname === "/api/medical-facilities") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(paged([facility], url)) });
    }

    if (pathname === "/api/department-consultation-questions" && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(paged(state.questions, url)) });
    }

    if (pathname === "/api/department-consultation-questions" && method === "POST") {
      const payload = request.postDataJSON();
      state.questionCreates.push(payload);
      state.questions.push({ id: "question-created", ...payload, createdAt: "2026-08-09T09:00:00Z" });
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Tạo câu hỏi tư vấn thành công", data: state.questions.at(-1) }) });
    }

    if (pathname.startsWith("/api/department-consultation-questions/") && method === "GET") {
      const id = pathname.split("/").at(-1);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: state.questions.find((item) => item.id === id) }) });
    }

    if (pathname.startsWith("/api/department-consultation-questions/") && method === "PUT") {
      const id = pathname.split("/").at(-1);
      const payload = request.postDataJSON();
      state.questionUpdates.push({ id, payload });
      state.questions = state.questions.map((item) => item.id === id ? { ...item, ...payload } : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Cập nhật câu hỏi tư vấn thành công", data: state.questions.find((item) => item.id === id) }) });
    }

    if (pathname.startsWith("/api/department-consultation-questions/") && method === "DELETE") {
      const id = pathname.split("/").at(-1);
      state.questionDeletes.push(id);
      state.questions = state.questions.filter((item) => item.id !== id);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Xóa câu hỏi tư vấn thành công" }) });
    }

    if (pathname === "/api/checklist-items" && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(paged(state.checklist, url)) });
    }

    if (pathname === "/api/checklist-items" && method === "POST") {
      const payload = request.postDataJSON();
      state.checklistCreates.push(payload);
      state.checklist.push({ id: "checklist-created", ...payload, createdAt: "2026-08-09T09:00:00Z" });
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Tạo checklist thành công", data: state.checklist.at(-1) }) });
    }

    if (pathname.startsWith("/api/checklist-items/") && method === "GET") {
      const id = pathname.split("/").at(-1);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: state.checklist.find((item) => item.id === id) }) });
    }

    if (pathname.startsWith("/api/checklist-items/") && method === "PUT") {
      const id = pathname.split("/").at(-1);
      const payload = request.postDataJSON();
      state.checklistUpdates.push({ id, payload });
      state.checklist = state.checklist.map((item) => item.id === id ? { ...item, ...payload } : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Cập nhật checklist thành công", data: state.checklist.find((item) => item.id === id) }) });
    }

    if (pathname.startsWith("/api/checklist-items/") && method === "DELETE") {
      const id = pathname.split("/").at(-1);
      state.checklistDeletes.push(id);
      state.checklist = state.checklist.filter((item) => item.id !== id);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Xóa checklist thành công" }) });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/patient-profiles"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });

  return state;
}

test("admin completes CRUD for consultation questions and checklist items", async ({ page }) => {
  const state = await mockConsultationCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/app/admin/consultation-checklists", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Checklist và câu hỏi theo chuyên khoa" })).toBeVisible();
  await expect(page.getByText("Bạn có đau ngực khi vận động không?", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Tạo câu hỏi", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Chuyên khoa/).selectOption(department.id);
  await dialog.getByLabel(/Nội dung câu hỏi/).fill("Bạn có khó thở khi nằm không?");
  await dialog.getByRole("button", { name: "Tạo mới" }).click();
  await expect.poll(() => state.questionCreates.length).toBe(1);
  expect(state.questionCreates[0]).toMatchObject({ departmentId: department.id, category: "diagnosis", questionText: "Bạn có khó thở khi nằm không?", sortOrder: 0, isActive: true });

  let questionRow = page.getByRole("row", { name: /Bạn có đau ngực khi vận động không/ });
  await questionRow.getByRole("button", { name: "Sửa" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nội dung câu hỏi/).fill("Bạn có đau ngực kéo dài trên 15 phút không?");
  await dialog.getByRole("button", { name: "Lưu cập nhật" }).click();
  await expect.poll(() => state.questionUpdates.length).toBe(1);
  expect(state.questionUpdates[0]).toEqual({ id: "question-1", payload: { questionText: "Bạn có đau ngực kéo dài trên 15 phút không?" } });

  questionRow = page.getByRole("row", { name: /Bạn có đau ngực kéo dài trên 15 phút không/ });
  await questionRow.getByRole("button", { name: "Xóa" }).click();
  await page.getByRole("dialog", { name: "Xóa câu hỏi tư vấn?" }).getByRole("button", { name: "Xóa" }).click();
  await expect.poll(() => state.questionDeletes).toContain("question-1");

  await page.getByRole("tab", { name: "Checklist chuẩn bị" }).click();
  await expect(page.getByText("Chuẩn bị danh sách thuốc đang sử dụng", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tạo checklist", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nội dung checklist/).fill("Mang theo kết quả xét nghiệm gần nhất");
  await dialog.getByLabel("Chuyên khoa áp dụng").selectOption(department.id);
  await dialog.getByLabel("Cơ sở y tế áp dụng").selectOption(facility.id);
  await dialog.getByLabel("Đây là mục bắt buộc phải hoàn thành").check();
  await dialog.getByRole("button", { name: "Tạo mới" }).click();
  await expect.poll(() => state.checklistCreates.length).toBe(1);
  expect(state.checklistCreates[0]).toEqual({ content: "Mang theo kết quả xét nghiệm gần nhất", departmentId: department.id, facilityId: facility.id, isMandatory: true });

  let checklistRow = page.getByRole("row", { name: /Chuẩn bị danh sách thuốc đang sử dụng/ });
  await checklistRow.getByRole("button", { name: "Sửa" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Nội dung checklist/).fill("Chuẩn bị đầy đủ danh sách thuốc đang sử dụng");
  await dialog.getByRole("button", { name: "Lưu cập nhật" }).click();
  await expect.poll(() => state.checklistUpdates.length).toBe(1);
  expect(state.checklistUpdates[0]).toEqual({ id: "checklist-1", payload: { content: "Chuẩn bị đầy đủ danh sách thuốc đang sử dụng" } });

  checklistRow = page.getByRole("row", { name: /Chuẩn bị đầy đủ danh sách thuốc đang sử dụng/ });
  await checklistRow.getByRole("button", { name: "Xóa" }).click();
  await page.getByRole("dialog", { name: "Xóa mục checklist?" }).getByRole("button", { name: "Xóa" }).click();
  await expect.poll(() => state.checklistDeletes).toContain("checklist-1");
});

test("admin consultation catalog remains accessible on mobile", async ({ page }) => {
  await mockConsultationCatalog(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/admin/consultation-checklists", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Checklist và câu hỏi theo chuyên khoa" })).toBeVisible();
  const results = await new AxeBuilder({ page }).include(".consultation-catalog").analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
