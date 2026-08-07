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
    createFailure: null,
    updateFailure: null,
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
      if (state.createFailure) {
        return route.fulfill({
          status: state.createFailure.status ?? 400,
          contentType: "application/json",
          body: JSON.stringify({ success: false, ...state.createFailure }),
        });
      }
      state.records = [{
        id: "department-created",
        ...state.createdPayload,
      }];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Tạo khoa thành công",
          data: state.records[0],
        }),
      });
    }

    if (pathname.startsWith("/api/medical-departments/") && method === "PUT") {
      state.updatedPayload = request.postDataJSON();
      if (state.updateFailure) {
        return route.fulfill({
          status: state.updateFailure.status ?? 400,
          contentType: "application/json",
          body: JSON.stringify({ success: false, ...state.updateFailure }),
        });
      }
      const id = pathname.split("/").at(-1);
      state.records = state.records.map((record) => (
        record.id === id ? { ...record, ...state.updatedPayload } : record
      ));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Cập nhật khoa thành công",
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

  await expect(page.getByText("Tạo khoa thành công", { exact: true })).toBeVisible();
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

  await expect(page.getByText("Cập nhật khoa thành công", { exact: true })).toBeVisible();
  await expect(page.getByText("Tim mạch can thiệp", { exact: true })).toBeVisible();
  expect(state.updatedPayload).toEqual({
    departmentName: "Tim mạch can thiệp",
  });

  await page.getByRole("button", { name: "Xóa chuyên khoa Tim mạch can thiệp" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa chuyên khoa" }).click();
  await expect(page.getByText("Chưa có chuyên khoa phù hợp", { exact: true })).toBeVisible();
  expect(state.deletedId).toBe("department-created");
});

test("medical department create uses the standardized validation and API messages", async ({ page }) => {
  await preparePage(page);
  const state = await mockDepartmentAdmin(page, []);

  await page.goto("/app/admin/departments", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Tạo chuyên khoa", exact: true }).first().click();

  const dialog = page.getByRole("dialog");
  const nameField = dialog.getByLabel("Tên chuyên khoa (bắt buộc)");
  const chapterField = dialog.getByLabel("Mã chương ICD");

  await dialog.getByRole("button", { name: "Tạo chuyên khoa" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("DepartmentName là bắt buộc");
  await expect(nameField).toHaveAttribute("aria-invalid", "true");
  expect(state.createdPayload).toBeNull();

  await nameField.fill("Tim mạch");
  await chapterField.fill("UNKNOWN");
  state.createFailure = { message: "Không tìm thấy ICD chapter" };
  await dialog.getByRole("button", { name: "Tạo chuyên khoa" }).click();

  await expect(dialog.getByRole("alert")).toHaveText("Không tìm thấy ICD chapter");
  await expect(chapterField).toHaveAttribute("aria-invalid", "true");

  state.createFailure = null;
  await chapterField.fill("IX");
  await dialog.getByRole("button", { name: "Tạo chuyên khoa" }).click();

  await expect(page.getByText("Tạo khoa thành công", { exact: true })).toBeVisible();
  expect(state.createdPayload).toEqual({
    departmentName: "Tim mạch",
    description: "",
    chapterCode: "IX",
  });
});

test("medical department update is partial and rejects an empty name", async ({ page }) => {
  await preparePage(page);
  const state = await mockDepartmentAdmin(page, [{
    id: "department-existing",
    departmentName: "Tim mạch",
    description: "Theo dõi bệnh tim mạch.",
    chapterCode: "IX",
  }]);

  await page.goto("/app/admin/departments", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sửa chuyên khoa Tim mạch" }).click();

  const dialog = page.getByRole("dialog");
  const nameField = dialog.getByLabel("Tên chuyên khoa (bắt buộc)");
  const chapterField = dialog.getByLabel("Mã chương ICD");
  const submitButton = dialog.getByRole("button", { name: "Lưu cập nhật" });

  await submitButton.click();
  await expect(dialog.getByRole("alert")).toHaveText("Không có trường nào để cập nhật");
  expect(state.updatedPayload).toBeNull();

  await nameField.fill("   ");
  await submitButton.click();
  await expect(dialog.getByRole("alert")).toHaveText("DepartmentName không được để trống");
  await expect(nameField).toHaveAttribute("aria-invalid", "true");
  expect(state.updatedPayload).toBeNull();

  await nameField.fill("Tim mạch");
  await chapterField.fill("UNKNOWN");
  state.updateFailure = { message: "Không tìm thấy ICD chapter" };
  await submitButton.click();
  await expect(dialog.getByRole("alert")).toHaveText("Không tìm thấy ICD chapter");
  await expect(chapterField).toHaveAttribute("aria-invalid", "true");

  state.updateFailure = null;
  await chapterField.fill("IX");
  await dialog.getByLabel("Mô tả").fill("Theo dõi và điều trị bệnh tim mạch.");
  await submitButton.click();

  await expect(page.getByText("Cập nhật khoa thành công", { exact: true })).toBeVisible();
  expect(state.updatedPayload).toEqual({
    description: "Theo dõi và điều trị bệnh tim mạch.",
  });
});

test("medical department displays the standardized not-found update message", async ({ page }) => {
  await preparePage(page);
  const state = await mockDepartmentAdmin(page, [{
    id: "department-missing",
    departmentName: "Khoa cũ",
    description: "",
    chapterCode: "",
  }]);
  state.updateFailure = { status: 404, message: "Không tìm thấy khoa" };

  await page.goto("/app/admin/departments", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sửa chuyên khoa Khoa cũ" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên chuyên khoa (bắt buộc)").fill("Khoa mới");
  await dialog.getByRole("button", { name: "Lưu cập nhật" }).click();

  await expect(dialog.getByRole("alert")).toHaveText("Không tìm thấy khoa");
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
