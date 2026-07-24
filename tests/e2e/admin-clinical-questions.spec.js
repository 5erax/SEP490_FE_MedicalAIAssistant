import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const CHAPTER = {
  id: "chapter-circulatory",
  chapterCode: "IX",
  chapterName: "Bệnh hệ tuần hoàn",
  keywordWeights: {},
};

async function mockClinicalQuestionAdmin(page, initialRecords) {
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
    lastChapterId: "",
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
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [CHAPTER],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
          },
        }),
      });
    }

    if (pathname === "/api/clinical-questions" && method === "GET") {
      state.lastSearch = url.searchParams.get("search") ?? "";
      state.lastChapterId = url.searchParams.get("chapterId") ?? "";
      const normalizedSearch = state.lastSearch.trim().toLowerCase();
      const items = state.records.filter((record) => {
        const matchesSearch = !normalizedSearch || [
          record.questionVi,
          record.englishPrefix,
        ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
        const matchesChapter = !state.lastChapterId || record.chapterId === state.lastChapterId;
        return matchesSearch && matchesChapter;
      });

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

    if (pathname === "/api/clinical-questions" && method === "POST") {
      state.createdPayload = request.postDataJSON();
      state.records = [{
        id: "clinical-question-created",
        chapterCode: CHAPTER.chapterCode,
        ...state.createdPayload,
      }];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã tạo câu hỏi.",
          data: state.records[0],
        }),
      });
    }

    if (pathname.startsWith("/api/clinical-questions/") && method === "PUT") {
      state.updatedPayload = request.postDataJSON();
      const id = pathname.split("/").at(-1);
      state.records = state.records.map((record) => (
        record.id === id ? { ...record, ...state.updatedPayload } : record
      ));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã cập nhật câu hỏi.",
          data: state.records.find((record) => record.id === id),
        }),
      });
    }

    if (pathname.startsWith("/api/clinical-questions/") && method === "DELETE") {
      state.deletedId = pathname.split("/").at(-1);
      state.records = state.records.filter((record) => record.id !== state.deletedId);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã xóa câu hỏi." }),
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

test("admin creates, edits, and deletes a clinical question", async ({ page }) => {
  await preparePage(page);
  const state = await mockClinicalQuestionAdmin(page, []);

  await page.goto("/app/admin/clinical-questions", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Câu hỏi lâm sàng trong hệ thống" })).toBeVisible();
  await expect(page.getByText("Chưa có câu hỏi lâm sàng phù hợp", { exact: true })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Tạo câu hỏi", exact: true }).first();
  await createButton.click();

  const createDialog = page.getByRole("dialog");
  await expect(createDialog.getByLabel("Chương ICD (bắt buộc)")).toBeFocused();
  await createDialog.getByLabel("Chương ICD (bắt buộc)").selectOption(CHAPTER.id);
  await createDialog.getByLabel("Thứ tự (bắt buộc)").fill("2");
  await createDialog.getByLabel("Câu hỏi tiếng Việt (bắt buộc)").fill("Bạn có đau ngực khi vận động không?");
  await createDialog.getByLabel("Câu hỏi tiếng Anh (bắt buộc)").fill("Do you have chest pain during activity?");
  await createDialog.getByRole("button", { name: "Thêm đáp án" }).click();
  await createDialog.getByLabel("Tiếng Việt", { exact: true }).fill("Có");
  await createDialog.getByLabel("Tiếng Anh", { exact: true }).fill("Yes");

  const dialogAccessibility = await new AxeBuilder({ page })
    .include(".clinical-question-modal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dialogAccessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id)).toEqual([]);

  await createDialog.getByRole("button", { name: "Tạo câu hỏi", exact: true }).click();

  await expect(page.getByText("Đã tạo câu hỏi.", { exact: true })).toBeVisible();
  await expect(page.getByText("Bạn có đau ngực khi vận động không?", { exact: true })).toBeVisible();
  await expect(createDialog).toHaveCount(0);
  await expect(createButton).toBeFocused();
  expect(state.createdPayload).toEqual({
    chapterId: CHAPTER.id,
    questionVi: "Bạn có đau ngực khi vận động không?",
    englishPrefix: "Do you have chest pain during activity?",
    sortOrder: 2,
    answers: { Có: "Yes" },
  });

  const accessibility = await new AxeBuilder({ page })
    .include(".clinical-catalog-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);
  expect(seriousViolations).toEqual([]);

  await page.getByRole("button", {
    name: "Sửa câu hỏi Bạn có đau ngực khi vận động không?",
  }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Câu hỏi tiếng Việt (bắt buộc)").fill("Bạn có đau ngực kéo dài không?");
  await editDialog.getByRole("button", { name: "Lưu cập nhật" }).click();

  await expect(page.getByText("Đã cập nhật câu hỏi.", { exact: true })).toBeVisible();
  await expect(page.getByText("Bạn có đau ngực kéo dài không?", { exact: true })).toBeVisible();
  expect(state.updatedPayload).toMatchObject({
    chapterId: CHAPTER.id,
    questionVi: "Bạn có đau ngực kéo dài không?",
    answers: { Có: "Yes" },
  });

  const deleteButton = page.getByRole("button", {
    name: "Xóa câu hỏi Bạn có đau ngực kéo dài không?",
  });
  await deleteButton.click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog.getByRole("button", { name: "Xóa câu hỏi" })).toBeFocused();
  await deleteDialog.getByRole("button", { name: "Xóa câu hỏi" }).click();

  await expect(page.getByText("Đã xóa câu hỏi.", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có câu hỏi lâm sàng phù hợp", { exact: true })).toBeVisible();
  await expect(createButton).toBeFocused();
  expect(state.deletedId).toBe("clinical-question-created");
});

test("clinical question filters remain usable without mobile overflow", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 800 });
  const state = await mockClinicalQuestionAdmin(page, [{
    id: "clinical-question-responsive",
    chapterId: CHAPTER.id,
    chapterCode: CHAPTER.chapterCode,
    questionVi: "Bạn có cảm thấy đau ngực, khó thở hoặc hồi hộp kéo dài khi vận động nhẹ không?",
    englishPrefix: "Do you experience persistent chest pain, shortness of breath, or palpitations during light activity?",
    sortOrder: 4,
    answers: { Có: "Yes", Không: "No" },
    createdAt: "2026-07-24T08:30:00Z",
  }]);

  await page.goto("/app/admin/clinical-questions", { waitUntil: "domcontentloaded" });

  const searchInput = page.getByLabel("Tìm câu hỏi");
  await expect(searchInput).toBeVisible();
  await searchInput.fill("không tồn tại");
  await page.getByRole("button", { name: "Áp dụng" }).click();

  await expect(page.getByText("Chưa có câu hỏi lâm sàng phù hợp", { exact: true })).toBeVisible();
  expect(state.lastSearch).toBe("không tồn tại");
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);

  const clearButton = page.getByRole("button", { name: "Xóa bộ lọc" });
  expect((await clearButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await clearButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(
    "Bạn có cảm thấy đau ngực, khó thở hoặc hồi hộp kéo dài khi vận động nhẹ không?",
    { exact: true },
  )).toBeVisible();

  await page.emulateMedia({ forcedColors: "active" });
  const editButton = page.getByRole("button", {
    name: "Sửa câu hỏi Bạn có cảm thấy đau ngực, khó thở hoặc hồi hộp kéo dài khi vận động nhẹ không?",
  });
  await editButton.focus();
  await expect(editButton).toBeFocused();
  await expect(editButton).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
});
