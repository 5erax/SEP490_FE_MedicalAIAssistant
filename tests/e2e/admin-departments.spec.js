import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

async function mockDepartmentAdmin(page, initialRecords) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  const state = {
    records: [...initialRecords],
    createdPayload: null,
    updatedPayload: null,
    deletedId: null,
    lastSearch: "",
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { name: "Quản trị MediMate", roles: ["Admin"] },
        }),
      });
    }

    if (pathname === "/api/medical-departments" && method === "GET") {
      const isPagedRequest = url.searchParams.has("PageNumber");
      if (!isPagedRequest) {
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: state.records }),
        });
      }

      state.lastSearch = url.searchParams.get("search") ?? "";
      const normalizedSearch = state.lastSearch.trim().toLowerCase();
      const items = normalizedSearch
        ? state.records.filter((record) => [
          record.departmentName,
          record.description,
          record.chapterCode,
          record.id,
        ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch)))
        : state.records;

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items,
            pageNumber: 1,
            pageSize: Number(url.searchParams.get("PageSize") ?? 10),
            totalCount: items.length,
            totalPages: 1,
          },
        }),
      });
    }

    if (pathname === "/api/medical-departments" && method === "POST") {
      state.createdPayload = request.postDataJSON();
      state.records = [{
        id: "department-created",
        ...state.createdPayload,
      }];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã tạo chuyên khoa.",
          data: state.records[0],
        }),
      });
    }

    if (pathname.startsWith("/api/medical-departments/") && method === "PUT") {
      state.updatedPayload = request.postDataJSON();
      const id = pathname.split("/").at(-1);
      state.records = state.records.map((record) => (
        record.id === id ? { ...record, ...state.updatedPayload } : record
      ));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã cập nhật chuyên khoa.",
          data: state.records.find((record) => record.id === id),
        }),
      });
    }

    if (pathname.startsWith("/api/medical-departments/") && method === "DELETE") {
      state.deletedId = pathname.split("/").at(-1);
      state.records = state.records.filter((record) => record.id !== state.deletedId);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã xóa chuyên khoa." }),
      });
    }

    const pagedPaths = [
      "/api/users",
      "/api/doctors",
      "/api/ai-configs",
      "/api/medical-facilities",
      "/api/patient-profiles",
      "/api/icd-chapters",
    ];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  return state;
}

test("admin creates, edits, and deletes a medical department", async ({ page }) => {
  await preparePage(page);
  const state = await mockDepartmentAdmin(page, []);

  await page.goto("/app/admin/departments", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Chuyên khoa trong hệ thống" })).toBeVisible();
  await expect(page.getByText("Chưa có chuyên khoa phù hợp", { exact: true })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Tạo chuyên khoa", exact: true }).first();
  await createButton.click();

  const createDialog = page.getByRole("dialog");
  await expect(createDialog.getByLabel("Tên chuyên khoa (bắt buộc)")).toBeFocused();
  await createDialog.getByLabel("Tên chuyên khoa (bắt buộc)").fill("Tim mạch");
  await createDialog.getByLabel("Mô tả").fill("Tiếp nhận các vấn đề liên quan đến tim và hệ tuần hoàn.");
  await createDialog.getByLabel("Mã chương ICD").fill("IX");
  await createDialog.getByRole("button", { name: "Tạo chuyên khoa" }).click();

  await expect(page.getByText("Đã tạo chuyên khoa.", { exact: true })).toBeVisible();
  await expect(page.getByText("Tim mạch", { exact: true })).toBeVisible();
  await expect(createDialog).toHaveCount(0);
  await expect(createButton).toBeFocused();
  expect(state.createdPayload).toEqual({
    departmentName: "Tim mạch",
    description: "Tiếp nhận các vấn đề liên quan đến tim và hệ tuần hoàn.",
    chapterCode: "IX",
  });

  const accessibility = await new AxeBuilder({ page })
    .include(".department-clinical-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);
  expect(seriousViolations).toEqual([]);

  await page.getByRole("button", { name: "Sửa chuyên khoa Tim mạch" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Tên chuyên khoa (bắt buộc)").fill("Tim mạch can thiệp");
  await editDialog.getByRole("button", { name: "Lưu cập nhật" }).click();

  await expect(page.getByText("Đã cập nhật chuyên khoa.", { exact: true })).toBeVisible();
  await expect(page.getByText("Tim mạch can thiệp", { exact: true })).toBeVisible();
  expect(state.updatedPayload).toMatchObject({
    departmentName: "Tim mạch can thiệp",
    chapterCode: "IX",
  });

  await page.getByRole("button", { name: "Xóa chuyên khoa Tim mạch can thiệp" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa chuyên khoa" }).click();
  await expect(page.getByText("Chưa có chuyên khoa phù hợp", { exact: true })).toBeVisible();
  expect(state.deletedId).toBe("department-created");
});

test("department filters remain usable without mobile overflow", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
  const state = await mockDepartmentAdmin(page, [{
    id: "department-with-a-long-system-identifier-for-responsive-testing",
    departmentName: "Khoa Nội tổng quát và Chăm sóc sức khỏe liên chuyên khoa",
    description: "Theo dõi các vấn đề sức khỏe thường gặp và phối hợp với chuyên khoa phù hợp.",
    chapterCode: "XVIII",
  }]);

  await page.goto("/app/admin/departments", { waitUntil: "domcontentloaded" });

  const searchInput = page.getByLabel("Tìm chuyên khoa");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("không tồn tại");
  await page.getByRole("button", { name: "Áp dụng" }).click();

  await expect(page.getByText("Chưa có chuyên khoa phù hợp", { exact: true })).toBeVisible();
  expect(state.lastSearch).toBe("không tồn tại");
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  const clearButton = page.getByRole("button", { name: "Xóa bộ lọc" });
  expect((await clearButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await clearButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(
    "Khoa Nội tổng quát và Chăm sóc sức khỏe liên chuyên khoa",
    { exact: true },
  )).toBeVisible();

  await page.emulateMedia({ forcedColors: "active" });
  const editButton = page.getByRole("button", {
    name: "Sửa chuyên khoa Khoa Nội tổng quát và Chăm sóc sức khỏe liên chuyên khoa",
  });
  await editButton.focus();
  await expect(editButton).toBeFocused();
  await expect(editButton).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});
