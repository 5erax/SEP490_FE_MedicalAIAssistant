import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

async function mockIcdChapterAdmin(page, initialRecords) {
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

    if (pathname === "/api/icd-chapters" && method === "GET") {
      state.lastSearch = url.searchParams.get("search") ?? "";
      const normalizedSearch = state.lastSearch.trim().toLowerCase();
      const items = normalizedSearch
        ? state.records.filter((record) => [
          record.chapterCode,
          record.chapterName,
          ...Object.keys(record.keywordWeights ?? {}),
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

    if (pathname === "/api/icd-chapters" && method === "POST") {
      state.createdPayload = request.postDataJSON();
      state.records = [{
        id: "icd-created",
        ...state.createdPayload,
      }];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã tạo chương ICD.",
          data: state.records[0],
        }),
      });
    }

    if (pathname.startsWith("/api/icd-chapters/") && method === "GET") {
      const id = pathname.split("/").at(-1);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: state.records.find((record) => record.id === id),
        }),
      });
    }

    if (pathname.startsWith("/api/icd-chapters/") && method === "PUT") {
      state.updatedPayload = request.postDataJSON();
      const id = pathname.split("/").at(-1);
      state.records = state.records.map((record) => (
        record.id === id ? { ...record, ...state.updatedPayload } : record
      ));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã cập nhật chương ICD.",
          data: state.records.find((record) => record.id === id),
        }),
      });
    }

    if (pathname.startsWith("/api/icd-chapters/") && method === "DELETE") {
      state.deletedId = pathname.split("/").at(-1);
      state.records = state.records.filter((record) => record.id !== state.deletedId);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã xóa chương ICD." }),
      });
    }

    const pagedPaths = [
      "/api/users",
      "/api/doctors",
      "/api/ai-configs",
      "/api/medical-facilities",
      "/api/patient-profiles",
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

test("admin creates, edits, and deletes an ICD chapter", async ({ page }) => {
  await preparePage(page);
  const state = await mockIcdChapterAdmin(page, []);

  await page.goto("/app/admin/icd-chapters", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Chương ICD trong hệ thống" })).toBeVisible();
  await expect(page.getByText("Chưa có chương ICD phù hợp", { exact: true })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Tạo chương ICD", exact: true }).first();
  await createButton.click();

  const createDialog = page.getByRole("dialog");
  await expect(createDialog.getByLabel("Mã chương (bắt buộc)")).toBeFocused();
  await createDialog.getByRole("button", { name: "Tạo chương ICD" }).click();
  await expect(createDialog.getByLabel("Mã chương (bắt buộc)")).toBeFocused();
  await expect(createDialog.getByLabel("Mã chương (bắt buộc)")).toHaveAttribute("aria-invalid", "true");
  await expect(createDialog.getByText("Vui lòng nhập mã chương ICD.", { exact: true })).toBeVisible();
  await createDialog.getByLabel("Mã chương (bắt buộc)").fill("IX");
  await createDialog.getByLabel("Tên chương (bắt buộc)").fill("Bệnh hệ tuần hoàn");
  await createDialog.getByRole("button", { name: "Thêm từ khóa" }).click();
  let keywordRows = createDialog.locator(".icd-keyword-editor-row");
  await keywordRows.nth(0).getByRole("textbox", { name: "Từ khóa 1", exact: true }).fill("tim");
  await keywordRows.nth(0).getByLabel("Trọng số").fill("5");
  await createDialog.getByRole("button", { name: "Thêm từ khóa" }).click();
  keywordRows = createDialog.locator(".icd-keyword-editor-row");
  await keywordRows.nth(1).getByRole("textbox", { name: "Từ khóa 2", exact: true }).fill("mạch");
  await keywordRows.nth(1).getByLabel("Trọng số").fill("3");
  await expect(createDialog.getByText("JSON nâng cao", { exact: true })).toBeVisible();
  await createDialog.getByRole("button", { name: "Tạo chương ICD" }).click();

  await expect(page.getByText("Đã tạo chương ICD.", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh hệ tuần hoàn", { exact: true })).toBeVisible();
  await expect(createDialog).toHaveCount(0);
  await expect(createButton).toBeFocused();
  expect(state.createdPayload).toEqual({
    chapterCode: "IX",
    chapterName: "Bệnh hệ tuần hoàn",
    keywordWeights: { tim: 5, mạch: 3 },
  });

  const accessibility = await new AxeBuilder({ page })
    .include(".icd-clinical-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    }));
  expect(seriousViolations).toEqual([]);

  await page.getByRole("button", { name: "Thao tác khác" }).click();
  await page.getByRole("button", { name: "Sửa chương ICD IX" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Tên chương (bắt buộc)").fill("Bệnh hệ tuần hoàn cập nhật");
  await editDialog.getByRole("button", { name: "Lưu cập nhật" }).click();

  await expect(page.getByText("Đã cập nhật chương ICD.", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh hệ tuần hoàn cập nhật", { exact: true })).toBeVisible();
  expect(state.updatedPayload).toMatchObject({
    chapterCode: "IX",
    chapterName: "Bệnh hệ tuần hoàn cập nhật",
  });

  await page.getByRole("button", { name: "Thao tác khác" }).click();
  await page.getByRole("button", { name: "Xóa chương ICD IX" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa ICD Chapter" }).click();
  await expect(page.getByText("Chưa có chương ICD phù hợp", { exact: true })).toBeVisible();
  expect(state.deletedId).toBe("icd-created");
});

test("ICD filters and actions remain usable on narrow screens", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
  const state = await mockIcdChapterAdmin(page, [{
    id: "icd-chapter-with-a-long-system-identifier-for-responsive-testing",
    chapterCode: "XVIII",
    chapterName: "Các triệu chứng, dấu hiệu và phát hiện lâm sàng chưa phân loại ở nơi khác",
    keywordWeights: {
      "đau đầu kéo dài": 5,
      "mệt mỏi": 4,
      "chóng mặt": 3,
      "khó chịu": 2,
      "triệu chứng khác": 1,
    },
  }]);

  await page.goto("/app/admin/icd-chapters", { waitUntil: "domcontentloaded" });

  const filterToggle = page.locator(".icd-filter-card .admin-filter-disclosure-toggle");
  await expect(filterToggle).toHaveAttribute("aria-expanded", "false");
  await filterToggle.click();
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
  const searchInput = page.getByLabel("Tìm chương ICD");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("không tồn tại");
  await page.getByRole("button", { name: "Áp dụng" }).click();

  await expect(page.getByText("Chưa có chương ICD phù hợp", { exact: true })).toBeVisible();
  expect(state.lastSearch).toBe("không tồn tại");
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  const clearButton = page.getByRole("button", { name: "Xóa bộ lọc" });
  expect((await clearButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await clearButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(
    "Các triệu chứng, dấu hiệu và phát hiện lâm sàng chưa phân loại ở nơi khác",
    { exact: true },
  )).toBeVisible();

  await page.emulateMedia({ forcedColors: "active" });
  await page.getByRole("button", { name: "Thao tác khác" }).click();
  const editButton = page.getByRole("button", { name: "Sửa chương ICD XVIII" });
  await editButton.focus();
  await expect(editButton).toBeFocused();
  await expect(editButton).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});
