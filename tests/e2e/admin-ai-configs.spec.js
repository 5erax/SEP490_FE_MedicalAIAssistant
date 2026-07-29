import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

async function mockAIConfigAdmin(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  const state = {
    records: [],
    createdPayload: null,
    updatedPayload: null,
    statusPayload: null,
    deletedId: null,
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

    if (pathname === "/api/ai-configs" && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: state.records,
            pageNumber: 1,
            pageSize: 10,
            totalCount: state.records.length,
            totalPages: 1,
          },
        }),
      });
    }

    if (pathname === "/api/ai-configs" && method === "POST") {
      state.createdPayload = request.postDataJSON();
      state.records = [{
        id: "ai-config-created",
        ...state.createdPayload,
        createdAt: "2026-07-24T08:30:00Z",
        updatedAt: null,
      }];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã tạo cấu hình AI.",
          data: state.records[0],
        }),
      });
    }

    if (pathname === "/api/ai-configs/ai-config-created" && method === "PUT") {
      state.updatedPayload = request.postDataJSON();
      state.records = state.records.map((record) => ({
        ...record,
        ...state.updatedPayload,
        updatedAt: "2026-07-24T09:15:00Z",
      }));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã cập nhật cấu hình AI.",
          data: state.records[0],
        }),
      });
    }

    if (pathname === "/api/ai-configs/ai-config-created/status" && method === "PATCH") {
      state.statusPayload = request.postDataJSON();
      state.records = state.records.map((record) => ({
        ...record,
        isActive: state.statusPayload.isActive,
      }));
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Đã cập nhật trạng thái.",
          data: state.records[0],
        }),
      });
    }

    if (pathname === "/api/ai-configs/ai-config-created" && method === "DELETE") {
      state.deletedId = "ai-config-created";
      state.records = [];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã xóa cấu hình AI." }),
      });
    }

    const pagedPaths = [
      "/api/users",
      "/api/doctors",
      "/api/medical-facilities",
      "/api/medical-departments",
      "/api/icd-chapters",
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

test("admin manages an AI configuration without changing the API contract", async ({ page }) => {
  await preparePage(page);
  const state = await mockAIConfigAdmin(page);

  await page.goto("/app/admin/ai-configs", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Cấu hình AI trong hệ thống" })).toBeVisible();
  await expect(page.getByText("Chưa có cấu hình AI phù hợp", { exact: true })).toBeVisible();

  const createButton = page.getByRole("button", { name: "Tạo cấu hình", exact: true }).first();
  await createButton.click();
  const createDialog = page.getByRole("dialog", { name: "Tạo cấu hình AI" });
  await expect(createDialog.getByLabel("Loại tính năng (bắt buộc)")).toBeFocused();

  await createDialog.getByRole("button", { name: "Tạo cấu hình" }).click();
  await expect(createDialog.getByLabel("Loại tính năng (bắt buộc)")).toBeFocused();
  await expect(createDialog.getByLabel("Loại tính năng (bắt buộc)")).toHaveAttribute("aria-invalid", "true");
  await expect(createDialog.getByText("Chưa thể lưu cấu hình", { exact: true })).toBeVisible();

  await createDialog.getByLabel("Loại tính năng (bắt buộc)").fill("symptom-analysis-prod");
  await createDialog.getByLabel("Mô hình AI (bắt buộc)").fill("medimate-clinical-v1");
  await createDialog.getByLabel("Nhiệt độ phản hồi").fill("0.2");
  await createDialog.getByLabel("Token tối đa").fill("1200");
  await createDialog.getByLabel("Prompt hệ thống (bắt buộc)").fill(
    "Hỗ trợ làm rõ triệu chứng, nêu giới hạn y tế và khuyến nghị gặp người có chuyên môn khi cần.",
  );
  await createDialog.getByLabel("Trạng thái sau khi lưu").selectOption("true");
  await expect(createDialog.getByText("Chưa thể lưu cấu hình", { exact: true })).toHaveCount(0);

  const dialogAccessibility = await new AxeBuilder({ page })
    .include(".ai-config-modal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(dialogAccessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    }))).toEqual([]);

  await createDialog.getByRole("button", { name: "Tạo cấu hình" }).click();

  expect(state.createdPayload).toEqual({
    taskType: "symptom-analysis-prod",
    systemPrompt: "Hỗ trợ làm rõ triệu chứng, nêu giới hạn y tế và khuyến nghị gặp người có chuyên môn khi cần.",
    model: "medimate-clinical-v1",
    temperature: 0.2,
    maxTokens: 1200,
    isActive: true,
  });
  await expect(createDialog).toHaveCount(0);
  const configList = page.getByRole("list", { name: "Danh sách cấu hình AI" });
  await expect(configList.getByText("symptom-analysis-prod", { exact: true })).toBeVisible();
  await expect(createButton).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include(".ai-config-clinical-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    }))).toEqual([]);

  const detailButton = page.getByRole("button", {
    name: "Xem chi tiết cấu hình symptom-analysis-prod",
  });
  await detailButton.click();
  const detailDialog = page.getByRole("dialog", { name: "symptom-analysis-prod" });
  await expect(detailDialog.getByText("Prompt hệ thống", { exact: true })).toBeVisible();
  await detailDialog.getByRole("button", { name: "Đóng chi tiết" }).click();
  await expect(detailButton).toBeFocused();

  await configList.getByRole("button", { name: "Thao tác khác" }).click();
  await page.getByRole("button", { name: "Sửa cấu hình symptom-analysis-prod" }).click();
  const editDialog = page.getByRole("dialog", { name: "Cập nhật cấu hình AI" });
  await expect(editDialog.getByLabel("Loại tính năng (bắt buộc)")).toBeFocused();
  await editDialog.getByLabel("Mô hình AI (bắt buộc)").fill("medimate-clinical-v2");
  await editDialog.getByRole("button", { name: "Lưu cập nhật" }).click();
  expect(state.updatedPayload).toMatchObject({
    taskType: "symptom-analysis-prod",
    model: "medimate-clinical-v2",
    isActive: true,
  });
  await expect(configList.getByText("medimate-clinical-v2", { exact: true })).toBeVisible();

  await configList.getByRole("button", { name: "Thao tác khác" }).click();
  await page.getByRole("button", { name: "Tắt cấu hình symptom-analysis-prod" }).click();
  expect(state.statusPayload).toEqual({ isActive: false });
  await expect(configList.getByText("Đang tắt", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  await configList.getByRole("button", { name: "Thao tác khác" }).click();
  await page.emulateMedia({ forcedColors: "active" });
  const deleteButton = page.getByRole("button", { name: "Xóa cấu hình symptom-analysis-prod" });
  await deleteButton.focus();
  await expect(deleteButton).toBeFocused();
  expect((await deleteButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.emulateMedia({ forcedColors: "none" });

  await deleteButton.click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa AI config" }).click();
  await expect(page.getByText("Chưa có cấu hình AI phù hợp", { exact: true })).toBeVisible();
  expect(state.deletedId).toBe("ai-config-created");
});

test("admin retries a failed AI config list and receives an empty state", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let aiConfigRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/ai-configs") {
      aiConfigRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (aiConfigRequestCount <= 2) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Sensitive AI platform detail" }),
        });
      }

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/ai-configs", { waitUntil: "domcontentloaded" });

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách cấu hình AI" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách cấu hình.");
  await expect(errorState).not.toContainText("Sensitive AI platform detail");

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Chưa có cấu hình AI phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Trang 1 / 1 · 0 / 0 cấu hình", { exact: true })).toBeVisible();
  expect(aiConfigRequestCount).toBe(3);
});

test("AI config cards keep long prompt and model content readable", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }
    if (pathname === "/api/ai-configs") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [{
              id: "config-1",
              configName: "ConsultationDoctorQuestionsWithANameThatMustWrap",
              taskType: "ConsultationDoctorQuestions",
              systemPrompt: "Nhiệm vụ của bạn là tạo các câu hỏi lâm sàng rõ ràng, an toàn và có đủ ngữ cảnh cho người bệnh trước khi khám.",
              model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
              temperature: 0.2,
              maxTokens: null,
              isActive: true,
              updatedAt: "2026-07-14T21:00:00Z",
            }],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
          },
        }),
      });
    }
    const pagedPaths = ["/api/users", "/api/doctors", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });

  await page.goto("/app/admin/ai-configs", { waitUntil: "domcontentloaded" });

  const list = page.getByRole("list", { name: "Danh sách cấu hình AI" });
  await expect(list).toBeVisible();
  await expect(list.getByText("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { exact: true })).toBeVisible();
  await expect(list.getByText("Đang bật", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole("button", {
    name: "Xem chi tiết cấu hình ConsultationDoctorQuestions",
  })).toHaveCSS("min-height", "40px");
});
